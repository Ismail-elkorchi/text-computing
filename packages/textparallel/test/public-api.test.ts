import assert from "node:assert/strict";
import test from "node:test";

import * as alignment from "../dist/alignment/mod.js";
import * as lexicon from "../dist/bilingual-lexicon/mod.js";
import * as terms from "../dist/bilingual-terms/mod.js";
import * as api from "../dist/index.js";
import * as corpus from "../dist/parallel-corpus/mod.js";
import * as sentence from "../dist/sentence-align/mod.js";
import * as transfer from "../dist/transfer/mod.js";
import * as memory from "../dist/translation-memory/mod.js";
import * as word from "../dist/word-align/mod.js";

test("root exports the final textparallel API", () => {
	assert.deepEqual(
		Object.keys(api).sort(),
		[
			"TextParallelError",
			"alignSentences",
			"alignWords",
			"annotateAlignment",
			"assertJsonObject",
			"assertJsonValue",
			"buildAlignmentLink",
			"buildTranslationMemory",
			"compareAlignmentLinks",
			"compareParallelCollocations",
			"createParallelCorpus",
			"createParallelDocument",
			"extractBilingualTerms",
			"induceBilingualLexicon",
			"packageName",
			"packageVersion",
			"parallelCorpusFromPack",
			"parallelDocumentsFromRecords",
			"parallelEvidence",
			"parallelLinkRowsFromPack",
			"parallelTablesFromPack",
			"searchTranslationMemory",
			"shallowTransfer",
			"trainSentenceAligner",
			"trainWordAligner",
		].sort(),
	);
});

test("required final subpaths are importable", () => {
	assert.equal(typeof alignment.buildAlignmentLink, "function");
	assert.equal(typeof alignment.annotateAlignment, "function");
	assert.equal(typeof sentence.alignSentences, "function");
	assert.equal(typeof sentence.trainSentenceAligner, "function");
	assert.equal(typeof word.alignWords, "function");
	assert.equal(typeof word.trainWordAligner, "function");
	assert.equal(typeof memory.buildTranslationMemory, "function");
	assert.equal(typeof memory.searchTranslationMemory, "function");
	assert.equal(typeof lexicon.induceBilingualLexicon, "function");
	assert.equal(typeof lexicon.compareParallelCollocations, "function");
	assert.equal(typeof terms.extractBilingualTerms, "function");
	assert.equal(typeof transfer.shallowTransfer, "function");
	assert.equal(typeof corpus.createParallelCorpus, "function");
	assert.equal(typeof corpus.parallelDocumentsFromRecords, "function");
});
