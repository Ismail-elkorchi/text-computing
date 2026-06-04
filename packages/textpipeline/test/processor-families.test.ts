import assert from "node:assert/strict";
import {
	createPipeline,
	planPipeline,
	type TextProcessor,
} from "../dist/index.js";

const families = [
	"textfacts",
	"textlex",
	"textfst",
	"textrules",
	"textnorm",
	"textclassical",
	"textcorpus",
	"textsearch",
	"textkb",
	"textquality",
	"textparallel",
] as const;

const processors: TextProcessor[] = families.map((family) => ({
	id: `${family}:processor`,
	version: "1.0.0",
	provides: [{ viewKind: "task" }],
	process(document) {
		return document;
	},
}));

const plan = planPipeline(createPipeline(processors));
assert.equal(plan.ok, true);
assert.equal(plan.processorOrder.length, families.length);
