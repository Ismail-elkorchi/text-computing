import type { SpanRef } from "@ismail-elkorchi/textdoc/span";
import type { LexicalEntry } from "../lexicon/types.js";

export type TokenValue =
	| string
	| {
			readonly text: string;
			readonly id?: string;
			readonly span?: SpanRef;
			readonly language?: string;
			readonly script?: string;
			readonly features?: Readonly<Record<string, unknown>>;
	  };

export interface PhraseIndexEntry {
	readonly entryId: string;
	readonly form: string;
	readonly tokens: readonly string[];
	readonly entryIndex: number;
	readonly formIndex: number;
}

export interface TokenPhraseIndex {
	readonly maxLength: number;
	readonly entries: readonly PhraseIndexEntry[];
	readonly byFirstToken: Readonly<Record<string, readonly PhraseIndexEntry[]>>;
}

export interface PhraseLookupOptions {
	readonly tokenText?: (token: TokenValue) => string;
	readonly maxPhraseLength?: number;
	readonly overlap?: "all" | "leftmost-longest";
	readonly casefold?: boolean;
	readonly normalization?: "NFC" | "NFD" | "NFKC" | "NFKD";
	readonly labels?: string | readonly string[];
	readonly maxResults?: number;
}

export interface PhraseMatch<TEntry extends LexicalEntry = LexicalEntry> {
	readonly entry: TEntry;
	readonly entryId: string;
	readonly tokenStart: number;
	readonly tokenEnd: number;
	readonly tokenForms: readonly string[];
	readonly matchedPhrase: string;
	readonly form: string;
	readonly score: number;
	readonly rank: number;
	readonly sourceSpans?: readonly SpanRef[];
}
