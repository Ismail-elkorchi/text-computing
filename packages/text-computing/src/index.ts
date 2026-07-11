export type { PackageName } from "./internal/constants.js";
export { packageName } from "./internal/constants.js";
export { analyze, inspect, load, support } from "./internal/load.js";
export {
	createFetchResourceReader,
	type TextPackFetchResourceReaderOptions,
	type TextPackResourceReader,
} from "./internal/readers.js";
export type {
	TextComputingAnalyzeOptions,
	TextComputingCapabilitySlotReport,
	TextComputingDocument,
	TextComputingDocumentAnalysisOptions,
	TextComputingDocumentJson,
	TextComputingDocumentTask,
	TextComputingEntitySummary,
	TextComputingEvidence,
	TextComputingLemmaSummary,
	TextComputingLoadOptions,
	TextComputingLoadTarget,
	TextComputingMorphologySummary,
	TextComputingNlp,
	TextComputingPackInspection,
	TextComputingPipelineRun,
	TextComputingPipelineRunOptions,
	TextComputingQualityFindingSummary,
	TextComputingQualityReportEvidence,
	TextComputingQualitySummary,
	TextComputingResourceInspection,
	TextComputingSearchTokenSummary,
	TextComputingSupportReport,
	TextComputingTaskPreset,
	TextComputingTaskSlotEvidence,
	TextComputingToken,
	TextPackModule,
} from "./internal/types.js";
