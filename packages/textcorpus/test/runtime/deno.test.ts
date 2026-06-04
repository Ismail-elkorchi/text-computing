import { corpusQuery, createCorpus } from "../../dist/index.js";

const evidence = {
	mode: "algorithm",
	exactness: "E1",
	producer: "runtime-smoke",
	packageName: "@ismail-elkorchi/textcorpus",
	packageVersion: "0.1.0",
	inputViewIds: ["raw"],
};

Deno.test("deno runtime imports final textcorpus entrypoint", () => {
	const doc = {
		id: "deno",
		sources: {
			source: {
				id: "source",
				text: "Deno corpus smoke",
				inputKind: "string",
				wellFormed: true,
			},
		},
		views: {
			raw: {
				id: "raw",
				kind: "raw",
				text: "Deno corpus smoke",
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
								span: { start: 0, end: 4, unit: "utf16-code-unit" },
							},
						],
						value: { index: 0, text: "Deno", lemma: "deno" },
						evidence,
					},
				},
			},
		},
		graphs: {},
		metadata: {},
	};
	const corpus = createCorpus([doc]);
	if (corpusQuery(corpus, { kind: "lemma", lemma: "deno" }).count !== 1) {
		throw new Error("deno smoke failed");
	}
});
