import type { Diagnostic, DiagnosticSeverity } from "../../diagnostics.ts";
import type { TextDocument, TextView } from "../../document/mod.ts";
import type { ResourceKind } from "../../packs/index.ts";
import type { PipelineCache } from "../cache/types.ts";
import type { JsonValue } from "../internal/json.ts";
import type { PipelineResourceRegistry } from "../pack/registry.ts";

export type PipelineDiagnosticSeverity = DiagnosticSeverity;
export type PipelineFailurePolicy = "throw" | "continue";
export type PipelineCachePolicy = "none" | "read-through";

export interface PipelineDiagnostic extends Diagnostic<JsonValue> {
	readonly processorId?: string;
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
	/** Content identity for configured rules, models, or other executable state. */
	readonly fingerprint?: string;
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
