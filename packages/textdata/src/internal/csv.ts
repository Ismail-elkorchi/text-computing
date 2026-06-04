import { fail } from "./errors.js";

export interface CsvParseOptions {
	readonly delimiter: "," | "\t";
	readonly header?: boolean;
}

export interface CsvTable {
	readonly header: readonly string[];
	readonly rows: readonly (readonly string[])[];
}

export function parseDelimited(
	text: string,
	options: CsvParseOptions,
): CsvTable {
	const rows: string[][] = [];
	let row: string[] = [];
	let field = "";
	let quoted = false;
	let rowStart = true;

	for (let index = 0; index < text.length; index += 1) {
		const char = text[index];
		if (quoted) {
			if (char === '"') {
				if (text[index + 1] === '"') {
					field += '"';
					index += 1;
				} else {
					quoted = false;
				}
			} else {
				field += char;
			}
			continue;
		}
		if (char === '"') {
			if (!rowStart && field.length > 0) {
				fail("TEXTDATA_CSV_QUOTE", "quote appears inside unquoted field");
			}
			quoted = true;
			rowStart = false;
			continue;
		}
		if (char === options.delimiter) {
			row.push(field);
			field = "";
			rowStart = true;
			continue;
		}
		if (char === "\n" || char === "\r") {
			if (char === "\r" && text[index + 1] === "\n") index += 1;
			row.push(field);
			rows.push(row);
			row = [];
			field = "";
			rowStart = true;
			continue;
		}
		field += char;
		rowStart = false;
	}
	if (quoted) fail("TEXTDATA_CSV_QUOTE", "unterminated quoted field");
	if (field.length > 0 || row.length > 0 || text.length === 0) {
		row.push(field);
		rows.push(row);
	}
	const header = options.header === false ? [] : (rows.shift() ?? []);
	return { header, rows };
}

function quoteField(value: string, delimiter: "," | "\t"): string {
	if (
		value.includes('"') ||
		value.includes("\n") ||
		value.includes("\r") ||
		value.includes(delimiter)
	) {
		return `"${value.replace(/"/g, '""')}"`;
	}
	return value;
}

export function serializeDelimited(
	header: readonly string[],
	rows: readonly (readonly string[])[],
	delimiter: "," | "\t",
): string {
	return [...(header.length > 0 ? [header] : []), ...rows]
		.map((row) =>
			row.map((field) => quoteField(field, delimiter)).join(delimiter),
		)
		.join("\n");
}
