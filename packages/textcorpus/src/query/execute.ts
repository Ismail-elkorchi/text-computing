import type { Annotation } from "@ismail-elkorchi/textdoc";
import { compareNumbers, compareStrings } from "../internal/compare.js";
import { type JsonValue, stableStringify } from "../internal/json.js";
import { getCorpusState } from "../store/state.js";
import type { CorpusRecord, TextCorpus } from "../store/types.js";
import type {
	CorpusHit,
	CorpusQuery,
	CorpusQueryOptions,
	CorpusResult,
	QueryRecordMatch,
} from "./types.js";

function normalizeTerm(
	value: string,
	caseSensitive: boolean | undefined,
): string {
	return caseSensitive === true ? value : value.toLocaleLowerCase("und");
}

function valuesEqual(left: unknown, right: unknown): boolean {
	try {
		return (
			stableStringify(left as JsonValue) === stableStringify(right as JsonValue)
		);
	} catch {
		return Object.is(left, right);
	}
}

function annotationMatches(
	annotation: Annotation,
	query: Extract<CorpusQuery, { kind: "annotation" }>,
): boolean {
	if (query.layer !== undefined && annotation.layer !== query.layer)
		return false;
	if (query.type !== undefined && annotation.type !== query.type) return false;
	if (
		query.value !== undefined &&
		!valuesEqual(annotation.value, query.value)
	) {
		return false;
	}
	return true;
}

function metadataValues(
	query: Extract<CorpusQuery, { kind: "metadata" }>,
): unknown[] {
	if (query.values !== undefined) return query.values;
	if ("value" in query) return [query.value];
	return [];
}

function hitSort(left: CorpusHit, right: CorpusHit): number {
	const doc = compareStrings(left.docId, right.docId);
	if (doc !== 0) return doc;
	const leftStart = left.span?.span.start ?? Number.MAX_SAFE_INTEGER;
	const rightStart = right.span?.span.start ?? Number.MAX_SAFE_INTEGER;
	const start = compareNumbers(leftStart, rightStart);
	if (start !== 0) return start;
	return compareStrings(
		left.annotationId ?? String(left.tokenIndex ?? ""),
		right.annotationId ?? String(right.tokenIndex ?? ""),
	);
}

function matchRecord(
	record: CorpusRecord,
	query: CorpusQuery,
	path = "$",
): QueryRecordMatch {
	if (query.kind === "all") {
		return {
			matched: true,
			hits: [{ docId: record.ref.id }],
			tokens: record.tokens,
		};
	}
	if (query.kind === "document") {
		const ids = Array.isArray(query.id) ? query.id : [query.id];
		const matched = ids.includes(record.ref.id);
		return {
			matched,
			hits: matched ? [{ docId: record.ref.id }] : [],
			tokens: [],
		};
	}
	if (query.kind === "token") {
		const term = normalizeTerm(query.term, query.caseSensitive);
		const hits = record.tokens
			.filter((token) =>
				query.caseSensitive === true
					? token.text === term
					: token.normalized === term,
			)
			.map((token) => ({
				docId: record.ref.id,
				...(token.span !== undefined ? { span: token.span } : {}),
				tokenIndex: token.index,
				token: token.text,
				...(token.lemma !== undefined ? { lemma: token.lemma } : {}),
				...(token.layerId !== undefined ? { layerId: token.layerId } : {}),
				...(token.annotationId !== undefined
					? { annotationId: token.annotationId }
					: {}),
			}));
		return { matched: hits.length > 0, hits, tokens: record.tokens };
	}
	if (query.kind === "lemma") {
		const lemma = normalizeTerm(query.lemma, query.caseSensitive);
		const hits = record.tokens
			.filter((token) => {
				if (token.lemma === undefined) return false;
				return query.caseSensitive === true
					? token.lemma === lemma
					: token.lemma.toLocaleLowerCase("und") === lemma;
			})
			.map((token) => ({
				docId: record.ref.id,
				...(token.span !== undefined ? { span: token.span } : {}),
				tokenIndex: token.index,
				token: token.text,
				...(token.lemma !== undefined ? { lemma: token.lemma } : {}),
				...(token.layerId !== undefined ? { layerId: token.layerId } : {}),
				...(token.annotationId !== undefined
					? { annotationId: token.annotationId }
					: {}),
			}));
		return { matched: hits.length > 0, hits, tokens: record.tokens };
	}
	if (query.kind === "annotation") {
		const hits = record.annotations
			.filter((annotation) => annotationMatches(annotation, query))
			.flatMap((annotation) => {
				const span = annotation.spans[0];
				return [
					{
						docId: record.ref.id,
						...(span !== undefined ? { span } : {}),
						layerId: annotation.layer,
						annotationId: annotation.id,
						value: annotation.value,
					},
				];
			});
		return { matched: hits.length > 0, hits, tokens: record.tokens };
	}
	if (query.kind === "metadata") {
		const value = record.ref.metadata[query.key];
		const expected = metadataValues(query);
		const matched =
			expected.length === 0
				? value !== undefined
				: expected.some((entry) => valuesEqual(value, entry));
		return {
			matched,
			hits: matched
				? [{ docId: record.ref.id, metadataKey: query.key, value }]
				: [],
			tokens: [],
		};
	}
	if (query.kind === "partition") {
		const matched = record.partitions[query.key] === query.value;
		return {
			matched,
			hits: matched
				? [{ docId: record.ref.id, metadataKey: query.key, value: query.value }]
				: [],
			tokens: [],
		};
	}
	if (query.kind === "and") {
		const matches = query.queries.map((entry, index) =>
			matchRecord(record, entry, `${path}.queries[${index}]`),
		);
		const matched = matches.every((entry) => entry.matched);
		return {
			matched,
			hits: matched ? matches.flatMap((entry) => entry.hits).sort(hitSort) : [],
			tokens: matched ? record.tokens : [],
		};
	}
	if (query.kind === "or") {
		const matches = query.queries.map((entry, index) =>
			matchRecord(record, entry, `${path}.queries[${index}]`),
		);
		const hits = matches.flatMap((entry) => entry.hits).sort(hitSort);
		return {
			matched: matches.some((entry) => entry.matched),
			hits,
			tokens: matches.some((entry) => entry.matched) ? record.tokens : [],
		};
	}
	const inner = matchRecord(record, query.query, `${path}.query`);
	return {
		matched: !inner.matched,
		hits: !inner.matched ? [{ docId: record.ref.id }] : [],
		tokens: [],
	};
}

export function corpusQuery(
	corpus: TextCorpus,
	query: CorpusQuery,
	options: CorpusQueryOptions = {},
): CorpusResult {
	const state = getCorpusState(corpus);
	const matches = state.records
		.map((record) => ({ record, match: matchRecord(record, query) }))
		.filter((entry) => entry.match.matched)
		.sort((left, right) =>
			compareStrings(left.record.ref.id, right.record.ref.id),
		);
	const limited =
		options.limit === undefined
			? matches
			: matches.slice(0, Math.max(0, options.limit));
	const hits =
		options.includeHits === false
			? []
			: limited.flatMap((entry) => entry.match.hits).sort(hitSort);
	return {
		corpusId: corpus.id,
		documents: limited.map((entry) => ({
			id: entry.record.ref.id,
			metadata: { ...entry.record.ref.metadata },
		})),
		hits,
		count: limited.length,
		diagnostics: state.diagnostics.map((entry) => ({ ...entry })),
	};
}
