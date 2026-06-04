import { compareNumbers, compareStrings } from "../internal/compare.js";
import { corpusQuery } from "../query/execute.js";
import type { CorpusQuery } from "../query/types.js";
import { getCorpusState } from "../store/state.js";
import type { TextCorpus } from "../store/types.js";

export type FrequencyUnit = "token" | "lemma" | "surface";

export interface FrequencyOptions {
	unit?: FrequencyUnit;
	query?: CorpusQuery;
	minCount?: number;
	limit?: number;
	stopwords?: string[];
}

export interface FrequencyItem {
	item: string;
	count: number;
	documents: number;
	relativeFrequency: number;
}

export interface DocumentTermItem {
	docId: string;
	item: string;
	count: number;
	relativeFrequency: number;
}

function frequencyKey(
	token: {
		readonly text: string;
		readonly normalized: string;
		readonly lemma?: string;
	},
	unit: FrequencyUnit,
): string | undefined {
	if (unit === "lemma") return token.lemma;
	if (unit === "surface") return token.text;
	return token.normalized;
}

function sortFrequency(left: FrequencyItem, right: FrequencyItem): number {
	const count = compareNumbers(right.count, left.count);
	if (count !== 0) return count;
	return compareStrings(left.item, right.item);
}

export function frequency(
	corpus: TextCorpus,
	options: FrequencyOptions = {},
): FrequencyItem[] {
	const state = getCorpusState(corpus);
	const unit = options.unit ?? "token";
	const stopwords = new Set(
		(options.stopwords ?? []).map((entry) => entry.toLocaleLowerCase("und")),
	);
	const docs =
		options.query === undefined
			? state.records
			: new Set(
					corpusQuery(corpus, options.query).documents.map((ref) => ref.id),
				);
	const counts = new Map<string, number>();
	const docCounts = new Map<string, Set<string>>();
	let total = 0;
	for (const record of state.records) {
		if (docs instanceof Set && !docs.has(record.ref.id)) continue;
		for (const token of record.tokens) {
			const key = frequencyKey(token, unit);
			if (key === undefined || stopwords.has(key.toLocaleLowerCase("und")))
				continue;
			counts.set(key, (counts.get(key) ?? 0) + 1);
			const docSet = docCounts.get(key) ?? new Set<string>();
			docSet.add(record.ref.id);
			docCounts.set(key, docSet);
			total += 1;
		}
	}
	return [...counts.entries()]
		.map(([item, count]) => ({
			item,
			count,
			documents: docCounts.get(item)?.size ?? 0,
			relativeFrequency: total === 0 ? 0 : count / total,
		}))
		.filter((item) => item.count >= (options.minCount ?? 1))
		.sort(sortFrequency)
		.slice(0, options.limit);
}

export function wordList(
	corpus: TextCorpus,
	options: FrequencyOptions = {},
): FrequencyItem[] {
	return frequency(corpus, options);
}

export function documentTermMatrix(
	corpus: TextCorpus,
	options: FrequencyOptions = {},
): DocumentTermItem[] {
	const state = getCorpusState(corpus);
	const unit = options.unit ?? "token";
	const rows: DocumentTermItem[] = [];
	for (const record of state.records) {
		const counts = new Map<string, number>();
		for (const token of record.tokens) {
			const key = frequencyKey(token, unit);
			if (key !== undefined) counts.set(key, (counts.get(key) ?? 0) + 1);
		}
		const total = [...counts.values()].reduce((sum, value) => sum + value, 0);
		for (const [item, count] of counts) {
			rows.push({
				docId: record.ref.id,
				item,
				count,
				relativeFrequency: total === 0 ? 0 : count / total,
			});
		}
	}
	return rows.sort((left, right) => {
		const doc = compareStrings(left.docId, right.docId);
		return doc !== 0 ? doc : compareStrings(left.item, right.item);
	});
}
