import assert from "node:assert/strict";
import test from "node:test";
import * as api from "@ismail-elkorchi/text-computing/corpus";
import * as collocation from "@ismail-elkorchi/text-computing/corpus/collocation";
import * as concordance from "@ismail-elkorchi/text-computing/corpus/concordance";
import * as diachronic from "@ismail-elkorchi/text-computing/corpus/diachronic";
import * as dispersion from "@ismail-elkorchi/text-computing/corpus/dispersion";
import * as frequency from "@ismail-elkorchi/text-computing/corpus/frequency";
import * as keyness from "@ismail-elkorchi/text-computing/corpus/keyness";
import * as lexicography from "@ismail-elkorchi/text-computing/corpus/lexicography";
import * as ngram from "@ismail-elkorchi/text-computing/corpus/ngram";
import * as query from "@ismail-elkorchi/text-computing/corpus/query";
import * as reuse from "@ismail-elkorchi/text-computing/corpus/reuse";
import * as store from "@ismail-elkorchi/text-computing/corpus/store";
import * as stylometry from "@ismail-elkorchi/text-computing/corpus/stylometry";
import * as terms from "@ismail-elkorchi/text-computing/corpus/terms";
import * as textpack from "@ismail-elkorchi/text-computing/corpus/textpack";

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
