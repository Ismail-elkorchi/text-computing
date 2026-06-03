import { deepFreeze, orderedRecord } from "../internal/freeze.js";
import { assertJsonRecord } from "../internal/json.js";
import { keyForText } from "../internal/normalize.js";
import type {
	AbbreviationEntry,
	AbbreviationTable,
	AbbreviationTableOptions,
} from "./types.js";

export function buildAbbreviationTable(
	entries: Iterable<AbbreviationEntry>,
	options: AbbreviationTableOptions = {},
): AbbreviationTable {
	const byKey: Record<string, AbbreviationEntry[]> = {};
	const normalized = [...entries].map((entry, index) => {
		if (entry.form.length === 0)
			throw new TypeError(`entries[${index}].form must be non-empty.`);
		if (!Array.isArray(entry.expansions) || entry.expansions.length === 0) {
			throw new TypeError(`entries[${index}].expansions must be non-empty.`);
		}
		if (entry.features !== undefined)
			assertJsonRecord(entry.features, `entries[${index}].features`);
		return deepFreeze({
			...entry,
			expansions: Object.freeze([...entry.expansions]),
		});
	});
	const sorted = Object.freeze(
		[...normalized].sort((left, right) => left.form.localeCompare(right.form)),
	);
	for (const entry of sorted) {
		const key = keyForText(entry.form, {
			normalization: options.normalization,
			casefold: options.casefold,
		});
		const bucket = byKey[key] ?? [];
		bucket.push(entry);
		byKey[key] = bucket;
	}
	const frozen: Record<string, readonly AbbreviationEntry[]> = {};
	for (const [key, values] of Object.entries(byKey))
		frozen[key] = Object.freeze(values);
	return deepFreeze({
		id: options.id ?? "abbreviation-table",
		entries: sorted,
		byKey: orderedRecord(frozen),
		...(options.normalization !== undefined
			? { normalization: options.normalization }
			: {}),
		casefold: options.casefold === true,
	});
}
