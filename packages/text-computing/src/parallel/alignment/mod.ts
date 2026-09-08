export type {
	AlignmentAnnotateOptions,
	AlignmentLink,
	AlignmentRelation,
	JsonObject,
	ParallelDiagnostic,
	ParallelDiagnosticSeverity,
	ParallelDocument,
} from "../internal/core.ts";
export {
	annotateAlignment,
	buildAlignmentLink,
	compareAlignmentLinks,
	parallelEvidence,
	TextParallelError,
} from "../internal/core.ts";
