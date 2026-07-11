import type { SpanRef } from "@ismail-elkorchi/textdoc";
import { compareNumbers, compareStrings } from "../internal/compare.js";
import { getCorpusState } from "../store/state.js";
import type { TextCorpus } from "../store/types.js";

export interface ReuseOptions {
	shingleSize?: number;
	minCount?: number;
	limit?: number;
}

export interface ReuseMatch {
	sourceDocId: string;
	targetDocId: string;
	sourceSpan?: SpanRef;
	targetSpan?: SpanRef;
	text: string;
	tokens: string[];
	count: number;
	score: number;
}

function sortReuse(left: ReuseMatch, right: ReuseMatch): number {
	const score = compareNumbers(right.score, left.score);
	if (score !== 0) return score;
	const source = compareStrings(left.sourceDocId, right.sourceDocId);
	if (source !== 0) return source;
	const target = compareStrings(left.targetDocId, right.targetDocId);
	if (target !== 0) return target;
	return compareStrings(left.text, right.text);
}

function coveringSpan(
	tokens: readonly { readonly span?: SpanRef }[],
): SpanRef | undefined {
	const first = tokens[0]?.span;
	const last = tokens[tokens.length - 1]?.span;
	if (
		first === undefined ||
		last === undefined ||
		first.viewId !== last.viewId ||
		first.span.unit !== "utf16-code-unit" ||
		last.span.unit !== "utf16-code-unit"
	) {
		return undefined;
	}
	return Object.freeze({
		viewId: first.viewId,
		span: Object.freeze({
			start: first.span.start,
			end: last.span.end,
			unit: "utf16-code-unit" as const,
		}),
	});
}

export function detectReuse(
	corpus: TextCorpus,
	options: ReuseOptions = {},
): ReuseMatch[] {
	const state = getCorpusState(corpus);
	const size = options.shingleSize ?? 5;
	const index = new Map<string, { docId: string; tokenIndex: number }[]>();
	for (const record of state.records) {
		for (
			let tokenIndex = 0;
			tokenIndex + size <= record.tokens.length;
			tokenIndex += 1
		) {
			const key = record.tokens
				.slice(tokenIndex, tokenIndex + size)
				.map((token) => token.normalized)
				.join("\u0001");
			const entries = index.get(key) ?? [];
			entries.push({ docId: record.ref.id, tokenIndex });
			index.set(key, entries);
		}
	}
	const recordsById = new Map(
		state.records.map((record) => [record.ref.id, record]),
	);
	const matches: ReuseMatch[] = [];
	for (const [key, entries] of index) {
		const uniqueDocs = [...new Set(entries.map((entry) => entry.docId))].sort(
			compareStrings,
		);
		if (uniqueDocs.length < (options.minCount ?? 2)) continue;
		for (let leftIndex = 0; leftIndex < uniqueDocs.length; leftIndex += 1) {
			for (
				let rightIndex = leftIndex + 1;
				rightIndex < uniqueDocs.length;
				rightIndex += 1
			) {
				const sourceDocId = uniqueDocs[leftIndex];
				const targetDocId = uniqueDocs[rightIndex];
				if (sourceDocId === undefined || targetDocId === undefined) continue;
				const sourceEntry = entries.find(
					(entry) => entry.docId === sourceDocId,
				);
				const targetEntry = entries.find(
					(entry) => entry.docId === targetDocId,
				);
				const sourceRecord = recordsById.get(sourceDocId);
				const targetRecord = recordsById.get(targetDocId);
				if (
					sourceEntry === undefined ||
					targetEntry === undefined ||
					sourceRecord === undefined ||
					targetRecord === undefined
				) {
					continue;
				}
				const sourceTokens = sourceRecord.tokens.slice(
					sourceEntry.tokenIndex,
					sourceEntry.tokenIndex + size,
				);
				const targetTokens = targetRecord.tokens.slice(
					targetEntry.tokenIndex,
					targetEntry.tokenIndex + size,
				);
				const sourceSpan = coveringSpan(sourceTokens);
				const targetSpan = coveringSpan(targetTokens);
				matches.push({
					sourceDocId,
					targetDocId,
					...(sourceSpan === undefined ? {} : { sourceSpan }),
					...(targetSpan === undefined ? {} : { targetSpan }),
					text: sourceTokens.map((token) => token.text).join(" "),
					tokens: key.split("\u0001"),
					count: entries.length,
					score: size * entries.length,
				});
			}
		}
	}
	return matches.sort(sortReuse).slice(0, options.limit);
}

export function reuse(
	corpus: TextCorpus,
	options: ReuseOptions = {},
): ReuseMatch[] {
	return detectReuse(corpus, options);
}
