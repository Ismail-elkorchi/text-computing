import assert from "node:assert/strict";
import test from "node:test";

import { createDocument } from "@ismail-elkorchi/textdoc";

import {
	alignSentences,
	trainSentenceAligner,
} from "../dist/sentence-align/mod.js";
import {
	fixtureParallelDocument,
	sourceDocument,
	targetDocument,
} from "./fixtures/documents.ts";

test("aligns sentence spans deterministically", () => {
	const links = alignSentences(sourceDocument(), targetDocument());
	assert.equal(links.length, 2);
	assert.ok(links.every((link) => link.source.span.unit === "utf16-code-unit"));
	assert.ok(links.every((link) => Number.isFinite(link.score?.value)));
});

test("trains a finite sentence alignment model from examples", () => {
	const model = trainSentenceAligner([fixtureParallelDocument()], {
		id: "model-sentence",
		metadata: { corpus: "fixture" },
	});
	assert.equal(model.id, "model-sentence");
	assert.ok(Number.isFinite(model.averageLengthRatio));
});

test("uses global dynamic programming for unequal sentence counts", () => {
	const source = createDocument("Alpha. Beta.", { id: "source-unequal" });
	const target = createDocument("Un. Deux. Trois.", { id: "target-unequal" });
	const links = alignSentences(source, target, {
		lengthWeight: 1,
		lexicalWeight: 0,
	});
	assert.equal(links.length, 2);
	assert.ok(links.some((link) => link.relation === "partial"));
	assert.ok(
		links.some(
			(link) => link.target.span.end - link.target.span.start > "Deux.".length,
		),
	);
});
