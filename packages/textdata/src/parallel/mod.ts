import {
	createDataset,
	type DatasetReadOptions,
	type ParallelRecord,
} from "../dataset/mod.js";
import { readTextPayload, type TextPayload } from "../internal/text.js";
import { parallelLinesToRecords } from "./records.js";

export { parseAlignmentLinks } from "./align.js";
export { parseParallelTable } from "./parse.js";
export { parallelLinesToRecords } from "./records.js";
export { serializeParallel } from "./serialize.js";

export async function readParallelDataset(
	input:
		| {
				readonly sourceText: TextPayload;
				readonly targetText: TextPayload;
				readonly alignments?: TextPayload;
		  }
		| readonly ParallelRecord[],
	options: DatasetReadOptions = {},
) {
	let records: readonly ParallelRecord[];
	if (Array.isArray(input)) {
		records = input;
	} else {
		const descriptor = input as {
			readonly sourceText: TextPayload;
			readonly targetText: TextPayload;
			readonly alignments?: TextPayload;
		};
		records = parallelLinesToRecords(
			await readTextPayload(descriptor.sourceText),
			await readTextPayload(descriptor.targetText),
			descriptor.alignments === undefined
				? ""
				: await readTextPayload(descriptor.alignments),
			options.sourceLanguage,
			options.targetLanguage,
		);
	}
	return createDataset(records, {
		id: options.id ?? "parallel",
		metadata: { ...options.metadata, format: "parallel" },
	});
}
