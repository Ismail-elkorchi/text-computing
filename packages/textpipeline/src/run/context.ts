import type { PipelineCache } from "../cache/types.js";
import { stableId } from "../internal/ids.js";
import { assertJsonValue, type JsonValue } from "../internal/json.js";
import type { PipelineResourceRegistry } from "../pack/registry.js";
import type {
	PipelineDiagnostic,
	PipelineTraceEvent,
	ProcessorContext,
	TextPipeline,
} from "../processor/types.js";

export interface CreateProcessorContextInput {
	readonly pipeline: TextPipeline;
	readonly processorId: string;
	readonly documentId: string;
	readonly runId?: string;
	readonly signal?: AbortSignal;
	readonly resources: PipelineResourceRegistry;
	readonly cache?: PipelineCache;
	readonly metadata?: JsonValue;
	readonly diagnostics: PipelineDiagnostic[];
	readonly trace: PipelineTraceEvent[];
}

export function createProcessorContext(
	input: CreateProcessorContextInput,
): ProcessorContext {
	const runId =
		input.runId ??
		stableId("run", {
			pipelineId: input.pipeline.id,
			documentId: input.documentId,
		});
	return Object.freeze({
		runId,
		pipelineId: input.pipeline.id,
		processorId: input.processorId,
		documentId: input.documentId,
		...(input.signal === undefined ? {} : { signal: input.signal }),
		resources: input.resources,
		...(input.cache === undefined ? {} : { cache: input.cache }),
		...(input.metadata === undefined ? {} : { metadata: input.metadata }),
		emitDiagnostic(diagnostic: PipelineDiagnostic) {
			assertJsonValue(diagnostic, "diagnostic");
			input.diagnostics.push(diagnostic);
		},
		trace(event: PipelineTraceEvent) {
			assertJsonValue(event, "traceEvent");
			input.trace.push(event);
		},
	});
}
