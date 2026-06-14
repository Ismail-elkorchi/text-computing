import { deepFreeze, orderedRecord } from "../internal/freeze.js";
import { keyForText } from "../internal/normalize.js";
import type { LexicalEntry } from "../lexicon/types.js";
import type { PhraseIndexEntry, TokenPhraseIndex } from "./types.js";

function tokenizePhrase(form: string): readonly string[] {
	return Object.freeze(form.split(/\s+/).filter((token) => token.length > 0));
}

function entryForms(entry: LexicalEntry): readonly string[] {
	return Object.freeze([
		...entry.forms,
		...(entry.aliases ?? []),
		...(entry.variants ?? []),
		...(entry.inflectedForms ?? []),
	]);
}

export function buildTokenPhraseIndex(
	entries: Iterable<LexicalEntry>,
): TokenPhraseIndex {
	const phraseEntries: PhraseIndexEntry[] = [];
	const byFirstToken: Record<string, PhraseIndexEntry[]> = Object.create(null);
	let maxLength = 0;
	let entryIndex = 0;
	for (const entry of entries) {
		const forms = entryForms(entry);
		for (let formIndex = 0; formIndex < forms.length; formIndex += 1) {
			const form = forms[formIndex];
			if (form === undefined) continue;
			const tokens = tokenizePhrase(form).map((token) =>
				keyForText(token, { normalization: "NFC" }),
			);
			if (tokens.length === 0) continue;
			maxLength = Math.max(maxLength, tokens.length);
			const phraseEntry: PhraseIndexEntry = deepFreeze({
				entryId: entry.id,
				form,
				tokens: Object.freeze(tokens),
				entryIndex,
				formIndex,
			});
			phraseEntries.push(phraseEntry);
			const first = tokens[0] ?? "";
			const bucket = Object.hasOwn(byFirstToken, first)
				? (byFirstToken[first] ?? [])
				: [];
			bucket.push(phraseEntry);
			byFirstToken[first] = bucket;
		}
		entryIndex += 1;
	}
	const frozenBuckets: Record<string, readonly PhraseIndexEntry[]> =
		Object.create(null);
	for (const [key, values] of Object.entries(byFirstToken)) {
		frozenBuckets[key] = Object.freeze(
			[...values].sort(
				(left, right) =>
					right.tokens.length - left.tokens.length ||
					left.entryId.localeCompare(right.entryId) ||
					left.form.localeCompare(right.form),
			),
		);
	}
	return deepFreeze({
		maxLength,
		entries: Object.freeze(phraseEntries),
		byFirstToken: orderedRecord(frozenBuckets),
	});
}
