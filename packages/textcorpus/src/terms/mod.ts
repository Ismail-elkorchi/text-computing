import { frequency } from "../frequency/mod.js";
import { compareNumbers, compareStrings } from "../internal/compare.js";
import { ngrams } from "../ngram/mod.js";
import type { TextCorpus } from "../store/types.js";

export interface StoplistResource {
	id?: string;
	entries?: string[];
	words?: string[];
}

export interface LexiconResource {
	id?: string;
	metadata?: Record<string, unknown>;
}

export interface TermExtractionOptions {
	maxNgram?: number;
	minCount?: number;
	limit?: number;
	stopwords?: string[] | StoplistResource;
	lexicon?: LexiconResource;
}

export interface TermCandidate {
	term: string;
	tokens: string[];
	count: number;
	score: number;
	documents: number;
}

function stopwordSet(
	stopwords: TermExtractionOptions["stopwords"],
): Set<string> {
	if (stopwords === undefined) return new Set<string>();
	if (Array.isArray(stopwords)) {
		return new Set(stopwords.map((entry) => entry.toLocaleLowerCase("und")));
	}
	const entries =
		stopwords.entries !== undefined
			? stopwords.entries
			: (stopwords.words ?? []);
	return new Set(
		entries.map((entry) => String(entry).toLocaleLowerCase("und")),
	);
}

function sortTerms(left: TermCandidate, right: TermCandidate): number {
	const score = compareNumbers(right.score, left.score);
	if (score !== 0) return score;
	const count = compareNumbers(right.count, left.count);
	if (count !== 0) return count;
	return compareStrings(left.term, right.term);
}

export function extractTerms(
	corpus: TextCorpus,
	options: TermExtractionOptions = {},
): TermCandidate[] {
	const stopwords = stopwordSet(options.stopwords);
	const candidates: TermCandidate[] = [];
	for (const item of frequency(corpus, {
		minCount: options.minCount ?? 1,
		stopwords: [...stopwords],
	})) {
		candidates.push({
			term: item.item,
			tokens: [item.item],
			count: item.count,
			documents: item.documents,
			score: item.count * (1 + item.relativeFrequency),
		});
	}
	for (let n = 2; n <= (options.maxNgram ?? 3); n += 1) {
		for (const item of ngrams(corpus, { n, minCount: options.minCount ?? 2 })) {
			if (item.ngram.some((part) => stopwords.has(part))) continue;
			candidates.push({
				term: item.ngram.join(" "),
				tokens: item.ngram,
				count: item.count,
				documents: item.documents,
				score: item.count * n,
			});
		}
	}
	return candidates.sort(sortTerms).slice(0, options.limit);
}
