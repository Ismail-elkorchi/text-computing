import assert from "node:assert/strict";
import { createDocument } from "@ismail-elkorchi/textdoc";
import { createPipeline, runPipeline } from "../../dist/index.js";

const pipeline = createPipeline([
	{
		id: "identity",
		version: "1.0.0",
		provides: [{ viewKind: "raw" }],
		process(document) {
			return document;
		},
	},
]);

const result = await runPipeline(
	pipeline,
	createDocument("node", { id: "node" }),
);
assert.equal(result.id, "node");
