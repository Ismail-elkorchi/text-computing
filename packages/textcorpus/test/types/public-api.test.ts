import assert from "node:assert/strict";
import test from "node:test";

import {
	type CorpusQuery,
	concordance,
	corpusQuery,
	createCorpus,
	extractTerms,
	type KwicLine,
	type TermCandidate,
	type TextCorpus,
} from "../../dist/index.js";
import { fixtureDocuments } from "../fixtures/documents.ts";

test("public types compose for final textcorpus usage", () => {
	const corpus: TextCorpus = createCorpus(fixtureDocuments());
	const query: CorpusQuery = { kind: "lemma", lemma: "contract" };
	const result = corpusQuery(corpus, query);
	const lines: KwicLine[] = concordance(corpus, query);
	const terms: TermCandidate[] = extractTerms(corpus);
	assert.equal(result.count > 0, true);
	assert.equal(lines.length > 0, true);
	assert.equal(terms.length > 0, true);
});
