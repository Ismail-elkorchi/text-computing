import type {
	LexicalEntry,
	LexicalMatch,
	Lexicon,
	LexiconOptions,
	LookupOptions,
} from "../lexicon/types.js";

export interface GazetteerEntry extends LexicalEntry {
	readonly entityType?: string;
	readonly kbId?: string;
	readonly priority?: number;
	readonly aliases?: readonly string[];
	readonly disambiguationHints?: Readonly<Record<string, unknown>>;
}

export type Gazetteer = Lexicon<GazetteerEntry>;

export interface GazetteerOptions extends LexiconOptions {}

export interface GazetteerLookupOptions extends LookupOptions {
	readonly entityType?: string;
	readonly kbId?: string;
}

export type GazetteerMatch = LexicalMatch<GazetteerEntry>;
