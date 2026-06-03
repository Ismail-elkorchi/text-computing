import { keyForText } from "../internal/normalize.js";
import type {
	AbbreviationEntry,
	AbbreviationTable,
	AbbreviationTableOptions,
} from "./types.js";

export function lookupAbbreviation(
	table: AbbreviationTable,
	text: string,
	options: AbbreviationTableOptions = {},
): AbbreviationEntry[] {
	const key = keyForText(text, {
		normalization: options.normalization ?? table.normalization,
		casefold: options.casefold ?? table.casefold,
	});
	return [...(table.byKey[key] ?? [])];
}
