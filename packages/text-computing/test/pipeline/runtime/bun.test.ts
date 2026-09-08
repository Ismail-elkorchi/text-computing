import { expect, test } from "bun:test";
import {
	createPipeline,
	planPipeline,
} from "@ismail-elkorchi/text-computing/pipeline";

test("bun imports textpipeline", () => {
	const pipeline = createPipeline([
		{
			id: "bun",
			version: "1.0.0",
			provides: [{ viewKind: "raw" }],
			process(document) {
				return document;
			},
		},
	]);
	expect(planPipeline(pipeline).processorOrder).toEqual(["bun"]);
});
