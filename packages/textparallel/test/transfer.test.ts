import assert from "node:assert/strict";
import test from "node:test";

import { shallowTransfer } from "../dist/transfer/mod.js";
import { fixtureDictionary, sourceDocument } from "./fixtures/documents.ts";

test("adds shallow transfer view and annotation from explicit resources", () => {
	const transferred = shallowTransfer(
		sourceDocument(),
		{
			dictionaries: fixtureDictionary,
		},
		{ output: "both" },
	);
	assert.equal(
		transferred.views["translation.transfer"]?.text,
		"Bonjour monde. Bon jour.",
	);
	assert.equal(
		transferred.views["translation.transfer"]?.spanMapId,
		"translation.transfer.span-map",
	);
	assert.ok(transferred.layers["translation.transfer"]);
	assert.ok(transferred.spanMaps["translation.transfer.span-map"]);
});

test("keeps transfer resources JSON-safe", () => {
	assert.throws(
		() =>
			shallowTransfer(sourceDocument(), {
				metadata: { created: new Date("2020-01-01T00:00:00Z") },
			}),
		/TEXTPARALLEL_JSON_VALUE/,
	);
});
