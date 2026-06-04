import { stableHash64 } from "@ismail-elkorchi/textfacts/hash";
import { fail } from "../internal/errors.js";
import type { JsonValue } from "../internal/json.js";
import {
	assertOptionalJsonValue,
	stableJsonStringify,
} from "../internal/json.js";
import { createPipelineResourceRegistry } from "../pack/registry.js";
import type {
	NormalizedPipelineOptions,
	PipelineOptions,
	TextPipeline,
	TextProcessor,
} from "./types.js";
import { validateTextProcessor } from "./validate.js";

function cloneOutputs(processor: TextProcessor): TextProcessor["provides"] {
	return Object.freeze(
		processor.provides.map((output) =>
			Object.freeze({
				...output,
				...(output.annotations === undefined
					? {}
					: { annotations: Object.freeze([...output.annotations]) }),
			}),
		),
	);
}

function normalizeProcessor(processor: TextProcessor): TextProcessor {
	const normalized: TextProcessor = {
		id: processor.id,
		version: processor.version,
		...(processor.requires === undefined
			? {}
			: {
					requires: Object.freeze(
						processor.requires.map((requirement) =>
							Object.freeze({ ...requirement }),
						),
					),
				}),
		provides: cloneOutputs(processor),
		process: processor.process,
	};
	return Object.freeze(normalized);
}

function processorSignature(processor: TextProcessor): JsonValue {
	return {
		id: processor.id,
		version: processor.version,
		requires: (processor.requires ?? []) as JsonValue,
		provides: processor.provides as JsonValue,
	};
}

function normalizeOptions(options: PipelineOptions): NormalizedPipelineOptions {
	assertOptionalJsonValue(options.metadata, "options.metadata");
	return Object.freeze({
		strict: options.strict ?? true,
		failurePolicy: options.failurePolicy ?? "throw",
		cachePolicy: options.cachePolicy ?? "read-through",
		...(options.metadata === undefined ? {} : { metadata: options.metadata }),
	});
}

export function createPipeline(
	processors: readonly TextProcessor[],
	options: PipelineOptions = {},
): TextPipeline {
	if (!Array.isArray(processors)) {
		fail("TEXTPIPELINE_INVALID_PROCESSORS", "processors must be an array.");
	}
	const normalizedProcessors = Object.freeze(
		processors.map(normalizeProcessor),
	);
	const diagnostics = normalizedProcessors.flatMap((processor, index) =>
		validateTextProcessor(processor, `processors[${index}]`),
	);
	const seen = new Set<string>();
	for (const processor of normalizedProcessors) {
		if (seen.has(processor.id)) {
			diagnostics.push({
				code: "TEXTPIPELINE_DUPLICATE_PROCESSOR_ID",
				severity: "error",
				message: `processor id is duplicated: ${processor.id}`,
				processorId: processor.id,
			});
		}
		seen.add(processor.id);
	}
	if (diagnostics.length > 0) {
		fail(
			"TEXTPIPELINE_INVALID_PIPELINE",
			"pipeline processors do not satisfy the final TextProcessor contract.",
			diagnostics,
		);
	}
	const normalizedOptions = normalizeOptions(options);
	const resources = options.resources ?? createPipelineResourceRegistry();
	const signature: JsonValue = {
		processors: normalizedProcessors.map(processorSignature),
		options: normalizedOptions as unknown as JsonValue,
		resources: resources.fingerprint(),
	};
	const fingerprint = stableHash64(stableJsonStringify(signature));
	const id = options.id ?? `pipeline:${fingerprint}`;
	if (id.length === 0) {
		fail("TEXTPIPELINE_INVALID_PIPELINE_ID", "pipeline id must be non-empty.");
	}
	return Object.freeze({
		id,
		processors: normalizedProcessors,
		resources,
		options: normalizedOptions,
		fingerprint,
	});
}
