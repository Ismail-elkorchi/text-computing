import { expect, test } from "bun:test";
import { addToIndex, createIndex, search } from "../../dist/index.js";

test("bun runtime imports final textsearch entrypoint", () => {
	const doc = {
		id: "bun",
		sources: {
			source: {
				id: "source",
				text: "Bun search smoke",
				inputKind: "string",
				wellFormed: true,
			},
		},
		views: {
			raw: {
				id: "raw",
				kind: "raw",
				text: "Bun search smoke",
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
	expect(search(index, { kind: "term", term: "bun" }).length).toBe(1);
});
