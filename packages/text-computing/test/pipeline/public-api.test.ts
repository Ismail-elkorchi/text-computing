import assert from "node:assert/strict";

const root = await import("@ismail-elkorchi/text-computing/pipeline");
const processor = await import(
	"@ismail-elkorchi/text-computing/pipeline/processor"
);
const graph = await import("@ismail-elkorchi/text-computing/pipeline/graph");
const run = await import("@ismail-elkorchi/text-computing/pipeline/run");
const stream = await import("@ismail-elkorchi/text-computing/pipeline/stream");
const cache = await import("@ismail-elkorchi/text-computing/pipeline/cache");
const pack = await import("@ismail-elkorchi/text-computing/pipeline/pack");

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
