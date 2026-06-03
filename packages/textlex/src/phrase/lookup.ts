import { keyForText } from "../internal/normalize.js";
import type { LexicalEntry, Lexicon } from "../lexicon/types.js";
import type {
	PhraseIndexEntry,
	PhraseLookupOptions,
	PhraseMatch,
	TokenValue,
} from "./types.js";

function tokenizePhrase(form: string): readonly string[] {
	return Object.freeze(form.split(/\s+/).filter((token) => token.length > 0));
}

function tokenText(token: TokenValue, options: PhraseLookupOptions): string {
	return (
		options.tokenText?.(token) ??
		(typeof token === "string" ? token : token.text)
	);
}

function tokenKey(token: TokenValue, options: PhraseLookupOptions): string {
	return phraseTokenKey(tokenText(token, options), options);
}

function phraseTokenKey(token: string, options: PhraseLookupOptions): string {
	return keyForText(token, {
		normalization: options.normalization ?? "NFC",
		casefold: options.casefold,
	});
}

function usesIndexedPolicy(options: PhraseLookupOptions): boolean {
	return (
		(options.normalization ?? "NFC") === "NFC" && options.casefold !== true
	);
}

function candidateTokens(
	candidate: PhraseIndexEntry,
	options: PhraseLookupOptions,
): readonly string[] {
	if (usesIndexedPolicy(options)) return candidate.tokens;
	return tokenizePhrase(candidate.form).map((token) =>
		phraseTokenKey(token, options),
	);
}

function candidatesForFirstToken(
	lexicon: Lexicon,
	first: string,
	options: PhraseLookupOptions,
): readonly {
	readonly candidate: PhraseIndexEntry;
	readonly tokens: readonly string[];
}[] {
	if (usesIndexedPolicy(options)) {
		return (lexicon.index.phrase.byFirstToken[first] ?? []).map(
			(candidate) => ({
				candidate,
				tokens: candidate.tokens,
			}),
		);
	}
	return lexicon.index.phrase.entries
		.map((candidate) => ({
			candidate,
			tokens: candidateTokens(candidate, options),
		}))
		.filter(({ tokens }) => tokens[0] === first)
		.sort(
			(left, right) =>
				right.tokens.length - left.tokens.length ||
				left.candidate.entryId.localeCompare(right.candidate.entryId) ||
				left.candidate.form.localeCompare(right.candidate.form),
		);
}

function labelsMatch(
	entry: LexicalEntry,
	filter: string | readonly string[] | undefined,
): boolean {
	if (filter === undefined) return true;
	const labels = new Set(entry.labels ?? []);
	const requested = Array.isArray(filter) ? filter : [filter];
	return requested.every((label) => labels.has(label));
}

function sourceSpans(
	tokens: readonly TokenValue[],
): readonly import("@ismail-elkorchi/textdoc/span").SpanRef[] | undefined {
	const spans = tokens
		.map((token) => (typeof token === "string" ? undefined : token.span))
		.filter(
			(span): span is import("@ismail-elkorchi/textdoc/span").SpanRef =>
				span !== undefined,
		);
	return spans.length === tokens.length ? Object.freeze(spans) : undefined;
}

export function phraseLookup<TEntry extends LexicalEntry>(
	lexicon: Lexicon<TEntry>,
	tokens: readonly TokenValue[],
	options: PhraseLookupOptions = {},
): PhraseMatch<TEntry>[] {
	const keys = tokens.map((token) => tokenKey(token, options));
	const maxPhraseLength =
		options.maxPhraseLength ?? lexicon.index.phrase.maxLength;
	const matches: PhraseMatch<TEntry>[] = [];
	let rank = 0;
	for (let start = 0; start < keys.length; start += 1) {
		const first = keys[start];
		if (first === undefined) continue;
		for (const { candidate, tokens } of candidatesForFirstToken(
			lexicon,
			first,
			options,
		)) {
			if (tokens.length > maxPhraseLength) continue;
			const end = start + tokens.length;
			if (end > keys.length) continue;
			let ok = true;
			for (let offset = 0; offset < tokens.length; offset += 1) {
				if (keys[start + offset] !== tokens[offset]) {
					ok = false;
					break;
				}
			}
			if (!ok) continue;
			const entry = lexicon.entries[candidate.entryIndex];
			if (entry === undefined || !labelsMatch(entry, options.labels)) continue;
			const tokenForms = Object.freeze(
				tokens.slice(start, end).map((token) => tokenText(token, options)),
			);
			const spans = sourceSpans(tokens.slice(start, end));
			matches.push({
				entry,
				entryId: entry.id,
				tokenStart: start,
				tokenEnd: end,
				tokenForms,
				matchedPhrase: tokenForms.join(" "),
				form: candidate.form,
				score: 1,
				rank,
				...(spans !== undefined ? { sourceSpans: spans } : {}),
			});
			rank += 1;
			if (options.overlap === "leftmost-longest") {
				start = end - 1;
				break;
			}
		}
	}
	return matches
		.sort(
			(left, right) =>
				left.tokenStart - right.tokenStart ||
				right.tokenEnd - left.tokenEnd ||
				left.entryId.localeCompare(right.entryId),
		)
		.slice(0, options.maxResults ?? matches.length);
}
