import type { TextlexNormalizationForm } from "../internal/normalize.js";

export interface WordlistEntry {
	readonly form: string;
	readonly labels?: readonly string[];
	readonly features?: Readonly<Record<string, unknown>>;
	readonly language?: string;
	readonly script?: string;
	readonly source?: string;
}

export interface WordlistOptions {
	readonly id?: string;
	readonly normalization?: TextlexNormalizationForm;
	readonly casefold?: boolean;
	readonly language?: string;
	readonly script?: string;
	readonly source?: string;
}

export interface Wordlist {
	readonly id: string;
	readonly entries: readonly WordlistEntry[];
	readonly forms: readonly string[];
	readonly keys: readonly string[];
	readonly normalization?: TextlexNormalizationForm;
	readonly casefold: boolean;
}

export interface Stoplist extends Wordlist {
	readonly kind: "stoplist";
}
