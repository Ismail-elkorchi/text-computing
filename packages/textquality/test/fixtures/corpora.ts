import type { StructuralTextCorpus } from "../../dist/index.js";

export function fixtureCorpus(): StructuralTextCorpus {
	return {
		id: "corpus-quality",
		documents: [
			{ id: "a", metadata: { language: "en", domain: "legal" } },
			{ id: "b", metadata: { language: "en" } },
			{ id: "b", metadata: { language: "en", domain: "legal" } },
		],
		indexes: {},
		metadata: { source: "fixture" },
	};
}
