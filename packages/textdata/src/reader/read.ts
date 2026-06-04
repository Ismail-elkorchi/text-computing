import { readConlluDataset } from "../conllu/mod.js";
import {
	createDataset,
	type DatasetInput,
	type DatasetReadOptions,
	type DatasetRecord,
} from "../dataset/mod.js";
import { normalizeInputRecord } from "../dataset/records.js";
import { readIobDataset } from "../iob/mod.js";
import { readParallelDataset } from "../parallel/mod.js";
import { readTeiDataset, readXmlDataset } from "../tei/mod.js";
import { readConllDataset } from "./conll.js";
import { readDelimitedDataset } from "./csv.js";
import { resolveInputFormat } from "./input.js";
import { readJsonlDataset } from "./jsonl.js";
import { readPlainTextCollection } from "./plain-text.js";

function isRecordsDescriptor(
	input: DatasetInput,
): input is Extract<DatasetInput, { readonly kind: "records" }> {
	return (
		typeof input === "object" &&
		input !== null &&
		"kind" in input &&
		input.kind === "records"
	);
}

function isParallelDescriptor(
	input: DatasetInput,
): input is Extract<DatasetInput, { readonly kind: "parallel" }> {
	return (
		typeof input === "object" &&
		input !== null &&
		"kind" in input &&
		input.kind === "parallel"
	);
}

function descriptorText(
	input: DatasetInput,
): import("../internal/text.js").TextPayload | undefined {
	if (
		typeof input === "object" &&
		input !== null &&
		"kind" in input &&
		"text" in input
	) {
		return (
			input as { readonly text?: import("../internal/text.js").TextPayload }
		).text;
	}
	return undefined;
}

function optionsWithId(
	options: DatasetReadOptions,
	id: string | undefined,
): DatasetReadOptions {
	return id === undefined ? options : { ...options, id };
}

export async function readDataset(
	input: DatasetInput,
	options: DatasetReadOptions,
) {
	const format = resolveInputFormat(input, options);
	if (isRecordsDescriptor(input)) {
		const records: DatasetRecord[] = [];
		let index = 0;
		for await (const record of input.records) {
			records.push(normalizeInputRecord(record, index));
			index += 1;
		}
		return createDataset(records, {
			id: options.id ?? input.id ?? "records",
			metadata: { ...input.metadata, ...options.metadata, format: "records" },
		});
	}
	if (Array.isArray(input)) {
		return createDataset(
			input.map((record, index) => normalizeInputRecord(record, index)),
			{ id: options.id ?? "records", metadata: { ...options.metadata } },
		);
	}
	if (isParallelDescriptor(input)) {
		return readParallelDataset(
			input.records ?? {
				sourceText: input.sourceText ?? "",
				targetText: input.targetText ?? "",
				...(input.alignments !== undefined
					? { alignments: input.alignments }
					: {}),
			},
			optionsWithId(options, options.id ?? input.id),
		);
	}
	if (format === "plain-text") {
		if (
			typeof input === "object" &&
			input !== null &&
			"kind" in input &&
			input.kind === "plain-text" &&
			"texts" in input &&
			input.texts !== undefined
		) {
			return readPlainTextCollection(input.texts, options);
		}
		const payload = descriptorText(input);
		if (payload !== undefined) return readPlainTextCollection(payload, options);
		return readPlainTextCollection(input as never, options);
	}
	const payload = descriptorText(input);
	if (payload === undefined) {
		throw new TypeError(`format ${format} requires a text payload`);
	}
	if (format === "jsonl") return readJsonlDataset(payload, options);
	if (format === "csv") return readDelimitedDataset(payload, ",", options);
	if (format === "tsv") return readDelimitedDataset(payload, "\t", options);
	if (format === "conll") return readConllDataset(payload, options);
	if (format === "conllu") return readConlluDataset(payload, options);
	if (format === "iob") return readIobDataset(payload, options);
	if (format === "tei") return readTeiDataset(payload, options);
	if (format === "html" || format === "xml")
		return readXmlDataset(payload, { ...options, format });
	return readPlainTextCollection(payload, options);
}
