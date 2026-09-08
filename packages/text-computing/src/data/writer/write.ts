import { serializeConllu } from "../conllu/mod.ts";
import type {
	DatasetOutput,
	DatasetRecord,
	DatasetWriteOptions,
	TextDataset,
} from "../dataset/mod.ts";
import { serializeIob } from "../iob/mod.ts";
import { serializeParallel } from "../parallel/mod.ts";
import { collectRecords } from "../stream/mod.ts";
import { serializeJsonl } from "./jsonl.ts";
import { writeChunk } from "./output.ts";
import { serializeTabular } from "./tabular.ts";

function isDatasetRecord(value: unknown): value is DatasetRecord {
	return typeof value === "object" && value !== null && "id" in value;
}

function toDatasetRecord(value: unknown, index: number): DatasetRecord {
	if (isDatasetRecord(value)) return value;
	if (typeof value === "string")
		return { id: `record:${index + 1}`, text: value };
	if (
		typeof value === "object" &&
		value !== null &&
		"id" in value &&
		"views" in value
	) {
		const document = value as DatasetRecord["document"];
		return {
			id: document?.id ?? `record:${index + 1}`,
			text: document?.views.raw?.text ?? "",
			...(document !== undefined ? { document } : {}),
		};
	}
	return { id: `record:${index + 1}`, fields: { value: String(value) } };
}

export async function writeDataset<T>(
	dataset: TextDataset<T>,
	output: DatasetOutput,
	options: DatasetWriteOptions = {},
): Promise<void> {
	const rawRecords = await collectRecords(dataset);
	const records = rawRecords.map((record, index) =>
		toDatasetRecord(record, index),
	);
	const format = options.format ?? "jsonl";
	let text: string;
	if (format === "jsonl") text = serializeJsonl(records, false);
	else if (format === "textdoc-jsonl") text = serializeJsonl(records, true);
	else if (format === "csv")
		text = serializeTabular(records, ",", options.fields);
	else if (format === "tsv")
		text = serializeTabular(records, "\t", options.fields);
	else if (format === "conllu") text = serializeConllu(records);
	else if (format === "iob") text = serializeIob(records);
	else if (format === "parallel") text = serializeParallel(records as never);
	else text = serializeJsonl(records, false);
	if (options.newline === "\r\n") text = text.replace(/\n/g, "\r\n");
	await writeChunk(output, text);
	if (output.kind === "records") {
		for (const record of records) output.records.push(record as never);
	}
}
