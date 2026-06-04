import { collocations } from "../collocation/mod.js";
import { concordance } from "../concordance/mod.js";
import { compareNumbers, compareStrings } from "../internal/compare.js";
import type { CorpusQuery } from "../query/types.js";
import type { TextCorpus } from "../store/types.js";

export interface WordSketchOptions {
	window?: number;
	limit?: number;
}

export interface WordSketchRelation {
	relation: string;
	collocate: string;
	count: number;
	score: number;
}

export interface WordSketch {
	lemma: string;
	relations: WordSketchRelation[];
}

export interface GdexOptions {
	limit?: number;
	window?: number;
	minLength?: number;
	maxLength?: number;
}

export interface DictionaryExample {
	docId: string;
	text: string;
	left: string;
	node: string;
	right: string;
	score: number;
	metadata: Record<string, unknown>;
}

export function wordSketch(
	corpus: TextCorpus,
	lemma: string,
	options: WordSketchOptions = {},
): WordSketch {
	const rows = collocations(
		corpus,
		{ kind: "lemma", lemma },
		{
			measure: "logdice",
			...(options.window !== undefined ? { window: options.window } : {}),
			...(options.limit !== undefined ? { limit: options.limit } : {}),
		},
	);
	return {
		lemma,
		relations: rows
			.map((row) => ({
				relation: "window",
				collocate: row.collocate,
				count: row.count,
				score: row.score,
			}))
			.sort((left, right) => {
				const score = compareNumbers(right.score, left.score);
				return score !== 0
					? score
					: compareStrings(left.collocate, right.collocate);
			}),
	};
}

export function goodDictionaryExamples(
	corpus: TextCorpus,
	query: CorpusQuery,
	options: GdexOptions = {},
): DictionaryExample[] {
	const minLength = options.minLength ?? 20;
	const maxLength = options.maxLength ?? 180;
	return concordance(corpus, query, {
		window: options.window ?? 8,
		...(options.limit !== undefined ? { limit: options.limit } : {}),
	})
		.map((line) => {
			const text = [line.left, line.node, line.right].filter(Boolean).join(" ");
			const lengthPenalty =
				text.length < minLength || text.length > maxLength
					? Math.abs(
							text.length -
								Math.min(Math.max(text.length, minLength), maxLength),
						)
					: 0;
			return {
				docId: line.docId,
				text,
				left: line.left,
				node: line.node,
				right: line.right,
				score: Math.max(0, 100 - lengthPenalty),
				metadata: line.metadata,
			};
		})
		.sort((left, right) => {
			const score = compareNumbers(right.score, left.score);
			return score !== 0 ? score : compareStrings(left.text, right.text);
		})
		.slice(0, options.limit);
}
