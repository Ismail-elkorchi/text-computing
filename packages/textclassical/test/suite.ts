import assert from "node:assert/strict";
import { createDocument, validateTextDocument } from "@ismail-elkorchi/textdoc";
import {
	affixFeatureSpec,
	annotateSequence,
	annotateSummary,
	type ClassicalClassifierKind,
	charNgramFeatureSpec,
	classify,
	classifyDocument,
	clusterDocuments,
	defaultFeatureSpecs,
	type FeatureRecord,
	fitVectorizer,
	inferTopics,
	type LabeledFeatureRecord,
	parseDependencies,
	perplexity,
	type SequenceModelKind,
	type SequenceSample,
	type SequenceTagger,
	type SmoothingKind,
	scoreSequence,
	shapeFeatureSpec,
	summarizeDocument,
	tagSequence,
	textFeatureSpec,
	tokenSequenceFromText,
	trainClassicalParser,
	trainClassifier,
	trainLda,
	trainNgramLanguageModel,
	trainSequenceTagger,
	transformVectorizer,
	wordNgramFeatureSpec,
} from "../dist/index.js";

await import("../dist/features/mod.js");
await import("../dist/vectorize/mod.js");
await import("../dist/classify/mod.js");
await import("../dist/sequence/mod.js");
await import("../dist/hmm/mod.js");
await import("../dist/crf/mod.js");
await import("../dist/maxent/mod.js");
await import("../dist/perceptron/mod.js");
await import("../dist/lm/mod.js");
await import("../dist/topic/mod.js");
await import("../dist/cluster/mod.js");
await import("../dist/tagger/mod.js");
await import("../dist/parser/mod.js");
await import("../dist/summary/mod.js");

function record(
	id: string,
	label: string,
	features: Readonly<Record<string, number>>,
): LabeledFeatureRecord {
	return { id, label, features };
}

const featureDoc = createDocument("Good legal text. Good evidence.", {
	id: "feature-doc",
});
const vectors = [
	...defaultFeatureSpecs,
	textFeatureSpec("text2"),
	charNgramFeatureSpec(2, 2),
	wordNgramFeatureSpec(1, 2),
	shapeFeatureSpec(),
	affixFeatureSpec(),
].flatMap((spec) => [spec]);
const extracted = vectors.flatMap((spec) =>
	// Each extractor is tested through the final API, not by internal helper access.
	import("../dist/features/mod.js").then((mod) =>
		mod.extractFeatures(featureDoc, [spec]),
	),
);
assert.equal((await Promise.all(extracted)).flat().length > 0, true);

const samples: LabeledFeatureRecord[] = [
	record("p1", "positive", { bias: 1, "token=good": 2, "shape=Aaaa": 1 }),
	record("p2", "positive", { bias: 1, "token=clear": 1, "token=good": 1 }),
	record("n1", "negative", { bias: 1, "token=bad": 2, "shape=aaa": 1 }),
	record("n2", "negative", { bias: 1, "token=unclear": 1, "token=bad": 1 }),
];
const vectorizer = fitVectorizer(samples, { normalize: "l2" });
const matrix = transformVectorizer(vectorizer, samples);
assert.equal(matrix.rowCount, samples.length);
assert.equal(matrix.featureSpaceId, vectorizer.featureSpaceId);

const classifierKinds: ClassicalClassifierKind[] = [
	"naive-bayes",
	"maxent",
	"perceptron",
	"averaged-perceptron",
	"linear-svm",
	"logistic-regression",
];
for (const kind of classifierKinds) {
	const classifier = trainClassifier(samples, {
		kind,
		iterations: 8,
		learningRate: 0.25,
	});
	const [positiveVector] = transformVectorizer(classifier.vectorizer, [
		{ id: "probe", features: { bias: 1, "token=good": 1 } },
	] satisfies FeatureRecord[]).rowIds;
	assert.equal(positiveVector, "probe");
	const probe = transformVectorizer(classifier.vectorizer, [
		{ id: "probe", features: { bias: 1, "token=good": 1 } },
	] satisfies FeatureRecord[]);
	const result = classify(classifier, {
		ids: probe.columnIds,
		values: probe.values,
		featureSpaceId: classifier.featureSpaceId,
	});
	assert.equal(result.rankings.length, 2);
	assert.equal(result.label.length > 0, true);
}

const documentClassifier = trainClassifier(samples, {
	kind: "naive-bayes",
});
const classified = classifyDocument(
	createDocument("good good", { id: "classified" }),
	documentClassifier,
);
assert.equal(validateTextDocument(classified).ok, true);
assert.equal(
	Object.values(classified.layers)[0]?.type,
	"classification.document",
);

const sequenceSamples: SequenceSample[] = [
	{ id: "s1", tokens: ["I", "like", "fish"], labels: ["PRON", "VERB", "NOUN"] },
	{
		id: "s2",
		tokens: ["You", "like", "law"],
		labels: ["PRON", "VERB", "NOUN"],
	},
	{ id: "s3", tokens: ["Fish", "swim"], labels: ["NOUN", "VERB"] },
];
const sequenceKinds: SequenceModelKind[] = [
	"hmm",
	"memm",
	"crf",
	"perceptron-sequence",
];
for (const kind of sequenceKinds) {
	const tagger = trainSequenceTagger(sequenceSamples, {
		kind,
		iterations: 4,
		learningRate: 0.2,
	});
	const tagged = tagSequence(tagger, { tokens: ["I", "like", "law"] });
	assert.equal(tagged.labels.length, 3);
	const annotated = annotateSequence(
		createDocument("I like law", { id: `seq-${kind}` }),
		tagger,
		{
			task: "pos",
		},
	);
	assert.equal(validateTextDocument(annotated).ok, true);
}

const previousLabelTagger: SequenceTagger = {
	id: "memm-prev-label",
	kind: "memm",
	labels: ["A", "B"],
	featureSpaceId: "memm-prev-label-fs",
	metadata: {
		id: "memm-prev-label",
		kind: "memm",
		packageName: "@ismail-elkorchi/textclassical",
		packageVersion: "0.1.0",
		featureSpaceId: "memm-prev-label-fs",
	},
	parameters: {
		family: "linear-chain",
		featureSpace: {
			id: "memm-prev-label-fs",
			ids: {
				"prevLabel=<s>": 0,
				"prevLabel=A": 1,
			},
			keys: ["prevLabel=<s>", "prevLabel=A"],
			size: 2,
		},
		weights: [
			[3, 0],
			[0, 5],
		],
		transitions: [
			[0, 0],
			[0, 0],
		],
	},
};
assert.deepEqual(
	tagSequence(previousLabelTagger, { tokens: ["same", "same"] }).labels,
	["A", "B"],
);

const smoothingKinds: SmoothingKind[] = [
	"mle",
	"laplace",
	"lidstone",
	"witten-bell",
	"good-turing",
	"kneser-ney",
	"absolute-discount",
	"stupid-backoff",
];
for (const smoothing of smoothingKinds) {
	const lm = trainNgramLanguageModel(
		[tokenSequenceFromText("a b a"), tokenSequenceFromText("a b c")],
		{ order: 2, smoothing },
	);
	assert.equal(Number.isFinite(scoreSequence(lm, ["a", "b"]).value), true);
	assert.equal(
		Number.isFinite(perplexity(lm, [tokenSequenceFromText("a b")])),
		true,
	);
}

const topicModel = trainLda(
	[
		{ id: "d1", ids: [0, 1], values: [3, 1] },
		{ id: "d2", ids: [1, 2], values: [1, 3] },
	],
	{ topicCount: 2, iterations: 5, seed: 7 },
);
const topicDistribution = inferTopics(topicModel, {
	id: "probe",
	ids: [0, 1],
	values: [1, 1],
});
assert.equal(topicDistribution.probabilities.length, 2);

const clusters = clusterDocuments(
	{
		rowPointers: [0, 2, 4, 6],
		columnIds: [0, 1, 0, 1, 0, 1],
		values: [1, 0, 0.9, 0.1, 0, 1],
		rowCount: 3,
		columnCount: 2,
		featureSpaceId: "fs",
		rowIds: ["a", "b", "c"],
	},
	{ k: 2 },
);
assert.equal(clusters.clusters.length, 2);

const summaryDoc = createDocument("Alpha beta. Alpha gamma. Delta.", {
	id: "summary",
});
const summary = summarizeDocument(summaryDoc, {
	sentenceCount: 2,
	method: "frequency",
});
assert.equal(summary.sentences.length, 2);
assert.equal(
	validateTextDocument(annotateSummary(summaryDoc, summary)).ok,
	true,
);

const parser = trainClassicalParser(["dep"]);
assert.deepEqual(
	parseDependencies(parser, [{ id: "t1", text: "Alpha" }])[0]?.head,
	"ROOT",
);

assert.throws(
	() =>
		fitVectorizer([
			{
				id: "unsafe",
				features: { bias: 1 },
				metadata: new Date() as unknown as never,
			},
		]),
	/I-JSON/,
);
assert.throws(
	() =>
		fitVectorizer([
			{
				id: "unsafe-key",
				features: { "\ud800": 1 },
			},
		]),
	/I-JSON/,
);
assert.throws(
	() =>
		trainClassifier(
			[
				record("bad-label", "\ud800", {
					bias: 1,
				}),
			],
			{ kind: "naive-bayes" },
		),
	/I-JSON/,
);
