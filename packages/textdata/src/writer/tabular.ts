import type { DatasetRecord } from "../dataset/mod.js";
import { compareCodePointStrings } from "../internal/compare.js";
import { serializeDelimited } from "../internal/csv.js";

function allFields(records: readonly DatasetRecord[]): readonly string[] {
	const fields = new Set<string>(["id", "text"]);
	for (const record of records) {
		for (const key of Object.keys(record.fields ?? {})) fields.add(key);
	}
	return [...fields].sort((left, right) =>
		left < right ? -1 : left > right ? 1 : 0,
	);
}

export function serializeTabular(
	records: readonly DatasetRecord[],
	delimiter: "," | "\t",
	fields?: readonly string[],
): string {
	const header = fields ?? allFields(records);
	const finalHeader =
		fields === undefined
			? [...header].sort(compareCodePointStrings)
			: [...header];
	const rows = records.map((record) =>
		finalHeader.map((field) => {
			if (field === "id") return record.id;
			if (field === "text")
				return record.text ?? record.document?.views.raw?.text ?? "";
			const value = record.fields?.[field] ?? record.metadata?.[field] ?? "";
			return typeof value === "string" ? value : JSON.stringify(value);
		}),
	);
	return serializeDelimited(finalHeader, rows, delimiter);
}
