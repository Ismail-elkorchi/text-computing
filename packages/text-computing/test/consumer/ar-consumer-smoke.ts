import assert from "node:assert/strict";
import test from "node:test";
import {
	createNodeResourceReader,
	load,
} from "@ismail-elkorchi/text-computing/node";
import ar from "@ismail-elkorchi/textpack-ar";

test("Arabic consumer workflow uses only the SDK plus textpack-ar", async () => {
	const nlp = await load(ar, { reader: createNodeResourceReader() });
	const text = "تعترف فرنسا باللغة العربية.";
	const doc = await nlp(text, {
		preset: "full",
		entityMaxCandidates: 2,
		lexiconMaxResults: 3,
		morphologyMaxResults: 3,
		quality: { maxFindings: 4 },
	});

	assert.equal(nlp.languageTag, "ar");
	assert.equal(nlp.support().packageName, "@ismail-elkorchi/textpack-ar");
	assert.equal(doc.languageTag, "ar");
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

	const lexicalMatches = await nlp.lookup("فرنسا", { maxResults: 3 });
	assert.ok(lexicalMatches.length > 0);
	const analyses = await nlp.morphology.analyze("ف", { maxResults: 3 });
	assert.ok(analyses.length > 0);
	const generations = await nlp.morphology.generate("فَ", undefined, {
		maxResults: 3,
	});
	assert.ok(generations.length > 0);

	const entities = await nlp.kb.candidates("فرنسا", { maxCandidates: 2 });
	assert.ok(entities.some((entity) => entity.label === "فرنسا"));
	const emptyIndex = await nlp.search.createIndex();
	const index = nlp.search.addAnalysis(emptyIndex, doc);
	assert.equal(index.stats.documentCount, 1);
	assert.equal(nlp.search.query(index, "فرنسا")[0]?.docId, doc.toTextDoc().id);

	assert.equal(nlp.corpus.resources().length, 0);
	assert.equal(nlp.parallel.resources().length, 0);

	const quality = await nlp.quality.analyzeDocument(doc.toTextDoc(), {
		maxFindings: 4,
	});
	assert.ok(quality.id.length > 0);
	assert.ok(nlp.inspect().resources.length > 0);
});
