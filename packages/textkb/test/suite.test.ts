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
	parseAliasRows,
	parseEntityRows,
	parseRelationRows,
	querySemanticRelations,
	scoreDisambiguation,
	thesaurusRelations,
	traverseSemanticRelations,
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
