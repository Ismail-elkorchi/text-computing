import assert from "node:assert/strict";
import test from "node:test";
import {
	createNodeResourceReader,
	load,
} from "@ismail-elkorchi/text-computing/node";
import en from "@ismail-elkorchi/textpack-en";

test("English consumer workflow uses only the SDK plus textpack-en", async () => {
	const nlp = await load(en, { reader: createNodeResourceReader() });
	const text = "The French Republic recognizes France.";
	const doc = await nlp(text, {
		entityMaxCandidates: 2,
		lexiconMaxResults: 3,
		morphologyMaxResults: 3,
		quality: { maxFindings: 4 },
	});

	assert.equal(nlp.languageTag, "en");
	assert.equal(nlp.support().packageName, "@ismail-elkorchi/textpack-en");
	assert.equal(doc.languageTag, "en");
	assert.ok(doc.sentences.length > 0);
	assert.ok(doc.tokens.length > 0);
	assert.ok(doc.lexicalUnits.length > 0);
	assert.ok(doc.searchTokens.length > 0);
	assert.ok(doc.evidence.some((item) => item.task === "quality"));

	const normalized = await nlp.normalize(text);
	assert.ok(normalized.length > 0);
	const normalizedView = await nlp.normalization.normalizeDocument(
		doc.toTextDoc(),
	);
	assert.ok(normalizedView.view.text.length > 0);
	assert.equal(normalizedView.spanMap.targetViewId, normalizedView.view.id);

	const lexicalMatches = await nlp.lookup("recognize", { maxResults: 3 });
	assert.ok(lexicalMatches.length > 0);
	const analyses = await nlp.morphology.analyze("recognizes", {
		maxResults: 3,
	});
	assert.ok(analyses.some((analysis) => analysis.lemma === "recognize"));
	const generations = await nlp.morphology.generate("recognize", undefined, {
		maxResults: 3,
	});
	assert.ok(generations.some((generation) => generation.form === "recognize"));

	const entities = await nlp.kb.candidates("France", { maxCandidates: 2 });
	assert.ok(entities.some((entity) => entity.label === "France"));
	const index = await nlp.search.indexAnalysis(doc);
	assert.equal(index.stats.documentCount, 1);

	assert.equal(nlp.corpus.resources().length, 0);
	assert.equal(nlp.parallel.resources().length, 0);

	const quality = await nlp.quality.analyzeDocument(doc.toTextDoc(), {
		maxFindings: 4,
	});
	assert.ok(quality.id.length > 0);
	assert.ok(nlp.inspect().resources.length > 0);
});
