import type { TextlexNormalizationForm } from "../internal/normalize.js";
import type { TokenPhraseIndex } from "../phrase/types.js";
import type {
	Dawg,
	DoubleArrayTrie,
	MinimalPerfectHashMap,
	Trie,
} from "../trie/mod.js";

export type DuplicatePolicy = "allow" | "reject";
export type LookupMode =
	| "exact"
	| "normalized"
	| "casefold"
	| "prefix"
	| "suffix"
	| "fuzzy";

export interface LexicalEntry {
	readonly id: string;
	readonly forms: readonly string[];
	readonly canonical?: string;
	readonly labels?: readonly string[];
	readonly features?: Readonly<Record<string, unknown>>;
	readonly language?: string;
	readonly script?: string;
	readonly source?: string;
	readonly aliases?: readonly string[];
	readonly variants?: readonly string[];
	readonly inflectedForms?: readonly string[];
}

export interface LexiconOptions {
	readonly id?: string;
	readonly duplicateIdPolicy?: DuplicatePolicy;
	readonly duplicateFormPolicy?: DuplicatePolicy;
	readonly normalization?: TextlexNormalizationForm;
	readonly casefold?: boolean;
	readonly language?: string;
	readonly script?: string;
	readonly source?: string;
}

export interface LookupOptions {
	readonly mode?: LookupMode | readonly LookupMode[];
	readonly normalization?: TextlexNormalizationForm;
	readonly casefold?: boolean;
	readonly language?: string;
	readonly script?: string;
	readonly labels?: string | readonly string[];
	readonly source?: string;
	readonly maxResults?: number;
	readonly maxDistance?: number;
	readonly maxCandidates?: number;
}

export interface LexiconFormRef {
	readonly entryId: string;
	readonly form: string;
	readonly key: string;
	readonly sourceKind: "form" | "alias" | "variant" | "inflected";
	readonly entryIndex: number;
	readonly formIndex: number;
}

export interface LexiconIndex {
	readonly exact: Readonly<Record<string, readonly LexiconFormRef[]>>;
	readonly normalized: Readonly<Record<string, readonly LexiconFormRef[]>>;
	readonly casefold: Readonly<Record<string, readonly LexiconFormRef[]>>;
	readonly keys: readonly string[];
	readonly trie: Trie;
	readonly doubleArrayTrie: DoubleArrayTrie;
	readonly dawg: Dawg;
	readonly minimalPerfectHash: MinimalPerfectHashMap;
	readonly phrase: TokenPhraseIndex;
}

export interface Lexicon<TEntry extends LexicalEntry = LexicalEntry> {
	readonly id: string;
	readonly entries: readonly TEntry[];
	readonly index: LexiconIndex;
}

export type Dictionary = Lexicon<LexicalEntry>;

export interface LexicalMatch<TEntry extends LexicalEntry = LexicalEntry> {
	readonly entry: TEntry;
	readonly entryId: string;
	readonly form: string;
	readonly canonical?: string;
	readonly matchedText: string;
	readonly matchedKey: string;
	readonly mode: LookupMode;
	readonly labels?: readonly string[];
	readonly features?: Readonly<Record<string, unknown>>;
	readonly language?: string;
	readonly script?: string;
	readonly source?: string;
	readonly score: number;
	readonly rank: number;
	readonly start?: number;
	readonly end?: number;
	readonly distance?: number;
}
