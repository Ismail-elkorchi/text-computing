import type { KnowledgeBase } from "../../dist/index.js";
import { createKnowledgeBase } from "../../dist/index.js";

export function fixtureKb(): KnowledgeBase {
	return createKnowledgeBase({
		id: "kb-demo",
		metadata: { source: "fixture" },
		entities: [
			{
				id: "Q1",
				labels: { en: ["Acme Corp"] },
				aliases: { en: ["Acme"] },
				types: ["Organization"],
				descriptions: { en: "A company that signs contracts in Paris." },
				priors: { default: 0.7 },
			},
			{
				id: "Q2",
				labels: { en: ["Paris"] },
				types: ["Place"],
				descriptions: { en: "A place and city." },
				priors: { default: 0.6 },
			},
		],
		concepts: [
			{
				id: "C1",
				labels: { en: ["contract"] },
				aliases: { en: ["agreement"] },
				definitions: { en: "A legal agreement." },
				domains: ["legal"],
				priors: { default: 0.8 },
			},
			{
				id: "C2",
				labels: { en: ["agreement"] },
				aliases: { en: ["contractual agreement"] },
				definitions: { en: "A shared understanding." },
				domains: ["general"],
				priors: { default: 0.3 },
			},
		],
		senses: [
			{
				id: "S1",
				lemma: "contract",
				pos: "noun",
				language: "en",
				definition: "A legal agreement between parties.",
				examples: ["The contract was signed."],
				priors: { default: 0.9 },
			},
			{
				id: "S2",
				lemma: "contract",
				pos: "verb",
				language: "en",
				definition: "To become smaller.",
				examples: ["The material can contract."],
				priors: { default: 0.2 },
			},
		],
		relations: [
			{
				id: "r-q1-q2",
				sourceId: "Q1",
				targetId: "Q2",
				type: "locatedIn",
				sourceKind: "entity",
				targetKind: "entity",
			},
			{
				id: "r-c1-c2",
				sourceId: "C1",
				targetId: "C2",
				type: "equivalent-concept",
				sourceKind: "concept",
				targetKind: "concept",
			},
			{
				id: "r-c1-c2-related",
				sourceId: "C1",
				targetId: "C2",
				type: "related-term",
				sourceKind: "concept",
				targetKind: "concept",
			},
			{
				id: "r-org-place",
				sourceId: "Organization",
				targetId: "Place",
				type: "locatedIn",
				sourceKind: "type",
				targetKind: "type",
			},
		],
	});
}
