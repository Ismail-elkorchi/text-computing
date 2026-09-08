import type { TextDocument } from "@ismail-elkorchi/text-computing/document";
import {
	addToIndex,
	createIndex,
	search,
} from "@ismail-elkorchi/text-computing/search";

const doc: TextDocument = {
	id: "browser",
	sources: {
		source: {
			id: "source",
			text: "Browser search smoke",
			inputKind: "string",
			wellFormed: true,
		},
	},
	views: {
		raw: {
			id: "raw",
			kind: "raw",
			text: "Browser search smoke",
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

if (search(index, { kind: "term", term: "browser" }).length !== 1) {
	throw new Error("browser smoke failed");
}
