import assert from "node:assert/strict";
import { test } from "node:test";
import {
	createMemoryPipelineCache,
	createPipeline,
	createPipelineCacheKey,
	createPipelineResourceRegistry,
	planPipeline,
	runPipeline,
	streamPipeline,
	type TextProcessor,
	validatePipelineCacheSnapshot,
} from "../dist/index.js";
import { demoPack } from "./fixtures/packs.ts";
import {
	createFinalDocument,
	dependentProcessor,
	identityProcessor,
	layerProcessor,
} from "./fixtures/processors.ts";

test("creates deterministic plans with dependency edges", () => {
	const pipeline = createPipeline([
		dependentProcessor("consumer", "token.word", "entity.name"),
		layerProcessor("token.word"),
	]);
	const plan = planPipeline(pipeline, createFinalDocument());
	assert.equal(plan.ok, true);
	assert.deepEqual(plan.processorOrder, ["layer:token.word", "consumer"]);
	assert.deepEqual(
		plan.edges.map((edge) => [edge.from, edge.to]),
		[["layer:token.word", "consumer"]],
	);
});

test("reports missing requirements", () => {
	const pipeline = createPipeline([
		identityProcessor("needs-token", {
			requires: [{ layer: "token.word" }],
			provides: [{ layer: "entity.name" }],
		}),
	]);
	const plan = planPipeline(pipeline, createFinalDocument());
	assert.equal(plan.ok, false);
	assert.equal(plan.missingRequirements[0]?.processorId, "needs-token");
});

test("runs sync processors over final TextDocument values", async () => {
	const pipeline = createPipeline([
		layerProcessor("token.word"),
		dependentProcessor("consumer", "token.word", "entity.name"),
	]);
	const result = await runPipeline(pipeline, createFinalDocument());
	assert.ok(result.layers["token.word"]);
	assert.ok(result.layers["entity.name"]);
});

test("handles continue failure policy without hiding diagnostics", async () => {
	const failing: TextProcessor = {
		id: "fail",
		version: "1.0.0",
		provides: [{ layer: "broken" }],
		process() {
			throw new Error("boom");
		},
	};
	const diagnostics = [];
	const trace = [];
	const pipeline = createPipeline([failing], { failurePolicy: "continue" });
	const result = await runPipeline(pipeline, createFinalDocument(), {
		diagnostics,
		trace,
	});
	assert.equal(result.id, "doc");
	assert.equal(diagnostics[0]?.code, "TEXTPIPELINE_PROCESSOR_FAILED");
	assert.equal(trace.at(-1)?.status, "failed");
});

test("cache keys include document content and id", () => {
	const processor = identityProcessor("identity");
	const first = createFinalDocument("first text");
	const second = createFinalDocument("second text");
	const pipeline = createPipeline([processor]);
	const firstKey = createPipelineCacheKey({
		pipeline,
		processor,
		document: first,
	});
	const secondKey = createPipelineCacheKey({
		pipeline,
		processor,
		document: second,
	});
	assert.notEqual(firstKey, secondKey);
});

test("memory cache stores final document snapshots", async () => {
	const cache = createMemoryPipelineCache({ namespace: "unit" });
	const pipeline = createPipeline([layerProcessor("token.word")]);
	const document = createFinalDocument();
	const result = await runPipeline(pipeline, document, { cache });
	const snapshot = validatePipelineCacheSnapshot(cache.snapshot());
	assert.equal(snapshot.namespace, "unit");
	assert.equal(snapshot.entryCount, 1);
	assert.ok(result.layers["token.word"]);
});

test("pack registry satisfies resource and capability requirements", () => {
	const resources = createPipelineResourceRegistry({ packs: [demoPack()] });
	const processor = identityProcessor("pack-consumer", {
		requires: [{ resourceKind: "lexicon", capability: "terminology:lexicon" }],
	});
	const pipeline = createPipeline([processor], { resources });
	const plan = planPipeline(pipeline, createFinalDocument());
	assert.equal(plan.ok, true);
	assert.equal(resources.findResources({ resourceKind: "lexicon" }).length, 1);
});

test("plans combined document and resource requirements", () => {
	const resources = createPipelineResourceRegistry({ packs: [demoPack()] });
	const pipeline = createPipeline(
		[
			layerProcessor("token.word"),
			identityProcessor("combined", {
				requires: [
					{
						layer: "token.word",
						resourceKind: "lexicon",
						capability: "terminology:lexicon",
					},
				],
				provides: [{ layer: "term.match" }],
			}),
		],
		{ resources },
	);
	const plan = planPipeline(pipeline, createFinalDocument());
	assert.equal(plan.ok, true);
	assert.deepEqual(plan.processorOrder, ["layer:token.word", "combined"]);
});

test("streams documents with input order preserved by default", async () => {
	const pipeline = createPipeline([identityProcessor("identity")]);
	async function* docs() {
		yield createFinalDocument("one");
		yield createFinalDocument("two");
	}
	const ids = [];
	for await (const result of streamPipeline(pipeline, docs(), {
		concurrency: 2,
	})) {
		ids.push(result.sources.source?.text);
	}
	assert.deepEqual(ids, ["one", "two"]);
});
