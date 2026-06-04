import { isTextDocument, validateTextDocument } from "@ismail-elkorchi/textdoc";
import { fail } from "../internal/errors.js";
import { assertJsonObject, assertJsonValue } from "../internal/json.js";
import type { DatasetManifest, DatasetRecord, TextDataset } from "./types.js";

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isIterable(value: unknown): value is Iterable<unknown> {
	return (
		typeof value === "object" &&
		value !== null &&
		Symbol.iterator in value &&
		typeof (value as Iterable<unknown>)[Symbol.iterator] === "function"
	);
}

function isAsyncIterable(value: unknown): value is AsyncIterable<unknown> {
	return (
		typeof value === "object" &&
		value !== null &&
		Symbol.asyncIterator in value &&
		typeof (value as AsyncIterable<unknown>)[Symbol.asyncIterator] ===
			"function"
	);
}

export function assertDatasetManifest(manifest: DatasetManifest): void {
	if (
		!isRecord(manifest) ||
		typeof manifest.id !== "string" ||
		manifest.id === ""
	) {
		fail("TEXTDATA_INVALID_MANIFEST", "manifest id must be a non-empty string");
	}
	assertJsonValue(manifest as unknown);
}

export function assertDatasetRecord(record: DatasetRecord): void {
	if (!isRecord(record) || typeof record.id !== "string" || record.id === "") {
		fail("TEXTDATA_INVALID_RECORD", "record id must be a non-empty string");
	}
	if (record.metadata !== undefined) assertJsonObject(record.metadata);
	if (record.fields !== undefined) assertJsonObject(record.fields);
	if (record.labels !== undefined) {
		if (
			!Array.isArray(record.labels) ||
			record.labels.some((label) => typeof label !== "string" || label === "")
		) {
			fail("TEXTDATA_INVALID_RECORD", "labels must be non-empty strings");
		}
	}
	if (record.document !== undefined) {
		if (!isTextDocument(record.document)) {
			fail("TEXTDATA_INVALID_RECORD", "record document must be a TextDocument");
		}
		const validation = validateTextDocument(record.document);
		if (!validation.ok) {
			fail(
				"TEXTDATA_INVALID_RECORD",
				`record document references are invalid: ${validation.diagnostics.join(", ")}`,
			);
		}
	}
}

export function validateDataset<T>(dataset: TextDataset<T>): TextDataset<T> {
	if (
		!isRecord(dataset) ||
		typeof dataset.id !== "string" ||
		dataset.id === ""
	) {
		fail("TEXTDATA_INVALID_DATASET", "dataset id must be a non-empty string");
	}
	assertJsonObject(dataset.metadata);
	if (!isIterable(dataset.records) && !isAsyncIterable(dataset.records)) {
		fail(
			"TEXTDATA_INVALID_DATASET",
			"dataset records must be iterable or async iterable",
		);
	}
	return dataset;
}
