export { normalizeDatasetManifest } from "./manifest.ts";
export { mergeMetadata } from "./metadata.ts";
export { normalizeInputRecord } from "./records.ts";
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
} from "./types.ts";
export {
	assertDatasetManifest,
	assertDatasetRecord,
	validateDataset,
} from "./validate.ts";

import { mergeMetadata } from "./metadata.ts";
import type { TextDataset } from "./types.ts";
import { validateDataset } from "./validate.ts";

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
