import { toTextDocJson } from "@ismail-elkorchi/textdoc";
import type { DatasetRecord } from "../dataset/mod.js";
import { type JsonObject, stableJsonStringify } from "../internal/json.js";

function recordToJson(record: DatasetRecord, textdocOnly: boolean): JsonObject {
	if (textdocOnly) {
		if (record.document === undefined) {
			return {
				id: record.id,
				text: record.text ?? "",
				metadata: record.metadata ?? {},
			};
		}
		return toTextDocJson(record.document) as unknown as JsonObject;
	}
	return {
		id: record.id,
		...(record.text !== undefined ? { text: record.text } : {}),
		...(record.document !== undefined
			? { document: toTextDocJson(record.document) }
			: {}),
		...(record.labels !== undefined ? { labels: record.labels } : {}),
		...(record.fields !== undefined ? { fields: record.fields } : {}),
		...(record.metadata !== undefined ? { metadata: record.metadata } : {}),
		...(record.split !== undefined ? { split: record.split } : {}),
	};
}

export function serializeJsonl(
	records: readonly DatasetRecord[],
	textdocOnly = false,
): string {
	return records
		.map((record) => stableJsonStringify(recordToJson(record, textdocOnly)))
		.join("\n");
}
