import type {
	LexicalEntry,
	LexicalMatch,
	Lexicon,
	LexiconOptions,
	LookupOptions,
} from "../lexicon/types.js";

export interface TermEntry extends LexicalEntry {
	readonly domains?: readonly string[];
	readonly termType?: string;
	readonly variants?: readonly string[];
}

export type Termbase = Lexicon<TermEntry>;
export interface TermbaseOptions extends LexiconOptions {}
export interface TermbaseLookupOptions extends LookupOptions {
	readonly domain?: string;
	readonly termType?: string;
}
export type TermMatch = LexicalMatch<TermEntry>;
