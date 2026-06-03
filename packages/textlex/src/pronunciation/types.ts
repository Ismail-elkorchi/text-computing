import type { TextlexNormalizationForm } from "../internal/normalize.js";

export interface PronunciationEntry {
	readonly id: string;
	readonly form: string;
	readonly pronunciations: readonly string[];
	readonly notation: string;
	readonly labels?: readonly string[];
	readonly features?: Readonly<Record<string, unknown>>;
	readonly language?: string;
	readonly script?: string;
	readonly source?: string;
}

export interface PronunciationLexiconOptions {
	readonly id?: string;
	readonly normalization?: TextlexNormalizationForm;
	readonly casefold?: boolean;
}

export interface PronunciationLexicon {
	readonly id: string;
	readonly entries: readonly PronunciationEntry[];
	readonly byKey: Readonly<Record<string, readonly PronunciationEntry[]>>;
	readonly normalization?: TextlexNormalizationForm;
	readonly casefold: boolean;
}

export interface PronunciationLookupOptions
	extends PronunciationLexiconOptions {
	readonly notation?: string;
	readonly labels?: string | readonly string[];
}

export interface PronunciationMatch {
	readonly entry: PronunciationEntry;
	readonly form: string;
	readonly pronunciation: string;
	readonly notation: string;
	readonly rank: number;
}
