export { normalizeDatasetManifest } from "./manifest.js";
export { mergeMetadata } from "./metadata.js";
export { normalizeInputRecord } from "./records.js";
export type {
	AlignmentLink,
	DatasetDiagnostic,
	DatasetDiagnosticSeverity,
	DatasetFormat,
	DatasetInput,
	DatasetInputRecord,
	DatasetManifest,
	DatasetOutput,
	DatasetReadOptions,
	DatasetRecord,
	DatasetSourceDescriptor,
	DatasetSplits,
	DatasetWriteFormat,
	DatasetWriteOptions,
	LabeledSample,
	ParallelRecord,
	SplitOptions,
	SplitReport,
	SplitSpec,
	TextDataset,
} from "./types.js";
export {
	assertDatasetManifest,
	assertDatasetRecord,
	validateDataset,
} from "./validate.js";

import { mergeMetadata } from "./metadata.js";
import type { TextDataset } from "./types.js";
import { validateDataset } from "./validate.js";

export interface CreateDatasetOptions {
	readonly id: string;
	readonly metadata?: Readonly<Record<string, unknown>>;
}

export function createDataset<T>(
	records: AsyncIterable<T> | Iterable<T>,
	options: CreateDatasetOptions,
): TextDataset<T> {
	return validateDataset({
		id: options.id,
		metadata: mergeMetadata(options.metadata),
		records,
	});
}
