import { fromTextDocJson } from "@ismail-elkorchi/textdoc";
import {
	createDataset,
	type DatasetReadOptions,
	type DatasetRecord,
} from "../dataset/mod.js";
import { createTextDocument } from "../internal/document.js";
import { fail } from "../internal/errors.js";
import { inputOrderId } from "../internal/ids.js";
import { assertJsonObject } from "../internal/json.js";
import {
	readTextPayload,
	splitLines,
	type TextPayload,
} from "../internal/text.js";

function stringArray(value: unknown): readonly string[] | undefined {
	if (value === undefined) return undefined;
	if (
		!Array.isArray(value) ||
		value.some((entry) => typeof entry !== "string")
	) {
		fail("TEXTDATA_JSONL_RECORD", "labels must be strings");
	}
	return value;
}

function jsonlRowToRecord(
	row: Record<string, unknown>,
	index: number,
): DatasetRecord {
	const id =
		typeof row.id === "string" && row.id !== ""
			? row.id
			: inputOrderId("record", index);
	const document =
		row.document === undefined
			? typeof row.text === "string"
				? createTextDocument(row.text, `doc:${id}`)
				: undefined
			: fromTextDocJson(row.document as never);
	return {
		id,
		...(typeof row.text === "string" ? { text: row.text } : {}),
		...(document !== undefined ? { document } : {}),
		...(row.labels !== undefined
			? { labels: stringArray(row.labels) ?? [] }
			: {}),
		...(row.fields !== undefined ? { fields: row.fields as never } : {}),
		...(row.metadata !== undefined ? { metadata: row.metadata as never } : {}),
		...(typeof row.split === "string" ? { split: row.split } : {}),
	};
}

export async function readJsonlDataset(
	text: TextPayload,
	options: DatasetReadOptions = {},
) {
	const source = await readTextPayload(text);
	const records: DatasetRecord[] = [];
	for (const [lineIndex, line] of splitLines(source).entries()) {
		if (line.trim() === "") continue;
		try {
			const parsed = JSON.parse(line) as unknown;
			assertJsonObject(parsed, `$[${lineIndex + 1}]`);
			records.push(
				jsonlRowToRecord(parsed as Record<string, unknown>, lineIndex),
			);
		} catch (error) {
			if (options.errors === "continue") continue;
			throw error;
		}
	}
	return createDataset(records, {
		id: options.id ?? "jsonl",
		metadata: { ...options.metadata, format: "jsonl" },
	});
}
