import assert from "node:assert/strict";

const root = await import("@ismail-elkorchi/text-computing/learning");
const features = await import(
	"@ismail-elkorchi/text-computing/learning/features"
);
const vectorize = await import(
	"@ismail-elkorchi/text-computing/learning/vectorize"
);
const classify = await import(
	"@ismail-elkorchi/text-computing/learning/classify"
);
const sequence = await import(
	"@ismail-elkorchi/text-computing/learning/sequence"
);
const hmm = await import("@ismail-elkorchi/text-computing/learning/hmm");
const crf = await import("@ismail-elkorchi/text-computing/learning/crf");
const maxent = await import("@ismail-elkorchi/text-computing/learning/maxent");
const perceptron = await import(
	"@ismail-elkorchi/text-computing/learning/perceptron"
);
const lm = await import("@ismail-elkorchi/text-computing/learning/lm");
const topic = await import("@ismail-elkorchi/text-computing/learning/topic");
const cluster = await import(
	"@ismail-elkorchi/text-computing/learning/cluster"
);
const tagger = await import("@ismail-elkorchi/text-computing/learning/tagger");
const parser = await import("@ismail-elkorchi/text-computing/learning/parser");
const summary = await import(
	"@ismail-elkorchi/text-computing/learning/summary"
);

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
