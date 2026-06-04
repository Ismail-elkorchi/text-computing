import { compareStrings } from "../internal/compare.js";
import { corpusQuery } from "../query/execute.js";
import type { CorpusQuery } from "../query/types.js";
import { getCorpusState } from "../store/state.js";
import type { TextCorpus } from "../store/types.js";

export interface DispersionOptions {
	partitionKey?: string;
	query?: CorpusQuery;
}

export interface DispersionItem {
	partition: string;
	documents: number;
	hits: number;
	tokens: number;
	relativeFrequency: number;
}

export function dispersion(
	corpus: TextCorpus,
	query: CorpusQuery,
	options: DispersionOptions = {},
): DispersionItem[] {
	const state = getCorpusState(corpus);
	const result = corpusQuery(corpus, options.query ?? query, {
		includeHits: true,
	});
	const hitCounts = new Map<string, number>();
	for (const hit of result.hits) {
		hitCounts.set(hit.docId, (hitCounts.get(hit.docId) ?? 0) + 1);
	}
	const partitions = new Map<
		string,
		{ docs: Set<string>; hits: number; tokens: number }
	>();
	for (const record of state.records) {
		const partition =
			options.partitionKey === undefined
				? "corpus"
				: (record.partitions[options.partitionKey] ?? "missing");
		const item = partitions.get(partition) ?? {
			docs: new Set<string>(),
			hits: 0,
			tokens: 0,
		};
		item.docs.add(record.ref.id);
		item.hits += hitCounts.get(record.ref.id) ?? 0;
		item.tokens += record.tokens.length;
		partitions.set(partition, item);
	}
	return [...partitions.entries()]
		.map(([partition, value]) => ({
			partition,
			documents: value.docs.size,
			hits: value.hits,
			tokens: value.tokens,
			relativeFrequency: value.tokens === 0 ? 0 : value.hits / value.tokens,
		}))
		.sort((left, right) => compareStrings(left.partition, right.partition));
}

export function distribution(
	corpus: TextCorpus,
	query: CorpusQuery,
	options: DispersionOptions = {},
): DispersionItem[] {
	return dispersion(corpus, query, options);
}
