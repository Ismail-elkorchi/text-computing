import { keyForText } from "../internal/normalize.js";
import type { AffixLookupOptions, AffixMatch, AffixTable } from "./types.js";

function labelMatches(
	labels: readonly string[] | undefined,
	filter: string | readonly string[] | undefined,
): boolean {
	if (filter === undefined) return true;
	const labelSet = new Set(labels ?? []);
	const requested = Array.isArray(filter) ? filter : [filter];
	return requested.every((label) => labelSet.has(label));
}

export function lookupAffixes(
	table: AffixTable,
	text: string,
	options: AffixLookupOptions = {},
): AffixMatch[] {
	const key = keyForText(text, {
		normalization: options.normalization ?? table.normalization,
		casefold: options.casefold ?? table.casefold,
	});
	const matches: AffixMatch[] = [];
	let rank = 0;
	for (const entry of table.entries) {
		if (options.kind !== undefined && entry.kind !== options.kind) continue;
		if (!labelMatches(entry.labels, options.labels)) continue;
		const form = keyForText(entry.form, {
			normalization: options.normalization ?? table.normalization,
			casefold: options.casefold ?? table.casefold,
		});
		const suffix =
			entry.suffixForm === undefined
				? undefined
				: keyForText(entry.suffixForm, {
						normalization: options.normalization ?? table.normalization,
						casefold: options.casefold ?? table.casefold,
					});
		let start = -1;
		let end = -1;
		if (entry.kind === "prefix" && key.startsWith(form)) {
			start = 0;
			end = form.length;
		} else if (entry.kind === "suffix" && key.endsWith(form)) {
			start = key.length - form.length;
			end = key.length;
		} else if (entry.kind === "infix") {
			start = key.indexOf(form);
			end = start < 0 ? -1 : start + form.length;
		} else if (
			entry.kind === "circumfix" &&
			suffix !== undefined &&
			key.startsWith(form) &&
			key.endsWith(suffix)
		) {
			start = 0;
			end = key.length;
		}
		if (start < 0) continue;
		matches.push({
			entry,
			form: entry.form,
			kind: entry.kind,
			start,
			end,
			score: 1,
			rank,
		});
		rank += 1;
	}
	return matches.sort(
		(left, right) =>
			left.start - right.start ||
			right.end - left.end ||
			left.entry.id.localeCompare(right.entry.id),
	);
}
