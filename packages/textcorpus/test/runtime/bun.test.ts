import { expect, test } from "bun:test";
import { corpusQuery, createCorpus } from "../../dist/index.js";

test("bun runtime imports final textcorpus entrypoint", () => {
	const doc = {
		id: "bun",
		sources: {
			source: {
				id: "source",
				text: "Bun corpus smoke",
				inputKind: "string",
				wellFormed: true,
			},
		},
		views: {
			raw: {
				id: "raw",
				kind: "raw",
				text: "Bun corpus smoke",
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
								span: { start: 0, end: 3, unit: "utf16-code-unit" },
							},
						],
						value: { index: 0, text: "Bun", lemma: "bun" },
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
	expect(corpusQuery(corpus, { kind: "lemma", lemma: "bun" }).count).toBe(1);
});
