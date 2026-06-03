import { deepFreeze } from "../internal/freeze.js";
import { assertJsonRecord } from "../internal/json.js";
import type { AffixEntry, AffixTable, AffixTableOptions } from "./types.js";

const affixKinds = new Set(["prefix", "suffix", "infix", "circumfix"]);

export function buildAffixTable(
	entries: Iterable<AffixEntry>,
	options: AffixTableOptions = {},
): AffixTable {
	const normalized = [...entries].map((entry, index) => {
		if (entry.id.length === 0)
			throw new TypeError(`entries[${index}].id must be non-empty.`);
		if (entry.form.length === 0)
			throw new TypeError(`entries[${index}].form must be non-empty.`);
		if (!affixKinds.has(entry.kind))
			throw new TypeError(`entries[${index}].kind is invalid.`);
		if (entry.kind === "circumfix" && (entry.suffixForm ?? "").length === 0) {
			throw new TypeError(
				`entries[${index}].suffixForm is required for circumfix entries.`,
			);
		}
		if (entry.features !== undefined)
			assertJsonRecord(entry.features, `entries[${index}].features`);
		return deepFreeze(entry);
	});
	return deepFreeze({
		id: options.id ?? "affix-table",
		entries: Object.freeze(
			[...normalized].sort((left, right) => left.id.localeCompare(right.id)),
		),
		...(options.normalization !== undefined
			? { normalization: options.normalization }
			: {}),
		casefold: options.casefold === true,
	});
}
