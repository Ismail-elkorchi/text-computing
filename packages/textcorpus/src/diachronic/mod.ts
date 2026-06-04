import { compareStrings } from "../internal/compare.js";
import { corpusQuery } from "../query/execute.js";
import type { CorpusQuery } from "../query/types.js";
import { getCorpusState } from "../store/state.js";
import type { TextCorpus } from "../store/types.js";

export interface DiachronicOptions {
	periodKey?: string;
	query?: CorpusQuery;
}

export interface DiachronicTrend {
	period: string;
	documents: number;
	tokens: number;
	hits: number;
	relativeFrequency: number;
	delta?: number;
}

export function diachronicTrends(
	corpus: TextCorpus,
	options: DiachronicOptions = {},
): DiachronicTrend[] {
	const state = getCorpusState(corpus);
	const periodKey = options.periodKey ?? "date";
	const result =
		options.query === undefined
			? undefined
			: corpusQuery(corpus, options.query, { includeHits: true });
	const hitCounts = new Map<string, number>();
	for (const hit of result?.hits ?? []) {
		hitCounts.set(hit.docId, (hitCounts.get(hit.docId) ?? 0) + 1);
	}
	const periods = new Map<
		string,
		{ docs: Set<string>; tokens: number; hits: number }
	>();
	for (const record of state.records) {
		const metadataValue = record.ref.metadata[periodKey];
		const period =
			typeof metadataValue === "string" || typeof metadataValue === "number"
				? String(metadataValue).slice(0, 10)
				: "undated";
		const item = periods.get(period) ?? {
			docs: new Set<string>(),
			tokens: 0,
			hits: 0,
		};
		item.docs.add(record.ref.id);
		item.tokens += record.tokens.length;
		item.hits +=
			options.query === undefined
				? record.tokens.length
				: (hitCounts.get(record.ref.id) ?? 0);
		periods.set(period, item);
	}
	let previous: number | undefined;
	return [...periods.entries()]
		.sort(([left], [right]) => compareStrings(left, right))
		.map(([period, value]) => {
			const relativeFrequency =
				value.tokens === 0 ? 0 : value.hits / value.tokens;
			const trend: DiachronicTrend = {
				period,
				documents: value.docs.size,
				tokens: value.tokens,
				hits: value.hits,
				relativeFrequency,
				...(previous !== undefined
					? { delta: relativeFrequency - previous }
					: {}),
			};
			previous = relativeFrequency;
			return trend;
		});
}
