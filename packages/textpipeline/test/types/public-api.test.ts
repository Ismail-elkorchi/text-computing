import assert from "node:assert/strict";
import type {
	PipelinePlan,
	ProcessorOutput,
	ProcessorRequirement,
	RunOptions,
	StreamOptions,
	TextProcessor,
} from "../../dist/index.js";
import {
	createMemoryPipelineCache,
	createPipeline,
	createPipelineResourceRegistry,
	planPipeline,
	runPipeline,
	streamPipeline,
} from "../../dist/index.js";

const requirement: ProcessorRequirement = { layer: "token.word" };
const output: ProcessorOutput = { layer: "lemma.base", annotations: ["lemma"] };
const processor: TextProcessor = {
	id: "types",
	version: "1.0.0",
	requires: [requirement],
	provides: [output],
	process(document) {
		return document;
	},
};
const resources = createPipelineResourceRegistry();
const pipeline = createPipeline([processor], { resources });
const plan: PipelinePlan = planPipeline(pipeline);
const cache = createMemoryPipelineCache();
const runOptions: RunOptions = { cache, cachePolicy: "read-through" };
const streamOptions: StreamOptions = { concurrency: 1, preserveOrder: true };

assert.equal(plan.pipelineId, pipeline.id);
assert.equal(typeof runPipeline, "function");
assert.equal(typeof streamPipeline, "function");
assert.equal(runOptions.cachePolicy, "read-through");
assert.equal(streamOptions.preserveOrder, true);
