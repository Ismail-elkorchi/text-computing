import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import fr from "@ismail-elkorchi/textpack-fr";
import { load, type TextPackResourceReader } from "../../dist/index.js";

function localGeneratedResourceReader(): TextPackResourceReader {
	return {
		readText({ descriptor }) {
			if (descriptor.packageRoot === undefined) {
				throw new TypeError(
					`Generated textpack resource ${descriptor.path} has no packageRoot.`,
				);
			}
			const root = new URL(
				descriptor.packageRoot.endsWith("/")
					? descriptor.packageRoot
					: `${descriptor.packageRoot}/`,
			);
			const resourceUrl = new URL(descriptor.path, root);
			if (!resourceUrl.href.startsWith(root.href)) {
				throw new TypeError(
					`Generated textpack resource path ${descriptor.path} escapes ${root.href}.`,
				);
			}
			return readFile(resourceUrl, "utf8");
		},
	};
}

test("French consumer workflow uses only the SDK plus textpack-fr", async () => {
	const nlp = await load(fr, { reader: localGeneratedResourceReader() });
	const text = "La Republique francaise reconnait la France.";
	const doc = await nlp(text, {
		entityMaxCandidates: 2,
		lexiconMaxResults: 3,
		morphologyMaxResults: 3,
		quality: { maxFindings: 4 },
	});

	assert.equal(nlp.languageTag, "fr");
	assert.equal(nlp.support().packageName, "@ismail-elkorchi/textpack-fr");
	assert.equal(doc.languageTag, "fr");
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

	const lexicalMatches = await nlp.lookup("reconnaît", { maxResults: 3 });
	assert.ok(lexicalMatches.length > 0);
	const analyses = await nlp.morphology.analyze("reconnait", {
		maxResults: 3,
	});
	assert.ok(analyses.some((analysis) => analysis.lemma === "reconnaitre"));
	const generations = await nlp.morphology.generate("reconnaitre", undefined, {
		maxResults: 3,
	});
	assert.ok(generations.length > 0);

	const entities = await nlp.kb.candidates("France", { maxCandidates: 2 });
	assert.ok(entities.some((entity) => entity.label === "France"));
	const index = await nlp.search.indexAnalysis(doc);
	assert.equal(index.stats.documentCount, 1);

	const corpusDocs = await nlp.corpus.documents({ maxDocuments: 1 });
	assert.equal(corpusDocs.length, 1);
	const parallelTables = await nlp.parallel.rows({ maxRows: 2 });
	const parallelRowCount = parallelTables.reduce(
		(total, table) => total + table.rows.length,
		0,
	);
	assert.ok(parallelRowCount > 0 && parallelRowCount <= 2);
	const parallelLinks = await nlp.parallel.links({ maxRows: 2 });
	assert.ok(parallelLinks.length > 0 && parallelLinks.length <= 2);

	const quality = await nlp.quality.analyzeDocument(doc.toTextDoc(), {
		maxFindings: 4,
	});
	assert.ok(quality.id.length > 0);
	assert.ok(nlp.inspect().resources.length > 0);
});
