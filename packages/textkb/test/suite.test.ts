import assert from "node:assert/strict";
import test from "node:test";

import {
	annotateOntologyGazetteer,
	candidateConcepts,
	candidateEntities,
	candidateSenses,
	cohesionFeatures,
	createKnowledgeBase,
	disambiguateSense,
	lexicalChains,
	linkEntities,
	linkTerms,
	ontologyGazetteer,
	openEnglishWordNetFromPack,
	parseAliasRows,
	parseEntityRows,
	parseRelationRows,
	querySemanticRelations,
	scoreDisambiguation,
	thesaurusRelations,
	traverseSemanticRelations,
	wordNetResourcesFromPack,
} from "../dist/index.js";
import { badSpanDocument, fixtureDocument } from "./fixtures/documents.ts";
import { fixtureKb } from "./fixtures/kb.ts";

test("creates immutable knowledge bases and validates records", () => {
	const kb = fixtureKb();
	assert.equal(kb.id, "kb-demo");
	assert.equal(kb.entities.size, 2);
	assert.equal(kb.concepts.size, 2);
	assert.equal(kb.senses.size, 2);
	assert.ok(kb.aliases.keys.includes("acme"));
	assert.throws(
		() =>
			createKnowledgeBase({
				entities: [
					{ id: "Q1", labels: { en: ["A"] } },
					{ id: "Q1", labels: { en: ["B"] } },
				],
			}),
		/TEXTKB_DUPLICATE_ID/,
	);
	assert.throws(
		() =>
			createKnowledgeBase({
				metadata: { when: new Date() },
			}),
		/TEXTKB_JSON_VALUE/,
	);
	class Metadata {
		readonly source = "fixture";
	}
	assert.throws(
		() =>
			createKnowledgeBase({
				metadata: new Metadata(),
			}),
		/TEXTKB_JSON_VALUE/,
	);
	assert.throws(
		() =>
			createKnowledgeBase({
				entities: [{ id: "Q1", labels: { en: ["A"] } }],
				aliases: [{ alias: "missing", targetKind: "entity", targetId: "Q2" }],
			}),
		/TEXTKB_ALIAS_TARGET/,
	);
});

test("loads caller-provided rows without filesystem discovery", () => {
	const entities = parseEntityRows(
		["Q1\tlabel=Acme Corp\ttype=Organization", "Q2\tlabel=Paris\ttype=Place"],
		{ language: "en" },
	);
	const aliases = parseAliasRows(["Acme\tkb=Q1", "Paris\tkb=Q2"]);
	const relations = parseRelationRows(["Organization locatedIn Place"]);
	const kb = createKnowledgeBase({
		id: "rows",
		entities,
		aliases,
		relations,
		allowExternalRelationEndpoints: true,
	});
	assert.equal(kb.entities.records.Q1?.labels.en?.[0], "Acme Corp");
	assert.equal(candidateEntities(kb, "Acme")[0]?.entityId, "Q1");
	assert.equal(querySemanticRelations(kb, { type: "locatedIn" }).length, 1);
});

test("generates deterministic entity concept and sense candidates", () => {
	const kb = fixtureKb();
	assert.deepEqual(
		candidateEntities(kb, "Acme", {
			language: "en",
			contextText: "Acme signed a contract in Paris.",
		}).map((candidate) => [candidate.entityId, candidate.rank]),
		[["Q1", 1]],
	);
	assert.equal(
		candidateConcepts(kb, "agreement", {
			targetTypes: ["legal", "general"],
			corpusCounts: { C1: 9, C2: 1 },
		})[0]?.conceptId,
		"C1",
	);
	assert.equal(
		candidateSenses(kb, "contract", {
			pos: "noun",
			contextText: "The contract was signed.",
		})[0]?.senseId,
		"S1",
	);
	assert.equal(
		scoreDisambiguation({
			aliasScore: 1,
			prior: 0.5,
			contextOverlap: 0.25,
		}),
		1.175,
	);
});

test("Open English WordNet textpack resources become a runtime knowledge base", () => {
	const pack = {
		manifest: {
			resources: [
				{ id: "wordnet-en-lexical-entries", kind: "lexicon" as const },
				{ id: "wordnet-en-senses", kind: "knowledge-base" as const },
				{ id: "wordnet-en-synsets", kind: "knowledge-base" as const },
				{ id: "wordnet-en-relations", kind: "knowledge-base" as const },
				{ id: "wordnet-en-quality", kind: "quality-profile" as const },
			],
		},
		resources: {
			"wordnet-en-lexical-entries": [
				"entryId\tlemma\tpartOfSpeech",
				"oewn-contract-n\tcontract\tn",
				"oewn-agreement-n\tagreement\tn",
			].join("\n"),
			"wordnet-en-senses": [
				"senseId\tentryId\tlemma\tpartOfSpeech\tsynsetId\tsubcat",
				"oewn-contract__1\toewn-contract-n\tcontract\tn\toewn-synset-contract\t",
				"oewn-agreement__1\toewn-agreement-n\tagreement\tn\toewn-synset-agreement\t",
			].join("\n"),
			"wordnet-en-synsets": [
				"synsetId\tili\tpartOfSpeech\tlexfile\tmembers\tdefinition\texampleCount",
				"oewn-synset-contract\ti1\tn\tnoun.communication\toewn-contract-n\ta binding agreement\t0",
				"oewn-synset-agreement\ti2\tn\tnoun.communication\toewn-agreement-n\ta negotiated arrangement\t0",
			].join("\n"),
			"wordnet-en-relations": [
				"scope\tsourceId\trelType\ttargetId",
				"synset\toewn-synset-contract\thypernymy\toewn-synset-agreement",
			].join("\n"),
			"wordnet-en-quality": '{"acceptedRecords":6}',
		},
	};
	const resources = wordNetResourcesFromPack(pack);
	assert.equal(resources.synsets.length, 2);
	const kb = openEnglishWordNetFromPack(pack);
	assert.equal(kb.concepts.size, 2);
	assert.equal(candidateSenses(kb, "contract")[0]?.senseId, "oewn-contract__1");
	assert.equal(querySemanticRelations(kb, { type: "hypernymy" }).length, 1);
});

test("WordNet textpack adapter discovers non-English resource families", () => {
	const pack = {
		manifest: {
			resources: [
				{ id: "wordnet-ar-lexical-entries", kind: "lexicon" as const },
				{ id: "wordnet-ar-senses", kind: "knowledge-base" as const },
				{ id: "wordnet-ar-synsets", kind: "knowledge-base" as const },
				{ id: "wordnet-ar-relations", kind: "knowledge-base" as const },
				{ id: "wordnet-ar-quality", kind: "quality-profile" as const },
			],
		},
		resources: {
			"wordnet-ar-lexical-entries": [
				"entryId\tlemma\tpartOfSpeech",
				"awn-kitab-n\tkitab\tn",
			].join("\n"),
			"wordnet-ar-senses": [
				"senseId\tentryId\tlemma\tpartOfSpeech\tsynsetId\tsubcat",
				"awn-kitab__1\tawn-kitab-n\tkitab\tn\tawn-synset-kitab\t",
			].join("\n"),
			"wordnet-ar-synsets": [
				"synsetId\tili\tpartOfSpeech\tlexfile\tmembers\tdefinition\texampleCount",
				"awn-synset-kitab\ti1\tn\tnoun.communication\tawn-kitab-n\tbook\t0",
			].join("\n"),
			"wordnet-ar-relations": [
				"scope\tsourceId\trelType\ttargetId",
				"synset\tawn-synset-kitab\thypernymy\tawn-synset-object",
			].join("\n"),
			"wordnet-ar-quality": '{"acceptedRecords":4}',
		},
	};
	const resources = wordNetResourcesFromPack(pack);
	assert.equal(resources.lexicalEntries[0]?.entryId, "awn-kitab-n");
	assert.equal(resources.senses[0]?.synsetId, "awn-synset-kitab");
	assert.equal(resources.synsets[0]?.members[0], "awn-kitab-n");
	assert.equal(resources.relations[0]?.targetId, "awn-synset-object");
	assert.equal(resources.quality.acceptedRecords, 4);
});

test("links entities terms and senses while preserving source annotations", () => {
	const kb = fixtureKb();
	const doc = fixtureDocument();
	const linkedEntities = linkEntities(doc, kb, {
		sourceLayerIds: ["entity.mention"],
		mentionSource: "annotations",
		keepAlternatives: true,
	});
	assert.notEqual(linkedEntities, doc);
	assert.equal(
		linkedEntities.layers["entity.mention"]?.annotations["ent-acme"]?.features
			?.source,
		"fixture",
	);
	assert.equal(
		linkedEntities.layers["entity.mention"]?.annotations["ent-acme"]
			?.alternatives?.length,
		1,
	);
	const entityLinks = Object.values(
		linkedEntities.layers["link.entity"]?.annotations ?? {},
	);
	assert.equal(entityLinks.length, 1);
	assert.equal(entityLinks[0]?.evidence.mode, "kb");
	assert.equal((entityLinks[0]?.value as { entityId?: string }).entityId, "Q1");

	const linkedTerms = linkTerms(linkedEntities, kb, {
		sourceLayerIds: ["term.candidate"],
		mentionSource: "annotations",
	});
	const termLinks = Object.values(
		linkedTerms.layers["term.link"]?.annotations ?? {},
	);
	assert.equal(termLinks.length, 1);
	assert.equal((termLinks[0]?.value as { conceptId?: string }).conceptId, "C1");

	const linkedSenses = disambiguateSense(linkedTerms, kb, {
		tokenLayerIds: ["token.word"],
		language: "en",
	});
	const senseLinks = Object.values(
		linkedSenses.layers["sense.link"]?.annotations ?? {},
	);
	assert.ok(
		senseLinks.some(
			(annotation) =>
				(annotation.value as { senseId?: string }).senseId === "S1",
		),
	);
});

test("rejects non-UTF-16 spans before slicing text", () => {
	assert.throws(
		() =>
			linkEntities(badSpanDocument(), fixtureKb(), {
				sourceLayerIds: ["entity.mention"],
			}),
		/TEXTKB_SPAN_UNIT/,
	);
});

test("queries relations ontology gazetteers thesaurus and cohesion features", () => {
	const kb = fixtureKb();
	assert.equal(
		querySemanticRelations(kb, { sourceId: "Q1", type: "locatedIn" })[0]
			?.targetId,
		"Q2",
	);
	assert.equal(
		traverseSemanticRelations(kb, "C1", {
			types: ["equivalent-concept"],
			maxDepth: 1,
		})[0]?.endId,
		"C2",
	);
	assert.equal(thesaurusRelations(kb, "C1").length, 2);
	const matches = ontologyGazetteer(fixtureDocument(), kb, {
		targetTypes: ["Organization"],
	});
	assert.equal(matches[0]?.targetId, "Q1");
	const gazetteerDoc = annotateOntologyGazetteer(fixtureDocument(), kb, {
		targetTypes: ["Place"],
	});
	assert.equal(
		Object.values(gazetteerDoc.layers["kb.gazetteer"]?.annotations ?? {})
			.length,
		1,
	);
	const chains = lexicalChains(kb, ["C1", "C2"], {
		relationTypes: ["related-term", "equivalent-concept"],
	});
	assert.equal(chains.length, 1);
	assert.deepEqual(cohesionFeatures(chains), {
		chainCount: 1,
		cohesionScore: 1,
		maxChainLength: 2,
		meanChainLength: 2,
		memberCount: 2,
	});
});
