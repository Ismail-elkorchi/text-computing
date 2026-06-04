import { addToIndex, createIndex, search } from "../../dist/index.js";

Deno.test("deno runtime imports final textsearch entrypoint", () => {
	const doc = {
		id: "deno",
		sources: {
			source: {
				id: "source",
				text: "Deno search smoke",
				inputKind: "string",
				wellFormed: true,
			},
		},
		views: {
			raw: {
				id: "raw",
				kind: "raw",
				text: "Deno search smoke",
				transform: { kind: "raw-input", producer: "runtime-smoke" },
			},
		},
		spanMaps: {},
		layers: {},
		graphs: {},
		metadata: {},
	};
	const index = addToIndex(
		createIndex({
			fields: { body: { source: { kind: "view", viewId: "raw" } } },
		}),
		doc,
	);
	if (search(index, { kind: "term", term: "deno" }).length !== 1) {
		throw new Error("deno smoke failed");
	}
});
