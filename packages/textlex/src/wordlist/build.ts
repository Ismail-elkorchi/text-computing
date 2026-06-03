import { deepFreeze } from "../internal/freeze.js";
import { assertJsonRecord } from "../internal/json.js";
import { keyForText } from "../internal/normalize.js";
import type {
	Stoplist,
	Wordlist,
	WordlistEntry,
	WordlistOptions,
} from "./types.js";

function entryFrom(
	value: string | WordlistEntry,
	options: WordlistOptions,
): WordlistEntry {
	if (typeof value === "string") {
		if (value.length === 0)
			throw new TypeError("wordlist form must be non-empty.");
		return {
			form: value,
			...(options.language !== undefined ? { language: options.language } : {}),
			...(options.script !== undefined ? { script: options.script } : {}),
			...(options.source !== undefined ? { source: options.source } : {}),
		};
	}
	if (value.form.length === 0)
		throw new TypeError("wordlist form must be non-empty.");
	if (value.features !== undefined)
		assertJsonRecord(value.features, "wordlist.features");
	return value;
}

export function buildWordlist(
	forms: Iterable<string | WordlistEntry>,
	options: WordlistOptions = {},
): Wordlist {
	const entries = Object.freeze(
		[...forms].map((entry) => entryFrom(entry, options)),
	);
	const sortedEntries = Object.freeze(
		[...entries].sort((left, right) => left.form.localeCompare(right.form)),
	);
	const formsOnly = Object.freeze(sortedEntries.map((entry) => entry.form));
	const keys = Object.freeze(
		formsOnly.map((form) =>
			keyForText(form, {
				normalization: options.normalization,
				casefold: options.casefold,
			}),
		),
	);
	return deepFreeze({
		id: options.id ?? "wordlist",
		entries: sortedEntries,
		forms: formsOnly,
		keys,
		...(options.normalization !== undefined
			? { normalization: options.normalization }
			: {}),
		casefold: options.casefold === true,
	});
}

export function buildStoplist(
	forms: Iterable<string | WordlistEntry>,
	options: WordlistOptions = {},
): Stoplist {
	return deepFreeze({
		...buildWordlist(forms, { id: options.id ?? "stoplist", ...options }),
		kind: "stoplist",
	});
}
