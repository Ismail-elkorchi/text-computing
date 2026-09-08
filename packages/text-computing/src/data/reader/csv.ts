import {
	createDataset,
	type DatasetReadOptions,
	type DatasetRecord,
} from "../dataset/mod.ts";
import { parseDelimited } from "../internal/csv.ts";
import { createTextDocument } from "../internal/document.ts";
import { inputOrderId } from "../internal/ids.ts";
import { readTextPayload, type TextPayload } from "../internal/text.ts";

export async function readDelimitedDataset(
	text: TextPayload,
	delimiter: "," | "\t",
	options: DatasetReadOptions = {},
) {
	const source = await readTextPayload(text);
	const table = parseDelimited(source, { delimiter });
	const textColumn = options.textColumn ?? "text";
	const idColumn = options.idColumn ?? "id";
	const labelColumns =
		options.labelColumns ??
		(options.labelColumn === undefined ? [] : [options.labelColumn]);
	const metadataColumns = options.metadataColumns ?? [];
	const records: DatasetRecord[] = table.rows.map((row, rowIndex) => {
		const values = Object.fromEntries(
			table.header.map((key, columnIndex) => [key, row[columnIndex] ?? ""]),
		);
		const idValue = values[idColumn];
		const id =
			idValue === undefined || idValue === ""
				? inputOrderId("record", rowIndex)
				: idValue;
		const textValue = values[textColumn] ?? "";
		const labels = labelColumns
			.map((column) => values[column] ?? "")
			.filter((value) => value !== "");
		const metadata = Object.fromEntries(
			metadataColumns.map((column) => [column, values[column] ?? ""]),
		);
		return {
			id,
			text: textValue,
			document: createTextDocument(textValue, `doc:${id}`),
			...(labels.length > 0 ? { labels } : {}),
			fields: values,
			...(metadataColumns.length > 0 ? { metadata } : {}),
		};
	});
	return createDataset(records, {
		id: options.id ?? (delimiter === "\t" ? "tsv" : "csv"),
		metadata: {
			...options.metadata,
			format: delimiter === "\t" ? "tsv" : "csv",
		},
	});
}
