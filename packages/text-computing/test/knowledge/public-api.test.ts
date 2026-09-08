import assert from "node:assert/strict";
import test from "node:test";
import * as api from "@ismail-elkorchi/text-computing/knowledge";
import * as disambiguate from "@ismail-elkorchi/text-computing/knowledge/disambiguate";
import * as entity from "@ismail-elkorchi/text-computing/knowledge/entity";
import * as kb from "@ismail-elkorchi/text-computing/knowledge/kb";
import * as link from "@ismail-elkorchi/text-computing/knowledge/link";
import * as ontology from "@ismail-elkorchi/text-computing/knowledge/ontology";
import * as semanticRelations from "@ismail-elkorchi/text-computing/knowledge/semantic-relations";
import * as sense from "@ismail-elkorchi/text-computing/knowledge/sense";
import * as term from "@ismail-elkorchi/text-computing/knowledge/term";
import * as textpack from "@ismail-elkorchi/text-computing/knowledge/textpack";
import * as thesaurus from "@ismail-elkorchi/text-computing/knowledge/thesaurus";

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
