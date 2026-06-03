import { keyForText } from "../internal/normalize.js";
import type {
	PronunciationLexicon,
	PronunciationLookupOptions,
	PronunciationMatch,
} from "./types.js";

function labelMatches(
	labels: readonly string[] | undefined,
	filter: string | readonly string[] | undefined,
): boolean {
	if (filter === undefined) return true;
	const labelSet = new Set(labels ?? []);
	const requested = Array.isArray(filter) ? filter : [filter];
	return requested.every((label) => labelSet.has(label));
}

export function lookupPronunciations(
	lexicon: PronunciationLexicon,
	form: string,
	options: PronunciationLookupOptions = {},
): PronunciationMatch[] {
	const key = keyForText(form, {
		normalization: options.normalization ?? lexicon.normalization,
		casefold: options.casefold ?? lexicon.casefold,
	});
	const matches: PronunciationMatch[] = [];
	let rank = 0;
	for (const entry of lexicon.byKey[key] ?? []) {
		if (options.notation !== undefined && entry.notation !== options.notation)
			continue;
		if (!labelMatches(entry.labels, options.labels)) continue;
		for (const pronunciation of entry.pronunciations) {
			matches.push({
				entry,
				form: entry.form,
				pronunciation,
				notation: entry.notation,
				rank,
			});
			rank += 1;
		}
	}
	return matches;
}
