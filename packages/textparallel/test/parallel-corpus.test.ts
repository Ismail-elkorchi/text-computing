import assert from "node:assert/strict";
import test from "node:test";

import {
	createParallelCorpus,
	parallelDocumentsFromRecords,
} from "../dist/parallel-corpus/mod.js";
import { fixtureParallelDocument } from "./fixtures/documents.ts";

test("rejects duplicate parallel document ids", () => {
	const pair = fixtureParallelDocument();
	assert.throws(
		() => createParallelCorpus([pair, pair]),
		/TEXTPARALLEL_DUPLICATE_DOC/,
	);
});

test("converts structural textdata parallel records", () => {
	const docs = parallelDocumentsFromRecords([
		{
			id: "record-1",
			sourceText: "One.",
			targetText: "Un.",
			sourceLanguage: "en",
			targetLanguage: "fr",
			alignments: [
				{
					id: "a1",
					source: {
						viewId: "raw",
						span: { start: 0, end: 4, unit: "utf16-code-unit" },
					},
					target: {
						viewId: "raw",
						span: { start: 0, end: 3, unit: "utf16-code-unit" },
					},
					relation: "equivalent",
					confidence: 0.9,
				},
			],
			metadata: { source: "fixture" },
		},
	]);
	assert.equal(docs.length, 1);
	assert.equal(docs[0]?.links[0]?.score?.kind, "probability");
	assert.equal(docs[0]?.sourceDoc.metadata.language, "en");
});
