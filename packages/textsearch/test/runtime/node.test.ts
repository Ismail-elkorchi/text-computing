import assert from "node:assert/strict";
import test from "node:test";

import { addToIndex, createIndex, search } from "../../dist/index.js";
import { fixtureDocuments } from "../fixtures/documents.ts";

test("node runtime imports final textsearch entrypoint", () => {
	const [doc] = fixtureDocuments();
	assert.notEqual(doc, undefined);
	const index = addToIndex(
		createIndex({
			fields: { body: { source: { kind: "view", viewId: "raw" } } },
		}),
		doc,
	);
	assert.equal(search(index, { kind: "term", term: "contract" }).length, 1);
});
