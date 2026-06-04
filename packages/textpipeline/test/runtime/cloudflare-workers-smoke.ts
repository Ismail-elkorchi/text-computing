import { createPipeline, planPipeline } from "../../dist/index.js";

const pipeline = createPipeline([
	{
		id: "worker",
		version: "1.0.0",
		provides: [{ viewKind: "raw" }],
		process(document) {
			return document;
		},
	},
]);

if (planPipeline(pipeline).processorOrder[0] !== "worker") {
	throw new Error("worker smoke failed");
}
