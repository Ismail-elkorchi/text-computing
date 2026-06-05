import assert from "node:assert/strict";
import test from "node:test";

import { alignWords, trainWordAligner } from "../dist/word-align/mod.js";
import {
	fixtureDictionary,
	fixtureParallelDocument,
	sourceDocument,
	targetDocument,
} from "./fixtures/documents.ts";

test("aligns words with explicit dictionary hints", () => {
	const links = alignWords(sourceDocument(), targetDocument(), {
		dictionaries: fixtureDictionary,
		allowNullLinks: false,
	});
	assert.ok(links.some((link) => link.score?.scale === "dictionary"));
	assert.ok(links.every((link) => link.relation !== "deleted"));
});

test("trains a word alignment model from aligned examples", () => {
	const model = trainWordAligner([fixtureParallelDocument()], {
		id: "model-word",
	});
	assert.equal(model.id, "model-word");
	assert.ok(model.dictionary.length > 0);
});
