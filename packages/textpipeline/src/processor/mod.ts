export { createPipeline } from "./compose.js";
export type {
	NormalizedPipelineOptions,
	PipelineCachePolicy,
	PipelineDiagnostic,
	PipelineDiagnosticSeverity,
	PipelineFailurePolicy,
	PipelineOptions,
	PipelineTraceEvent,
	PipelineTraceStatus,
	ProcessorContext,
	ProcessorOutput,
	ProcessorRequirement,
	TextPipeline,
	TextProcessor,
} from "./types.js";
export {
	validateProcessorOutput,
	validateProcessorRequirement,
	validateTextProcessor,
} from "./validate.js";
