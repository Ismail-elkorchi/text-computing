import assert from "node:assert/strict";

const root = await import("../../dist/index.js");
const features = await import("../../dist/features/mod.js");
const vectorize = await import("../../dist/vectorize/mod.js");
const classify = await import("../../dist/classify/mod.js");
const sequence = await import("../../dist/sequence/mod.js");
const hmm = await import("../../dist/hmm/mod.js");
const crf = await import("../../dist/crf/mod.js");
const maxent = await import("../../dist/maxent/mod.js");
const perceptron = await import("../../dist/perceptron/mod.js");
const lm = await import("../../dist/lm/mod.js");
const topic = await import("../../dist/topic/mod.js");
const cluster = await import("../../dist/cluster/mod.js");
const tagger = await import("../../dist/tagger/mod.js");
const parser = await import("../../dist/parser/mod.js");
const summary = await import("../../dist/summary/mod.js");

assert.equal(typeof root.trainClassifier, "function");
assert.equal(typeof features.extractFeatures, "function");
assert.equal(typeof vectorize.fitVectorizer, "function");
assert.equal(typeof classify.classify, "function");
assert.equal(typeof sequence.trainSequenceTagger, "function");
assert.equal(typeof hmm.trainSequenceTagger, "function");
assert.equal(typeof crf.trainSequenceTagger, "function");
assert.equal(typeof maxent.trainClassifier, "function");
assert.equal(typeof perceptron.trainClassifier, "function");
assert.equal(typeof lm.trainNgramLanguageModel, "function");
assert.equal(typeof topic.trainLda, "function");
assert.equal(typeof cluster.clusterDocuments, "function");
assert.equal(typeof tagger.trainSequenceTagger, "function");
assert.equal(typeof parser.parseDependencies, "function");
assert.equal(typeof summary.summarizeDocument, "function");

for (const internalName of [
	"assertJsonValue",
	"stableJsonClone",
	"stableStringify",
]) {
	assert.equal(
		internalName in root,
		false,
		`${internalName} must stay out of the public root runtime surface`,
	);
}
