import { corpusQuery, createCorpus } from "../../dist/index.js";

const doc = {
	id: "browser",
	sources: {
		source: {
			id: "source",
			text: "Browser corpus smoke",
			inputKind: "string",
			wellFormed: true,
		},
	},
	views: {
		raw: {
			id: "raw",
			kind: "raw",
			text: "Browser corpus smoke",
			transform: { kind: "raw-input", producer: "runtime-smoke" },
		},
	},
	spanMaps: {},
	layers: {
		tokens: {
			id: "tokens",
			type: "token.word",
			viewId: "raw",
			annotations: {
				"tok-0": {
					id: "tok-0",
					layer: "tokens",
					type: "token.word",
					spans: [
						{
							viewId: "raw",
							span: { start: 0, end: 7, unit: "utf16-code-unit" },
						},
					],
					value: { index: 0, text: "Browser", lemma: "browser" },
					evidence: {
						mode: "algorithm",
						exactness: "E1",
						producer: "runtime-smoke",
						packageName: "@ismail-elkorchi/textcorpus",
						packageVersion: "0.1.0",
						inputViewIds: ["raw"],
					},
				},
			},
		},
	},
	graphs: {},
	metadata: {},
};

const corpus = createCorpus([doc]);
if (corpusQuery(corpus, { kind: "lemma", lemma: "browser" }).count !== 1) {
	throw new Error("browser smoke failed");
}
