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
	knowledgeBaseFromPack,
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

async function sha256(text: string): Promise<string> {
	const bytes = new TextEncoder().encode(text);
	const digest = await crypto.subtle.digest("SHA-256", bytes);
	return [...new Uint8Array(digest)]
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("");
}

async function fileBackedTextResource(path: string, text: string) {
	return {
		kind: "file-backed-resource",
		packageName: "@ismail-elkorchi/textpack-kb-test",
		packageRoot: "file:///fixture/",
		path,
		encoding: "utf8",
		checksum: `sha256:${await sha256(text)}`,
		byteLength: new TextEncoder().encode(text).byteLength,
	} as const;
}

function textResourceReader(records: Readonly<Record<string, string>>) {
	return {
		readText({
			descriptor,
		}: {
			readonly descriptor: { readonly path: string };
		}): string {
			const text = records[descriptor.path];
			if (text === undefined) {
				throw new Error(`missing fixture resource ${descriptor.path}`);
			}
			return text;
		},
	};
}

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

test("canonical WordNet textpack resources become a runtime knowledge base", async () => {
	const pack = {
		manifest: {
			resources: [
				{
					id: "wordnet-en-senses",
					kind: "knowledge-base" as const,
					format: "tsv",
					schemaId: "textkb.knowledge-base.rows.v1",
				},
				{
					id: "wordnet-en-synsets",
					kind: "knowledge-base" as const,
					format: "tsv",
					schemaId: "textkb.knowledge-base.rows.v1",
				},
				{
					id: "wordnet-en-relations",
					kind: "knowledge-base" as const,
					format: "tsv",
					schemaId: "textkb.knowledge-base.rows.v1",
				},
				{
					id: "wordnet-en-kb-canonical",
					kind: "knowledge-base" as const,
					format: "json",
					schemaId: "textkb.knowledge-base.v1",
				},
			],
		},
		resources: {
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
				"scope\tsourceId\tpredicateId\ttargetId",
				"synset\toewn-synset-contract\thypernymy\toewn-synset-agreement",
			].join("\n"),
			"wordnet-en-kb-canonical": JSON.stringify({
				schemaVersion: "1",
				kind: "knowledge-base",
				kbId: "wordnet-en-kb",
				languageTags: ["en"],
				resourceRefs: [
					{ resourceId: "wordnet-en-senses", role: "senses" },
					{ resourceId: "wordnet-en-synsets", role: "synsets" },
					{ resourceId: "wordnet-en-relations", role: "relations" },
				],
			}),
		},
	};
	const kb = await knowledgeBaseFromPack(pack as never);
	assert.equal(kb.concepts.size, 2);
	assert.equal(candidateSenses(kb, "contract")[0]?.senseId, "oewn-contract__1");
	assert.equal(querySemanticRelations(kb, { type: "hypernymy" }).length, 1);
});

test("canonical WordNet loader is language-neutral", async () => {
	const pack = {
		manifest: {
			resources: [
				{
					id: "wordnet-ar-senses",
					kind: "knowledge-base" as const,
					format: "tsv",
					schemaId: "textkb.knowledge-base.rows.v1",
				},
				{
					id: "wordnet-ar-synsets",
					kind: "knowledge-base" as const,
					format: "tsv",
					schemaId: "textkb.knowledge-base.rows.v1",
				},
				{
					id: "wordnet-ar-relations",
					kind: "knowledge-base" as const,
					format: "tsv",
					schemaId: "textkb.knowledge-base.rows.v1",
				},
				{
					id: "wordnet-ar-kb-canonical",
					kind: "knowledge-base" as const,
					format: "json",
					schemaId: "textkb.knowledge-base.v1",
				},
			],
		},
		resources: {
			"wordnet-ar-senses": [
				"senseId\tentryId\tlemma\tpartOfSpeech\tsynsetId\tsubcat",
				"awn-kitab__1\tawn-kitab-n\tkitab\tn\tawn-synset-kitab\t",
			].join("\n"),
			"wordnet-ar-synsets": [
				"synsetId\tili\tpartOfSpeech\tlexfile\tmembers\tdefinition\texampleCount",
				"awn-synset-kitab\ti1\tn\tnoun.communication\tawn-kitab-n\tbook\t0",
			].join("\n"),
			"wordnet-ar-relations": [
				"scope\tsourceId\tpredicateId\ttargetId",
				"synset\tawn-synset-kitab\thypernymy\tawn-synset-object",
			].join("\n"),
			"wordnet-ar-kb-canonical": JSON.stringify({
				schemaVersion: "1",
				kind: "knowledge-base",
				kbId: "wordnet-ar-kb",
				languageTags: ["ar"],
				resourceRefs: [
					{ resourceId: "wordnet-ar-senses", role: "senses" },
					{ resourceId: "wordnet-ar-synsets", role: "synsets" },
					{ resourceId: "wordnet-ar-relations", role: "relations" },
				],
			}),
		},
	};
	const kb = await knowledgeBaseFromPack(pack as never);
	assert.equal(kb.senses.records["awn-kitab__1"]?.language, "ar");
	assert.equal(
		kb.concepts.records["awn-synset-kitab"]?.labels.ar?.[0],
		"kitab",
	);
	assert.equal(querySemanticRelations(kb, { type: "hypernymy" }).length, 1);
});

test("canonical KB textpack loader materializes file-backed resources", async () => {
	const resourceTexts = {
		"resources/wordnet-en-senses.tsv": [
			"senseId\tentryId\tlemma\tpartOfSpeech\tsynsetId\tsubcat",
			"oewn-contract__1\toewn-contract-n\tcontract\tn\toewn-synset-contract\t",
		].join("\n"),
		"resources/wordnet-en-synsets.tsv": [
			"synsetId\tili\tpartOfSpeech\tlexfile\tmembers\tdefinition\texampleCount",
			"oewn-synset-contract\ti1\tn\tnoun.communication\toewn-contract-n\ta binding agreement\t0",
		].join("\n"),
		"resources/wordnet-en-relations.tsv": [
			"scope\tsourceId\tpredicateId\ttargetId",
			"synset\toewn-synset-contract\thypernymy\toewn-synset-agreement",
		].join("\n"),
		"resources/wordnet-en-kb.json": JSON.stringify({
			schemaVersion: "1",
			kind: "knowledge-base",
			kbId: "wordnet-en-kb",
			languageTags: ["en"],
			resourceRefs: [
				{ resourceId: "wordnet-en-senses", role: "senses" },
				{ resourceId: "wordnet-en-synsets", role: "synsets" },
				{ resourceId: "wordnet-en-relations", role: "relations" },
			],
		}),
	};
	const pack = {
		manifest: {
			resources: [
				{
					id: "wordnet-en-senses",
					kind: "knowledge-base" as const,
					format: "tsv",
					schemaId: "textkb.knowledge-base.rows.v1",
				},
				{
					id: "wordnet-en-synsets",
					kind: "knowledge-base" as const,
					format: "tsv",
					schemaId: "textkb.knowledge-base.rows.v1",
				},
				{
					id: "wordnet-en-relations",
					kind: "knowledge-base" as const,
					format: "tsv",
					schemaId: "textkb.knowledge-base.rows.v1",
				},
				{
					id: "wordnet-en-kb-canonical",
					kind: "knowledge-base" as const,
					format: "json",
					schemaId: "textkb.knowledge-base.v1",
				},
			],
		},
		resources: {
			"wordnet-en-senses": await fileBackedTextResource(
				"resources/wordnet-en-senses.tsv",
				resourceTexts["resources/wordnet-en-senses.tsv"],
			),
			"wordnet-en-synsets": await fileBackedTextResource(
				"resources/wordnet-en-synsets.tsv",
				resourceTexts["resources/wordnet-en-synsets.tsv"],
			),
			"wordnet-en-relations": await fileBackedTextResource(
				"resources/wordnet-en-relations.tsv",
				resourceTexts["resources/wordnet-en-relations.tsv"],
			),
			"wordnet-en-kb-canonical": await fileBackedTextResource(
				"resources/wordnet-en-kb.json",
				resourceTexts["resources/wordnet-en-kb.json"],
			),
		},
	};
	const reader = textResourceReader(resourceTexts);
	const kb = await knowledgeBaseFromPack(pack as never, { reader });
	assert.equal(candidateSenses(kb, "contract")[0]?.senseId, "oewn-contract__1");
});

test("canonical Wikidata textpack resources become a runtime knowledge base", async () => {
	const resourceTexts = {
		"resources/wikidata-fr-entities.tsv": [
			"entityId\tlanguageTag\tlabel\tdescription\ttypeId\ttypeLabel\tsitelinks\twikiUrl",
			"Q90\tfr\tParis\tcapitale de la France\tQ515\tville\t120\thttps://fr.wikipedia.org/wiki/Paris",
		].join("\n"),
		"resources/wikidata-fr-aliases.tsv":
			"entityId\tlanguageTag\talias\nQ90\tfr\tVille de Paris\n",
		"resources/wikidata-fr-relations.tsv":
			"sourceId\tpredicateId\ttargetId\trelationLabel\nQ90\tP31\tQ515\tinstance de\n",
		"resources/wikidata-fr-kb-canonical.json": JSON.stringify({
			schemaVersion: "1",
			kind: "knowledge-base",
			kbId: "wikidata-fr-kb",
			languageTags: ["fr"],
			resourceRefs: [
				{ resourceId: "wikidata-fr-entities", role: "entities" },
				{ resourceId: "wikidata-fr-aliases", role: "aliases" },
				{ resourceId: "wikidata-fr-relations", role: "relations" },
			],
		}),
	};
	const pack = {
		manifest: {
			resources: [
				{
					id: "wikidata-fr-entities",
					kind: "knowledge-base" as const,
					format: "tsv",
					schemaId: "textkb.knowledge-base.rows.v1",
				},
				{
					id: "wikidata-fr-aliases",
					kind: "knowledge-base" as const,
					format: "tsv",
					schemaId: "textkb.knowledge-base.rows.v1",
				},
				{
					id: "wikidata-fr-relations",
					kind: "knowledge-base" as const,
					format: "tsv",
					schemaId: "textkb.knowledge-base.rows.v1",
				},
				{
					id: "wikidata-fr-kb-canonical",
					kind: "knowledge-base" as const,
					format: "json",
					schemaId: "textkb.knowledge-base.v1",
				},
			],
		},
		resources: {
			"wikidata-fr-aliases": await fileBackedTextResource(
				"resources/wikidata-fr-aliases.tsv",
				resourceTexts["resources/wikidata-fr-aliases.tsv"],
			),
			"wikidata-fr-entities": await fileBackedTextResource(
				"resources/wikidata-fr-entities.tsv",
				resourceTexts["resources/wikidata-fr-entities.tsv"],
			),
			"wikidata-fr-kb-canonical": await fileBackedTextResource(
				"resources/wikidata-fr-kb-canonical.json",
				resourceTexts["resources/wikidata-fr-kb-canonical.json"],
			),
			"wikidata-fr-relations": await fileBackedTextResource(
				"resources/wikidata-fr-relations.tsv",
				resourceTexts["resources/wikidata-fr-relations.tsv"],
			),
		},
	};
	const kb = await knowledgeBaseFromPack(pack as never, {
		reader: textResourceReader(resourceTexts),
	});
	assert.equal(kb.entities.records.Q90?.labels.fr?.[0], "Paris");
	assert.equal(candidateEntities(kb, "Ville de Paris")[0]?.entityId, "Q90");
	assert.equal(querySemanticRelations(kb, { type: "P31" }).length, 1);
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
