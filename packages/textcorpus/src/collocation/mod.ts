import { compareNumbers, compareStrings } from "../internal/compare.js";
import { associationScore } from "../internal/math.js";
import { corpusQuery } from "../query/execute.js";
import type { CorpusQuery } from "../query/types.js";
import { getCorpusState } from "../store/state.js";
import type { TextCorpus } from "../store/types.js";

export type AssociationMeasure =
	| "mi"
	| "mi3"
	| "t-score"
	| "z-score"
	| "chi-square"
	| "log-likelihood"
	| "dice"
	| "logdice"
	| "raw-frequency"
	| "relative-frequency";

export interface CollocationOptions {
	window?: number;
	measure?: AssociationMeasure;
	minCount?: number;
	limit?: number;
}

export interface CollocationResult {
	node: string;
	collocate: string;
	count: number;
	nodeCount: number;
	collocateCount: number;
	measure: AssociationMeasure;
	score: number;
}

function sortCollocation(
	left: CollocationResult,
	right: CollocationResult,
): number {
	const score = compareNumbers(right.score, left.score);
	if (score !== 0) return score;
	const count = compareNumbers(right.count, left.count);
	if (count !== 0) return count;
	const node = compareStrings(left.node, right.node);
	return node !== 0 ? node : compareStrings(left.collocate, right.collocate);
}

export function collocations(
	corpus: TextCorpus,
	query: CorpusQuery,
	options: CollocationOptions = {},
): CollocationResult[] {
	const state = getCorpusState(corpus);
	const measure = options.measure ?? "logdice";
	const window = options.window ?? 5;
	const result = corpusQuery(corpus, query, { includeHits: true });
	const hitKeys = new Set(
		result.hits.flatMap((hit) =>
			hit.tokenIndex === undefined ? [] : [`${hit.docId}:${hit.tokenIndex}`],
		),
	);
	const tokenCounts = new Map<string, number>();
	const pairCounts = new Map<
		string,
		{ node: string; collocate: string; count: number }
	>();
	let totalWindows = 0;
	let corpusTokenCount = 0;
	for (const record of state.records) {
		corpusTokenCount += record.tokens.length;
		for (const token of record.tokens) {
			tokenCounts.set(
				token.normalized,
				(tokenCounts.get(token.normalized) ?? 0) + 1,
			);
		}
		for (const token of record.tokens) {
			if (!hitKeys.has(`${record.ref.id}:${token.index}`)) continue;
			for (
				let index = Math.max(0, token.index - window);
				index <= Math.min(record.tokens.length - 1, token.index + window);
				index += 1
			) {
				if (index === token.index) continue;
				const collocate = record.tokens[index];
				if (collocate === undefined) continue;
				const key = `${token.normalized}\u0001${collocate.normalized}`;
				const item = pairCounts.get(key) ?? {
					node: token.normalized,
					collocate: collocate.normalized,
					count: 0,
				};
				item.count += 1;
				totalWindows += 1;
				pairCounts.set(key, item);
			}
		}
	}
	return [...pairCounts.values()]
		.filter((item) => item.count >= (options.minCount ?? 1))
		.map((item) => {
			const nodeCount = tokenCounts.get(item.node) ?? 0;
			const collocateCount = tokenCounts.get(item.collocate) ?? 0;
			return {
				...item,
				nodeCount,
				collocateCount,
				measure,
				score: associationScore(
					measure,
					item.count,
					nodeCount,
					collocateCount,
					totalWindows,
					corpusTokenCount,
				),
			};
		})
		.sort(sortCollocation)
		.slice(0, options.limit);
}
