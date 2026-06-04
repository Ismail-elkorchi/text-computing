import { assertEquals } from "jsr:@std/assert";
import { createPipeline, planPipeline } from "../../dist/index.js";

Deno.test("deno imports textpipeline", () => {
	const pipeline = createPipeline([
		{
			id: "deno",
			version: "1.0.0",
			provides: [{ viewKind: "raw" }],
			process(document) {
				return document;
			},
		},
	]);

	assertEquals(planPipeline(pipeline).processorOrder, ["deno"]);
});
