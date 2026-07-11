import assert from "node:assert/strict";
import test from "node:test";

import { buildStoplist } from "@ismail-elkorchi/textlex";
import { extractBilingualTerms } from "../dist/bilingual-terms/mod.js";
import { fixtureParallelCorpus } from "./fixtures/documents.ts";

test("extracts bilingual term candidates from aligned spans", () => {
	const candidates = extractBilingualTerms(fixtureParallelCorpus());
	assert.ok(
		candidates.some(
			(candidate) =>
				candidate.sourceText === "Hello world" &&
				candidate.targetText === "Bonjour monde",
		),
	);
	assert.ok(
		candidates.every((candidate) => !/[.!?]$/u.test(candidate.sourceText)),
	);
	assert.ok(
		candidates.every((candidate) => Number.isFinite(candidate.score.value)),
	);
	assert.ok(
		candidates.every(
			(candidate, index) =>
				index === 0 ||
				candidate.score.value <=
					(candidates[index - 1]?.score.value ?? Number.POSITIVE_INFINITY),
		),
	);
});

test("applies caller-provided stoplists", () => {
	const stoplist = buildStoplist(
		["Hello", "world", "Bonjour", "monde", "Good", "day", "Bon", "jour"],
		{
			id: "fixture-stoplist",
			casefold: true,
		},
	);
	const candidates = extractBilingualTerms(fixtureParallelCorpus(), {
		stoplists: [stoplist],
	});
	assert.equal(candidates.length, 0);
});
