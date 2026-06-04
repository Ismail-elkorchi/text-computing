import { compareNumbers, compareStrings } from "../internal/compare.js";
import { sliceSpanText } from "../internal/tokens.js";
import { corpusQuery } from "../query/execute.js";
import type { CorpusQuery } from "../query/types.js";
import { getCorpusState } from "../store/state.js";
import type {
	CorpusDiagnostic,
	CorpusRecord,
	TextCorpus,
} from "../store/types.js";

export interface KwicLine {
	docId: string;
	hit: import("@ismail-elkorchi/textdoc").SpanRef;
	left: string;
	node: string;
	right: string;
	metadata: Record<string, unknown>;
}

export interface ConcordanceOptions {
	window?: number;
	limit?: number;
	sort?: "document" | "left" | "node" | "right";
}

function tokenContext(
	record: CorpusRecord,
	tokenIndex: number,
	window: number,
) {
	const left = record.tokens
		.slice(Math.max(0, tokenIndex - window), tokenIndex)
		.map((token) => token.text)
		.join(" ");
	const right = record.tokens
		.slice(tokenIndex + 1, tokenIndex + 1 + window)
		.map((token) => token.text)
		.join(" ");
	return { left, right };
}

function concordanceSort(sort: ConcordanceOptions["sort"]) {
	return (left: KwicLine, right: KwicLine): number => {
		const primary =
			sort === "left"
				? compareStrings(left.left, right.left)
				: sort === "node"
					? compareStrings(left.node, right.node)
					: sort === "right"
						? compareStrings(left.right, right.right)
						: compareStrings(left.docId, right.docId);
		if (primary !== 0) return primary;
		const doc = compareStrings(left.docId, right.docId);
		if (doc !== 0) return doc;
		return compareNumbers(left.hit.span.start, right.hit.span.start);
	};
}

export function concordance(
	corpus: TextCorpus,
	query: CorpusQuery,
	options: ConcordanceOptions = {},
): KwicLine[] {
	const state = getCorpusState(corpus);
	const result = corpusQuery(corpus, query, {
		includeHits: true,
		...(options.limit !== undefined ? { limit: options.limit } : {}),
	});
	const diagnostics: CorpusDiagnostic[] = [];
	const lines: KwicLine[] = [];
	const records = new Map(
		state.records.map((record) => [record.ref.id, record]),
	);
	for (const hit of result.hits) {
		if (hit.span === undefined) continue;
		const record = records.get(hit.docId);
		if (record === undefined) continue;
		const tokenIndex =
			hit.tokenIndex ??
			record.tokens.findIndex((token) => token.span === hit.span);
		const context =
			tokenIndex >= 0
				? tokenContext(record, tokenIndex, options.window ?? 5)
				: { left: "", right: "" };
		lines.push({
			docId: hit.docId,
			hit: hit.span,
			left: context.left,
			node:
				hit.token ??
				sliceSpanText(record.document, hit.span, diagnostics, {
					docId: hit.docId,
					...(hit.layerId !== undefined ? { layerId: hit.layerId } : {}),
				}) ??
				"",
			right: context.right,
			metadata: { ...record.ref.metadata },
		});
	}
	return lines.sort(concordanceSort(options.sort)).slice(0, options.limit);
}
