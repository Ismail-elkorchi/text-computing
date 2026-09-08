import type { StructuralTextCorpus } from "@ismail-elkorchi/text-computing/quality";

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
