import { trainClassifier } from "../../dist/index.js";

const classifier = trainClassifier(
	[
		{ id: "a", label: "a", features: { bias: 1, a: 1 } },
		{ id: "b", label: "b", features: { bias: 1, b: 1 } },
	],
	{ kind: "perceptron", iterations: 2 },
);

if (classifier.labels.length !== 2) {
	throw new Error("browser smoke failed");
}
