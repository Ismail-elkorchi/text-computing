import assert from "node:assert/strict";
import test from "node:test";

import { createDocument } from "@ismail-elkorchi/textdoc";
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
	assert.ok(model.dictionary.every((entry) => (entry.weight ?? 0) <= 1));
	const links = alignWords(sourceDocument(), targetDocument(), {
		model,
		allowNullLinks: false,
	});
	assert.ok(links.some((link) => link.score?.scale === "dictionary"));
});

test("finds the global maximum-weight one-to-one word assignment", () => {
	const source = createDocument("a b", { id: "global-source" });
	const target = createDocument("x y", { id: "global-target" });
	const links = alignWords(source, target, {
		dictionaries: [
			{ source: "a", target: "x", weight: 1 },
			{ source: "a", target: "y", weight: 0.9 },
			{ source: "b", target: "x", weight: 0.95 },
		],
		allowNullLinks: false,
	});
	const sourceText = source.views.raw?.text ?? "";
	const targetText = target.views.raw?.text ?? "";
	const pairs = links.map((link) => [
		sourceText.slice(link.source.span.start, link.source.span.end),
		targetText.slice(link.target.span.start, link.target.span.end),
	]);
	assert.deepEqual(pairs, [
		["a", "y"],
		["b", "x"],
	]);
});
