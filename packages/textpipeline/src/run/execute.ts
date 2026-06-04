import { isTextDocument, type TextDocument } from "@ismail-elkorchi/textdoc";
import { createPipelineCacheKey } from "../cache/key.js";
import type { PipelineCache } from "../cache/types.js";
import { planPipeline } from "../graph/plan.js";
import { externalSatisfiesRequirement } from "../graph/requirements.js";
import { assertFinalTextDocument } from "../internal/document.js";
import { errorMessage, fail } from "../internal/errors.js";
import { stableId } from "../internal/ids.js";
import type { JsonValue } from "../internal/json.js";
import { assertOptionalJsonValue } from "../internal/json.js";
import type { PipelineResourceRegistry } from "../pack/registry.js";
import type {
	PipelineDiagnostic,
	PipelineFailurePolicy,
	PipelineTraceEvent,
	ProcessorRequirement,
	TextPipeline,
	TextProcessor,
} from "../processor/types.js";
import { createProcessorContext } from "./context.js";
import { abortIfSignaled, handleFailure } from "./failure.js";

function requirementDetails(requirement: ProcessorRequirement) {
	return {
		layer: requirement.layer ?? null,
		viewKind: requirement.viewKind ?? null,
		resourceKind: requirement.resourceKind ?? null,
		capability: requirement.capability ?? null,
	};
}

export interface RunOptions {
	readonly signal?: AbortSignal;
	readonly resources?: PipelineResourceRegistry;
	readonly cache?: PipelineCache;
	readonly cachePolicy?: "none" | "read-through";
	readonly failurePolicy?: PipelineFailurePolicy;
	readonly diagnostics?: PipelineDiagnostic[];
	readonly trace?: PipelineTraceEvent[];
	readonly metadata?: JsonValue;
	readonly validateDocuments?: boolean;
	readonly runId?: string;
}

function runOptionsFingerprint(options: RunOptions): JsonValue {
	assertOptionalJsonValue(options.metadata, "runOptions.metadata");
	return {
		cachePolicy: options.cachePolicy ?? null,
		failurePolicy: options.failurePolicy ?? null,
		metadata: options.metadata ?? null,
		validateDocuments: options.validateDocuments ?? null,
	};
}

function processorById(
	pipeline: TextPipeline,
	processorId: string,
): TextProcessor {
	const processor = pipeline.processors.find((item) => item.id === processorId);
	if (processor === undefined) {
		fail(
			"TEXTPIPELINE_PLAN_PROCESSOR_MISSING",
			`plan referenced missing processor: ${processorId}`,
		);
	}
	return processor;
}

function unmetRequirementDiagnostics(
	processor: TextProcessor,
	document: TextDocument,
	resources: PipelineResourceRegistry,
): readonly PipelineDiagnostic[] {
	return (processor.requires ?? [])
		.filter(
			(requirement) =>
				!externalSatisfiesRequirement(document, resources, requirement),
		)
		.map((requirement) => ({
			code: "TEXTPIPELINE_RUNTIME_REQUIREMENT_MISSING",
			severity: "error" as const,
			message: `runtime requirement is not satisfied: ${processor.id}`,
			processorId: processor.id,
			details: requirementDetails(requirement),
		}));
}

async function readCachedDocument(
	cache: PipelineCache | undefined,
	key: string,
): Promise<TextDocument | undefined> {
	const document = await cache?.get(key);
	if (document !== undefined)
		assertFinalTextDocument(document, "cached document");
	return document;
}

export async function runPipeline(
	pipeline: TextPipeline,
	doc: TextDocument,
	options: RunOptions = {},
): Promise<TextDocument> {
	assertFinalTextDocument(doc);
	assertOptionalJsonValue(options.metadata, "runOptions.metadata");
	const resources = options.resources ?? pipeline.resources;
	const failurePolicy = options.failurePolicy ?? pipeline.options.failurePolicy;
	const cachePolicy = options.cachePolicy ?? pipeline.options.cachePolicy;
	const validateDocuments =
		options.validateDocuments ?? pipeline.options.strict;
	const diagnostics = options.diagnostics ?? [];
	const trace = options.trace ?? [];
	const runId =
		options.runId ??
		stableId("run", {
			pipelineId: pipeline.id,
			documentId: doc.id,
		});
	abortIfSignaled(options.signal);
	const plan = planPipeline({ ...pipeline, resources }, doc);
	if (!plan.ok) {
		diagnostics.push(...plan.diagnostics);
		handleFailure(
			failurePolicy,
			"TEXTPIPELINE_PLAN_FAILED",
			"pipeline plan is not executable.",
			plan.diagnostics,
		);
	}
	let current = doc;
	for (const processorId of plan.processorOrder) {
		abortIfSignaled(options.signal);
		const processor = processorById(pipeline, processorId);
		const missing = unmetRequirementDiagnostics(processor, current, resources);
		if (missing.length > 0) {
			diagnostics.push(...missing);
			trace.push({
				runId,
				pipelineId: pipeline.id,
				processorId: processor.id,
				status: "skipped",
				diagnostics: missing,
			});
			handleFailure(
				failurePolicy,
				"TEXTPIPELINE_RUNTIME_REQUIREMENT_MISSING",
				`processor runtime requirements are not satisfied: ${processor.id}`,
				missing,
			);
			continue;
		}
		const context = createProcessorContext({
			pipeline,
			processorId: processor.id,
			documentId: current.id,
			runId,
			...(options.signal === undefined ? {} : { signal: options.signal }),
			resources,
			...(options.cache === undefined ? {} : { cache: options.cache }),
			...(options.metadata === undefined ? {} : { metadata: options.metadata }),
			diagnostics,
			trace,
		});
		const cacheKey =
			options.cache !== undefined && cachePolicy !== "none"
				? createPipelineCacheKey({
						pipeline,
						processor,
						document: current,
						resources,
						options: runOptionsFingerprint(options),
					})
				: undefined;
		if (cacheKey !== undefined) {
			const cached = await readCachedDocument(options.cache, cacheKey);
			if (cached !== undefined) {
				current = cached;
				trace.push({
					runId,
					pipelineId: pipeline.id,
					processorId: processor.id,
					status: "cached",
					cacheKey,
				});
				continue;
			}
		}
		trace.push({
			runId,
			pipelineId: pipeline.id,
			processorId: processor.id,
			status: "started",
			...(cacheKey === undefined ? {} : { cacheKey }),
		});
		try {
			const result = await processor.process(current, context);
			abortIfSignaled(options.signal);
			if (!isTextDocument(result)) {
				throw new TypeError(
					`processor returned a non-TextDocument value: ${processor.id}`,
				);
			}
			if (validateDocuments)
				assertFinalTextDocument(result, "processor result");
			current = result;
			if (cacheKey !== undefined && options.cache?.set !== undefined) {
				await options.cache.set(cacheKey, current);
			}
			trace.push({
				runId,
				pipelineId: pipeline.id,
				processorId: processor.id,
				status: "completed",
				...(cacheKey === undefined ? {} : { cacheKey }),
			});
		} catch (error) {
			const diagnostic: PipelineDiagnostic = {
				code: "TEXTPIPELINE_PROCESSOR_FAILED",
				severity: "error",
				message: errorMessage(error),
				processorId: processor.id,
			};
			diagnostics.push(diagnostic);
			trace.push({
				runId,
				pipelineId: pipeline.id,
				processorId: processor.id,
				status: "failed",
				diagnostics: [diagnostic],
				...(cacheKey === undefined ? {} : { cacheKey }),
			});
			handleFailure(
				failurePolicy,
				"TEXTPIPELINE_PROCESSOR_FAILED",
				`processor failed: ${processor.id}`,
				[diagnostic],
			);
		}
	}
	return current;
}
