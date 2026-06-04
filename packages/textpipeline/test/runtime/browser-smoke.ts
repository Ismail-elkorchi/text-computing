import { createPipeline, planPipeline } from "../../dist/index.js";

const pipeline = createPipeline([
	{
		id: "browser",
		version: "1.0.0",
		provides: [{ viewKind: "raw" }],
		process(document) {
			return document;
		},
	},
]);

if (!planPipeline(pipeline).ok) {
	throw new Error("browser smoke failed");
}
