import assert from "node:assert/strict";
import test from "node:test";

import {
	compareParallelCollocations,
	induceBilingualLexicon,
} from "../dist/bilingual-lexicon/mod.js";
import {
	fixtureDictionary,
	fixtureParallelCorpus,
} from "./fixtures/documents.ts";

test("induces bilingual lexicon candidates", () => {
	const candidates = induceBilingualLexicon(fixtureParallelCorpus(), {
		dictionaries: fixtureDictionary,
	});
	assert.ok(candidates.some((candidate) => candidate.sourceForm === "world"));
	assert.ok(candidates.every((candidate) => candidate.count >= 1));
});

test("compares aligned collocations", () => {
	const comparisons = compareParallelCollocations(fixtureParallelCorpus());
	assert.ok(
		comparisons.some(
			(comparison) => comparison.sourceCollocation.join(" ") === "hello world",
		),
	);
});
