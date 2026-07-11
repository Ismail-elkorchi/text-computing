import type { TextDocument, TextView } from "@ismail-elkorchi/textdoc";
import type { ResourceKind } from "@ismail-elkorchi/textpack";
import type { PipelineCache } from "../cache/types.js";
import type { JsonValue } from "../internal/json.js";
import type { PipelineResourceRegistry } from "../pack/registry.js";

export type PipelineDiagnosticSeverity = "info" | "warning" | "error";
export type PipelineFailurePolicy = "throw" | "continue";
export type PipelineCachePolicy = "none" | "read-through";

export interface PipelineDiagnostic {
	readonly code: string;
	readonly severity: PipelineDiagnosticSeverity;
	readonly message: string;
	readonly processorId?: string;
	readonly path?: string;
	readonly details?: JsonValue;
}

export interface ProcessorRequirement {
	readonly layer?: string;
	readonly viewKind?: TextView["kind"];
	readonly resourceKind?: ResourceKind;
	readonly capability?: string;
	/** Selects the producer when more than one processor provides the document requirement. */
	readonly providerId?: string;
}

export interface ProcessorOutput {
	readonly layer?: string;
	readonly viewKind?: TextView["kind"];
	readonly annotations?: readonly string[];
}

export interface ProcessorContext {
	readonly runId: string;
	readonly pipelineId: string;
	readonly processorId: string;
	readonly documentId: string;
	readonly signal?: AbortSignal;
	readonly resources: PipelineResourceRegistry;
	readonly cache?: PipelineCache;
	readonly metadata?: JsonValue;
	emitDiagnostic(diagnostic: PipelineDiagnostic): void;
	trace(event: PipelineTraceEvent): void;
}

export interface TextProcessor {
	readonly id: string;
	readonly version: string;
	readonly requires?: readonly ProcessorRequirement[];
	readonly provides: readonly ProcessorOutput[];
	process(
		doc: TextDocument,
		context: ProcessorContext,
	): Promise<TextDocument> | TextDocument;
}

export interface PipelineOptions {
	readonly id?: string;
	readonly resources?: PipelineResourceRegistry;
	readonly metadata?: JsonValue;
	readonly strict?: boolean;
	readonly failurePolicy?: PipelineFailurePolicy;
	readonly cachePolicy?: PipelineCachePolicy;
}

export interface NormalizedPipelineOptions {
	readonly strict: boolean;
	readonly failurePolicy: PipelineFailurePolicy;
	readonly cachePolicy: PipelineCachePolicy;
	readonly metadata?: JsonValue;
}

export interface TextPipeline {
	readonly id: string;
	readonly processors: readonly TextProcessor[];
	readonly resources: PipelineResourceRegistry;
	readonly options: NormalizedPipelineOptions;
	readonly fingerprint: string;
}

export type PipelineTraceStatus =
	| "started"
	| "completed"
	| "cached"
	| "failed"
	| "skipped";

export interface PipelineTraceEvent {
	readonly runId: string;
	readonly pipelineId: string;
	readonly processorId: string;
	readonly status: PipelineTraceStatus;
	readonly cacheKey?: string;
	readonly diagnostics?: readonly PipelineDiagnostic[];
	readonly details?: JsonValue;
}
