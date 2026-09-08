export { analysisOf, analysisProcessor } from "./analysis.ts";
export type { DocumentJson, TextDocument } from "./document/mod.ts";
export {
	createDocument,
	fromDocumentJson,
	toDocumentJson,
} from "./document/mod.ts";
export type { PackageName } from "./internal/constants.ts";
export { packageName, packageVersion } from "./internal/constants.ts";
export { nerModelSchemaId } from "./internal/entities.ts";
export { analyze, inspect, load, support } from "./internal/load.ts";
export {
	createFetchResourceReader,
	type TextPackFetchResourceReaderOptions,
	type TextPackResourceReader,
} from "./internal/readers.ts";
export type {
	AnalyzedDocument,
	DocumentAnalysis,
	TextComputingAnalyzeOptions,
	TextComputingCapabilitySlotReport,
	TextComputingDocumentAnalysisOptions,
	TextComputingDocumentTask,
	TextComputingEntityExecutionResult,
	TextComputingEntityExecutor,
	TextComputingEntityExecutorRequest,
	TextComputingEntityLinkSummary,
	TextComputingEntitySummary,
	TextComputingEvidence,
	TextComputingLemmaSummary,
	TextComputingLoadOptions,
	TextComputingLoadTarget,
	TextComputingModelExecutionEvidence,
	TextComputingMorphologySummary,
	TextComputingNerModel,
	TextComputingNlp,
	TextComputingPackInspection,
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
} from "./internal/types.ts";
export type {
	TextComputingOnnxBackend,
	TextComputingOnnxSession,
	TextComputingOnnxTensor,
} from "./onnx.ts";
export { createOnnxEntityExecutor } from "./onnx.ts";
