import type { TextDocument } from "@ismail-elkorchi/textdoc";
import { createTextDocument } from "../internal/document.js";
import { inputOrderId } from "../internal/ids.js";
import type { DatasetInputRecord, DatasetRecord } from "./types.js";
import { assertDatasetRecord } from "./validate.js";

function isTextDocumentLike(value: unknown): value is TextDocument {
	return (
		typeof value === "object" &&
		value !== null &&
		"id" in value &&
		"sources" in value &&
		"views" in value &&
		"layers" in value
	);
}

export function normalizeInputRecord(
	input: DatasetInputRecord,
	index: number,
): DatasetRecord {
	if (typeof input === "string") {
		const id = inputOrderId("record", index);
		return {
			id,
			text: input,
			document: createTextDocument(input, id, { sourceId: `source:${id}` }),
		};
	}
	if (isTextDocumentLike(input)) {
		return { id: input.id, document: input };
	}
	if (
		"sourceDocument" in input ||
		"targetDocument" in input ||
		"sourceText" in input
	) {
		return {
			id: input.id,
			fields: {
				sourceText: input.sourceText ?? null,
				targetText: input.targetText ?? null,
				sourceLanguage: input.sourceLanguage ?? null,
				targetLanguage: input.targetLanguage ?? null,
			},
			...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
		};
	}
	assertDatasetRecord(input);
	return input;
}
