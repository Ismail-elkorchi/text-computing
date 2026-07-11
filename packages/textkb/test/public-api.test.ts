import assert from "node:assert/strict";
import test from "node:test";

import * as disambiguate from "../dist/disambiguate/mod.js";
import * as entity from "../dist/entity/mod.js";
import * as api from "../dist/index.js";
import * as kb from "../dist/kb/mod.js";
import * as link from "../dist/link/mod.js";
import * as ontology from "../dist/ontology/mod.js";
import * as semanticRelations from "../dist/semantic-relations/mod.js";
import * as sense from "../dist/sense/mod.js";
import * as term from "../dist/term/mod.js";
import * as textpack from "../dist/textpack.js";
import * as thesaurus from "../dist/thesaurus/mod.js";

test("root exports the final textkb API only", () => {
	assert.deepEqual(
		Object.keys(api).sort(),
		[
			"TextKbError",
			"annotateOntologyGazetteer",
			"assertJsonObject",
			"assertJsonValue",
			"buildAliasIndex",
			"candidateConcepts",
			"candidateEntities",
			"candidateEntitiesFromPack",
			"candidateSenses",
			"cohesionFeatures",
			"createConceptRecordStore",
			"createEntityRecordStore",
			"createKnowledgeBase",
			"createSemanticRelationStore",
			"createSenseRecordStore",
			"disambiguateSense",
			"entityLinkerFromPack",
			"explainCandidate",
			"explainRelationPath",
			"lexicalChains",
			"linkEntities",
			"linkTerms",
			"knowledgeBaseFromPack",
			"knowledgeBaseMentionKeyLengthsFromPack",
			"knowledgeBaseSliceFromPack",
			"normalizeKnowledgeBaseMention",
			"ontologyGazetteer",
			"packageName",
			"parseAliasRows",
			"parseEntityRows",
			"parseRelationRows",
			"querySemanticRelations",
			"scoreDisambiguation",
			"scoreValue",
			"standardSemanticRelationTypes",
			"thesaurusRelations",
			"traverseSemanticRelations",
		].sort(),
	);
});

test("required final subpaths are importable", () => {
	assert.equal(typeof kb.createKnowledgeBase, "function");
	assert.equal(typeof entity.candidateEntities, "function");
	assert.equal(typeof sense.disambiguateSense, "function");
	assert.equal(typeof term.linkTerms, "function");
	assert.equal(typeof ontology.ontologyGazetteer, "function");
	assert.equal(typeof thesaurus.lexicalChains, "function");
	assert.equal(typeof link.linkEntities, "function");
	assert.equal(typeof disambiguate.scoreDisambiguation, "function");
	assert.equal(typeof semanticRelations.querySemanticRelations, "function");
	assert.equal(typeof textpack.knowledgeBaseFromPack, "function");
});
