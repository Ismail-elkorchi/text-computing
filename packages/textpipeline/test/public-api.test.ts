import assert from "node:assert/strict";

const root = await import("../dist/index.js");
const processor = await import("../dist/processor/mod.js");
const graph = await import("../dist/graph/mod.js");
const run = await import("../dist/run/mod.js");
const stream = await import("../dist/stream/mod.js");
const cache = await import("../dist/cache/mod.js");
const pack = await import("../dist/pack/mod.js");

function assertKeys(
	name: string,
	value: Record<string, unknown>,
	keys: readonly string[],
): void {
	assert.deepEqual(Object.keys(value).sort(), [...keys].sort(), name);
}

assertKeys("root exports", root, [
	"PipelineError",
	"composePackProcessors",
	"createMemoryPipelineCache",
	"createPipeline",
	"createPipelineCacheKey",
	"createPipelineResourceRegistry",
	"packageName",
	"packageVersion",
	"pipelineCacheSnapshotSchemaVersion",
	"pipelinePlanSchemaVersion",
	"planPipeline",
	"resourceRequirement",
	"runPipeline",
	"streamPipeline",
	"validatePipelineCacheSnapshot",
]);

assertKeys("processor exports", processor, [
	"createPipeline",
	"validateProcessorOutput",
	"validateProcessorRequirement",
	"validateTextProcessor",
]);

assertKeys("graph exports", graph, [
	"documentSatisfiesRequirement",
	"externalSatisfiesRequirement",
	"outputSatisfiesRequirement",
	"planPipeline",
	"requirementHasDocumentPart",
	"resourceSatisfiesRequirement",
]);

assertKeys("run exports", run, [
	"abortIfSignaled",
	"createProcessorContext",
	"runPipeline",
]);

assertKeys("stream exports", stream, ["streamPipeline"]);

assertKeys("cache exports", cache, [
	"createMemoryPipelineCache",
	"createPipelineCacheKey",
	"validatePipelineCacheSnapshot",
]);

assertKeys("pack exports", pack, [
	"composePackProcessors",
	"createPipelineResourceRegistry",
	"resourceRequirement",
]);
