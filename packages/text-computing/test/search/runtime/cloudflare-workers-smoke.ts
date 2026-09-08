import type { TextDocument } from "@ismail-elkorchi/text-computing/document";
import {
	addToIndex,
	createIndex,
	search,
} from "@ismail-elkorchi/text-computing/search";

const doc: TextDocument = {
	id: "workers",
	sources: {
		source: {
			id: "source",
			text: "Workers search smoke",
			inputKind: "string",
			wellFormed: true,
		},
	},
	views: {
		raw: {
			id: "raw",
			kind: "raw",
			text: "Workers search smoke",
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

if (search(index, { kind: "term", term: "workers" }).length !== 1) {
	throw new Error("workers smoke failed");
}
