import { documentTermMatrix } from "../frequency/mod.js";
import { compareStrings } from "../internal/compare.js";
import { cosineSimilarity, safeDivide } from "../internal/math.js";
import { ngrams } from "../ngram/mod.js";
import { getCorpusState } from "../store/state.js";
import type { TextCorpus } from "../store/types.js";

export interface StylometryOptions {
	functionWords?: string[];
	charNgram?: number;
	wordNgram?: number;
}

export interface StylometricDocumentProfile {
	docId: string;
	tokenCount: number;
	typeTokenRatio: number;
	averageTokenLength: number;
	punctuationRatio: number;
	functionWordProfile: Record<string, number>;
}

export interface StylometricProfile {
	corpusId: string;
	documents: StylometricDocumentProfile[];
	charNgrams: Record<string, number>;
	wordNgrams: Record<string, number>;
}

export interface DocumentSimilarity {
	leftDocId: string;
	rightDocId: string;
	score: number;
}

const defaultFunctionWords = ["a", "an", "and", "in", "of", "the", "to"];

function punctuationRatio(tokens: readonly string[]): number {
	const punctuation = tokens.filter((token) => /^\p{P}+$/u.test(token)).length;
	return safeDivide(punctuation, tokens.length);
}

export function stylometricProfile(
	corpus: TextCorpus,
	options: StylometryOptions = {},
): StylometricProfile {
	const state = getCorpusState(corpus);
	const functionWords = options.functionWords ?? defaultFunctionWords;
	const documents = state.records.map((record) => {
		const tokens = record.tokens.map((token) => token.normalized);
		const types = new Set(tokens);
		const tokenLengths = record.tokens.reduce(
			(sum, token) => sum + token.text.length,
			0,
		);
		const functionWordProfile: Record<string, number> = {};
		for (const word of functionWords) {
			functionWordProfile[word] = safeDivide(
				tokens.filter((token) => token === word).length,
				tokens.length,
			);
		}
		return {
			docId: record.ref.id,
			tokenCount: tokens.length,
			typeTokenRatio: safeDivide(types.size, tokens.length),
			averageTokenLength: safeDivide(tokenLengths, tokens.length),
			punctuationRatio: punctuationRatio(
				record.tokens.map((token) => token.text),
			),
			functionWordProfile,
		};
	});
	const charNgramRows = ngrams(corpus, {
		unit: "character",
		n: options.charNgram ?? 3,
		limit: 200,
	});
	const wordNgramRows = ngrams(corpus, {
		unit: "token",
		n: options.wordNgram ?? 2,
		limit: 200,
	});
	return {
		corpusId: corpus.id,
		documents: documents.sort((left, right) =>
			compareStrings(left.docId, right.docId),
		),
		charNgrams: Object.fromEntries(
			charNgramRows.map((row) => [row.key, row.count]),
		),
		wordNgrams: Object.fromEntries(
			wordNgramRows.map((row) => [row.key, row.count]),
		),
	};
}

export function documentSimilarityMatrix(
	corpus: TextCorpus,
): DocumentSimilarity[] {
	const rows = documentTermMatrix(corpus);
	const vectors = new Map<string, Record<string, number>>();
	for (const row of rows) {
		const vector = vectors.get(row.docId) ?? {};
		vector[row.item] = row.relativeFrequency;
		vectors.set(row.docId, vector);
	}
	const docIds = [...vectors.keys()].sort(compareStrings);
	const similarities: DocumentSimilarity[] = [];
	for (let leftIndex = 0; leftIndex < docIds.length; leftIndex += 1) {
		for (
			let rightIndex = leftIndex + 1;
			rightIndex < docIds.length;
			rightIndex += 1
		) {
			const leftDocId = docIds[leftIndex];
			const rightDocId = docIds[rightIndex];
			if (leftDocId === undefined || rightDocId === undefined) continue;
			similarities.push({
				leftDocId,
				rightDocId,
				score: cosineSimilarity(
					vectors.get(leftDocId) ?? {},
					vectors.get(rightDocId) ?? {},
				),
			});
		}
	}
	return similarities;
}

export function lexicalDiversity(corpus: TextCorpus): Record<string, number> {
	const profile = stylometricProfile(corpus);
	return Object.fromEntries(
		profile.documents.map((doc) => [doc.docId, doc.typeTokenRatio]),
	);
}
