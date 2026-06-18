import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { createDocument } from "@ismail-elkorchi/textdoc";
import { addToIndex, search, termQuery } from "@ismail-elkorchi/textsearch";
import { loadFrench } from "../dist/index.js";

const reader = {
	async readText({ descriptor }) {
		return readFile(new URL(descriptor.path, descriptor.packageRoot), "utf8");
	},
};

const french = await loadFrench({
	reader,
	licensePolicy: "allow-share-alike",
});

const articleText =
	"Réussite personnelle\nEn France, j'aime apprendre chaque jour et je parle de motivation en Amérique.";
const article = createDocument(articleText, {
	id: "article:consumer-fr-1",
	metadata: {
		title: "Réussite personnelle",
		source: "reussite-personnelle-nlp-consumer-style",
	},
});

assert.equal(french.languageTag, "fr");
assert.equal(french.pack.manifest.packageName, "@ismail-elkorchi/textpack-fr");
assert.equal(
	french.pack.manifest.components?.filter(
		(component) => component.role === "required",
	).length,
	12,
);

const analysis = await french.document.analyzeDocument(article, {
	entityLanguage: "fr",
	entityMaxCandidates: 3,
	lexiconMaxResults: 5,
	morphologyMaxResults: 5,
});
assert.equal(analysis.languageTag, "fr");
assert.equal(analysis.sourceDocument.id, article.id);
assert.ok(analysis.sentences.length > 0);
assert.ok(analysis.words.length > 0);
assert.ok(analysis.lexicalUnits.some((segment) => segment.text === "France"));
assert.ok(analysis.lexicalUnits.some((segment) => segment.text === "Amérique"));
assert.ok(analysis.lexicalUnits.some((segment) => segment.text === "parle"));

const normalizedText = await french.normalization.normalizeText(
	articleText,
	"search",
);
assert.ok(normalizedText.includes("reussite personnelle"));
assert.ok(normalizedText.includes("amerique"));

assert.equal(analysis.normalizedDocument.views["raw:search"]?.kind, "search");
assert.ok(analysis.normalizedDocument.spanMaps[analysis.searchView.spanMap.id]);

const parleAnalysis = analysis.lexicalUnitAnalyses.find(
	(entry) => entry.segment.text === "parle",
);
assert.ok(parleAnalysis);
assert.ok(
	parleAnalysis.lexiconMatches.some((match) => match.canonical === "parler"),
	"French lexicon lookup should resolve parle -> parler.",
);
assert.ok(
	parleAnalysis.morphologyAnalyses.some(
		(morphologyAnalysis) => morphologyAnalysis.lemma === "parler",
	),
	"French morphology should analyze parle as a form of parler.",
);

const entityCandidates = await french.kb.candidates("France", {
	language: "fr",
	maxCandidates: 3,
});
assert.equal(entityCandidates[0]?.label, "France");

assert.ok(
	Object.keys(
		analysis.entityLinkedDocument.layers["link.entity"]?.annotations ?? {},
	).length >= 2,
	"French entity linking should annotate France and Amérique.",
);

const terms = analysis.searchTokens.map((token) => token.term);
assert.ok(terms.includes("reussite"));
assert.ok(terms.includes("amerique"));

let searchIndex = await french.search.createIndex({
	id: "consumer-fr-search",
});
searchIndex = addToIndex(searchIndex, analysis.normalizedDocument, {
	storedFields: { title: "Réussite personnelle" },
});
assert.equal(searchIndex.stats.documentCount, 1);
assert.equal(search(searchIndex, termQuery("reussite")).length, 1);

const corpusResources = await french.corpus.rows();
assert.equal(
	corpusResources[0]?.descriptor.schemaId,
	"textdata.corpus.rows.v1",
);
assert.ok((corpusResources[0]?.rows.length ?? 0) > 1000);
assert.equal(corpusResources[0]?.rows[0]?.languageTag, "fr");

const parallelLinks = await french.parallel.links({ targetLanguage: "en" });
assert.ok(parallelLinks.length > 1000);
assert.equal(parallelLinks[0]?.sourceLanguageTag, "fr");
assert.equal(parallelLinks[0]?.targetLanguageTag, "en");

assert.equal(analysis.qualityReport.target, "document");
assert.ok((analysis.qualityReport.metrics["readability.word_count"] ?? 0) > 0);
