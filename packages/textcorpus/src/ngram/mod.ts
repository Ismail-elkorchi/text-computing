import { compareNumbers, compareStrings } from "../internal/compare.js";
import { getCorpusState } from "../store/state.js";
import type { TextCorpus } from "../store/types.js";

export type NgramUnit = "token" | "lemma" | "character";

export interface NgramOptions {
	n?: number;
	unit?: NgramUnit;
	minCount?: number;
	limit?: number;
}

export interface NgramItem {
	ngram: string[];
	key: string;
	count: number;
	documents: number;
}

function tokenSequence(
	record: {
		readonly tokens: readonly {
			readonly normalized: string;
			readonly lemma?: string;
		}[];
		readonly document: {
			readonly views: Record<string, { readonly text: string }>;
		};
	},
	unit: NgramUnit,
): string[] {
	if (unit === "character") {
		const view = Object.values(record.document.views)[0];
		return [...(view?.text ?? "")];
	}
	return record.tokens.flatMap((token) =>
		unit === "lemma"
			? token.lemma === undefined
				? []
				: [token.lemma]
			: [token.normalized],
	);
}

function sortNgram(left: NgramItem, right: NgramItem): number {
	const count = compareNumbers(right.count, left.count);
	if (count !== 0) return count;
	return compareStrings(left.key, right.key);
}

export function ngrams(
	corpus: TextCorpus,
	options: NgramOptions = {},
): NgramItem[] {
	const state = getCorpusState(corpus);
	const n = options.n ?? 2;
	const unit = options.unit ?? "token";
	const counts = new Map<
		string,
		{ parts: string[]; count: number; docs: Set<string> }
	>();
	for (const record of state.records) {
		const sequence = tokenSequence(record, unit);
		for (let index = 0; index + n <= sequence.length; index += 1) {
			const parts = sequence.slice(index, index + n);
			const key = parts.join("\u0001");
			const item = counts.get(key) ?? {
				parts,
				count: 0,
				docs: new Set<string>(),
			};
			item.count += 1;
			item.docs.add(record.ref.id);
			counts.set(key, item);
		}
	}
	return [...counts.entries()]
		.map(([key, value]) => ({
			key,
			ngram: value.parts,
			count: value.count,
			documents: value.docs.size,
		}))
		.filter((item) => item.count >= (options.minCount ?? 1))
		.sort(sortNgram)
		.slice(0, options.limit);
}

export function ngramFrequencies(
	corpus: TextCorpus,
	options: NgramOptions = {},
): NgramItem[] {
	return ngrams(corpus, options);
}
