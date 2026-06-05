import assert from "node:assert/strict";
import test from "node:test";

import {
	alignSentences,
	alignWords,
	annotateAlignment,
	assertJsonValue,
	buildTranslationMemory,
	compareParallelCollocations,
	createParallelCorpus,
	createParallelDocument,
	extractBilingualTerms,
	induceBilingualLexicon,
	searchTranslationMemory,
	shallowTransfer,
	trainSentenceAligner,
	trainWordAligner,
} from "../dist/index.js";
import {
	fixtureDictionary,
	fixtureParallelCorpus,
	fixtureParallelDocument,
	sourceDocument,
	targetDocument,
} from "./fixtures/documents.ts";

test("runs the final section 20 parallel workflow", () => {
	const source = sourceDocument();
	const target = targetDocument();
	const sentenceLinks = alignSentences(source, target);
	const wordLinks = alignWords(source, target, {
		dictionaries: fixtureDictionary,
		allowNullLinks: false,
	});
	const pair = createParallelDocument(source, target, {
		id: "workflow-pair",
		links: sentenceLinks,
	});
	const corpus = createParallelCorpus([pair], {
		id: "workflow-corpus",
		sourceLanguage: "en",
		targetLanguage: "fr",
	});
	const tm = buildTranslationMemory([pair], { id: "workflow-tm" });
	const hits = searchTranslationMemory(tm, "hello world", { maxHits: 2 });
	const terms = extractBilingualTerms(corpus);
	const lexicon = induceBilingualLexicon(corpus, {
		dictionaries: fixtureDictionary,
	});
	const collocations = compareParallelCollocations(corpus);
	const transferred = shallowTransfer(
		source,
		{
			dictionaries: fixtureDictionary,
		},
		{ output: "both" },
	);
	const annotated = annotateAlignment(pair);
	const sentenceModel = trainSentenceAligner([pair]);
	const wordModel = trainWordAligner([pair]);

	assert.equal(sentenceLinks.length, 2);
	assert.ok(wordLinks.some((link) => link.relation === "equivalent"));
	assert.equal(hits[0]?.targetText, "Bonjour monde.");
	assert.ok(terms.some((term) => term.sourceText === "Hello world."));
	assert.ok(lexicon.some((entry) => entry.sourceForm === "Hello"));
	assert.ok(
		collocations.some((entry) => entry.sourceCollocation[0] === "hello"),
	);
	assert.equal(
		transferred.views["translation.transfer"]?.text,
		"Bonjour monde. Bon jour.",
	);
	assert.ok(annotated.sourceDoc.layers["alignment.links"]);
	assert.equal(sentenceModel.kind, "sentence-alignment");
	assert.equal(wordModel.kind, "word-alignment");
	assertJsonValue(tm);
	assertJsonValue(corpus);
});

test("keeps corpus construction and metadata JSON-safe", () => {
	const pair = fixtureParallelDocument();
	const corpus = fixtureParallelCorpus();
	assert.equal(pair.metadata.languagePair, "en-fr");
	assert.equal(corpus.indexes.documents, 1);
	assert.equal(corpus.indexes.links, 2);
	assert.throws(
		() =>
			createParallelDocument(sourceDocument(), targetDocument(), {
				metadata: { bad: Number.NaN },
			}),
		/TEXTPARALLEL_JSON_NUMBER/,
	);
});
