import assert from "node:assert/strict";
import test from "node:test";

import {
	buildTranslationMemory,
	searchTranslationMemory,
} from "../dist/translation-memory/mod.js";
import { fixtureParallelDocument } from "./fixtures/documents.ts";

test("builds and searches local translation memory rows", () => {
	const tm = buildTranslationMemory([fixtureParallelDocument()], {
		id: "tm-fixture",
		metadata: { languagePair: "en-fr" },
	});
	const hits = searchTranslationMemory(tm, "Hello world.");
	assert.equal(tm.rows.length, 2);
	assert.equal(hits[0]?.matchKind, "exact");
	assert.equal(hits[0]?.targetText, "Bonjour monde.");
});

test("collapses duplicate translation-memory rows by default", () => {
	const pair = fixtureParallelDocument();
	const tm = buildTranslationMemory([pair, pair]);
	assert.equal(tm.rows.length, 2);
});
