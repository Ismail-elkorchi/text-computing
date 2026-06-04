import assert from "node:assert/strict";
import { trainClassifier } from "../../dist/index.js";

const classifier = trainClassifier(
	[
		{ id: "a", label: "a", features: { bias: 1, a: 1 } },
		{ id: "b", label: "b", features: { bias: 1, b: 1 } },
	],
	{ kind: "naive-bayes" },
);

assert.equal(classifier.kind, "naive-bayes");
