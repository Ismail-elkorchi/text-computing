import assert from "node:assert/strict";
import test from "node:test";

import {
	concordance,
	corpusQuery,
	createCorpus,
} from "@ismail-elkorchi/text-computing/corpus";
import { fixtureDocuments } from "../fixtures/documents.ts";

test("node runtime imports final textcorpus entrypoint", () => {
	const corpus = createCorpus(fixtureDocuments());
	assert.equal(corpusQuery(corpus, { kind: "token", term: "legal" }).count, 2);
	assert.equal(
		concordance(corpus, { kind: "lemma", lemma: "legal" }).length,
		2,
	);
});
