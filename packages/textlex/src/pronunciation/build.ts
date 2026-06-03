import { deepFreeze, orderedRecord } from "../internal/freeze.js";
import { assertJsonRecord } from "../internal/json.js";
import { keyForText } from "../internal/normalize.js";
import type {
	PronunciationEntry,
	PronunciationLexicon,
	PronunciationLexiconOptions,
} from "./types.js";

export function buildPronunciationLexicon(
	entries: Iterable<PronunciationEntry>,
	options: PronunciationLexiconOptions = {},
): PronunciationLexicon {
	const byKey: Record<string, PronunciationEntry[]> = {};
	const normalized = [...entries].map((entry, index) => {
		if (entry.id.length === 0)
			throw new TypeError(`entries[${index}].id must be non-empty.`);
		if (entry.form.length === 0)
			throw new TypeError(`entries[${index}].form must be non-empty.`);
		if (entry.notation.length === 0)
			throw new TypeError(`entries[${index}].notation must be non-empty.`);
		if (
			!Array.isArray(entry.pronunciations) ||
			entry.pronunciations.length === 0
		) {
			throw new TypeError(
				`entries[${index}].pronunciations must be non-empty.`,
			);
		}
		if (entry.features !== undefined)
			assertJsonRecord(entry.features, `entries[${index}].features`);
		return deepFreeze({
			...entry,
			pronunciations: Object.freeze([...entry.pronunciations]),
		});
	});
	const sorted = Object.freeze(
		[...normalized].sort((left, right) => left.id.localeCompare(right.id)),
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
	const frozen: Record<string, readonly PronunciationEntry[]> = {};
	for (const [key, values] of Object.entries(byKey))
		frozen[key] = Object.freeze(values);
	return deepFreeze({
		id: options.id ?? "pronunciation-lexicon",
		entries: sorted,
		byKey: orderedRecord(frozen),
		...(options.normalization !== undefined
			? { normalization: options.normalization }
			: {}),
		casefold: options.casefold === true,
	});
}
