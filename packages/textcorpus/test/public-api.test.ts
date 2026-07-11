import assert from "node:assert/strict";
import test from "node:test";
import * as collocation from "../dist/collocation/mod.js";
import * as concordance from "../dist/concordance/mod.js";
import * as diachronic from "../dist/diachronic/mod.js";
import * as dispersion from "../dist/dispersion/mod.js";
import * as frequency from "../dist/frequency/mod.js";
import * as api from "../dist/index.js";
import * as keyness from "../dist/keyness/mod.js";
import * as lexicography from "../dist/lexicography/mod.js";
import * as ngram from "../dist/ngram/mod.js";
import * as query from "../dist/query/mod.js";
import * as reuse from "../dist/reuse/mod.js";
import * as store from "../dist/store/mod.js";
import * as stylometry from "../dist/stylometry/mod.js";
import * as terms from "../dist/terms/mod.js";
import * as textpack from "../dist/textpack.js";

test("root exports the final textcorpus API only", () => {
	assert.deepEqual(
		Object.keys(api).sort(),
		[
			"TextCorpusError",
			"addDocuments",
			"collocations",
			"concordance",
			"corpusAsJson",
			"corpusDatasetFromPack",
			"corpusDocumentsFromPack",
			"corpusFingerprint",
			"corpusMetadataKey",
			"corpusQuery",
			"createCorpus",
			"createCorpusFromDataset",
			"detectReuse",
			"diachronicTrends",
			"dispersion",
			"distribution",
			"documentSimilarityMatrix",
			"documentTermMatrix",
			"extractTerms",
			"frequency",
			"goodDictionaryExamples",
			"keyness",
			"lexicalDiversity",
			"ngramFrequencies",
			"ngrams",
			"reuse",
			"stylometricProfile",
			"textCorpusFromPack",
			"wordList",
			"wordSketch",
		].sort(),
	);
});

test("required final subpaths are importable", () => {
	assert.equal(typeof store.createCorpus, "function");
	assert.equal(typeof textpack.textCorpusFromPack, "function");
	assert.equal(typeof query.corpusQuery, "function");
	assert.equal(typeof concordance.concordance, "function");
	assert.equal(typeof frequency.frequency, "function");
	assert.equal(typeof ngram.ngrams, "function");
	assert.equal(typeof collocation.collocations, "function");
	assert.equal(typeof keyness.keyness, "function");
	assert.equal(typeof dispersion.dispersion, "function");
	assert.equal(typeof terms.extractTerms, "function");
	assert.equal(typeof lexicography.wordSketch, "function");
	assert.equal(typeof stylometry.stylometricProfile, "function");
	assert.equal(typeof reuse.detectReuse, "function");
	assert.equal(typeof diachronic.diachronicTrends, "function");
});
