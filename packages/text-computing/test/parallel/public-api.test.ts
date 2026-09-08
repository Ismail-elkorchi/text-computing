import assert from "node:assert/strict";
import test from "node:test";
import * as api from "@ismail-elkorchi/text-computing/parallel";
import * as alignment from "@ismail-elkorchi/text-computing/parallel/alignment";
import * as lexicon from "@ismail-elkorchi/text-computing/parallel/bilingual-lexicon";
import * as terms from "@ismail-elkorchi/text-computing/parallel/bilingual-terms";
import * as corpus from "@ismail-elkorchi/text-computing/parallel/parallel-corpus";
import * as sentence from "@ismail-elkorchi/text-computing/parallel/sentence-align";
import * as transfer from "@ismail-elkorchi/text-computing/parallel/transfer";
import * as memory from "@ismail-elkorchi/text-computing/parallel/translation-memory";
import * as word from "@ismail-elkorchi/text-computing/parallel/word-align";

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
