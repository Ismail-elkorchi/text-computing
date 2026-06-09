import type { TextDocument } from "@ismail-elkorchi/textdoc";
import {
	candidateEntities,
	createKnowledgeBase,
	disambiguateSense,
	type EntityCandidate,
	type KnowledgeBase,
	linkEntities,
	linkTerms,
	openEnglishWordNetFromPack,
	type SemanticRelation,
	type WordNetPackResources,
} from "../../dist/index.js";
import { fixtureDocument } from "../fixtures/documents.ts";

const relation: SemanticRelation = {
	sourceId: "Q1",
	targetId: "C1",
	type: "instance-of",
	sourceKind: "entity",
	targetKind: "concept",
};

const kb: KnowledgeBase = createKnowledgeBase({
	entities: [{ id: "Q1", labels: { en: ["Acme"] } }],
	concepts: [{ id: "C1", labels: { en: ["Company"] } }],
	relations: [relation],
});

const candidates: EntityCandidate[] = candidateEntities(kb, "Acme");

const doc: TextDocument = fixtureDocument();
const linkedEntities: TextDocument = linkEntities(doc, kb);
const linkedTerms: TextDocument = linkTerms(linkedEntities, kb);
const linkedSenses: TextDocument = disambiguateSense(linkedTerms, kb);
const wordNetResources: WordNetPackResources = {
	lexicalEntries: [],
	senses: [],
	synsets: [],
	relations: [],
	quality: {},
};

void candidates;
void linkedSenses;
void openEnglishWordNetFromPack;
void wordNetResources;
