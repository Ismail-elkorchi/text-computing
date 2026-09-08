import assert from "node:assert/strict";
import { createDocument } from "@ismail-elkorchi/text-computing/document";
import {
	createPipeline,
	runPipeline,
} from "@ismail-elkorchi/text-computing/pipeline";

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
