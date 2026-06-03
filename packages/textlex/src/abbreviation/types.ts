import type { TextlexNormalizationForm } from "../internal/normalize.js";

export interface AbbreviationEntry {
	readonly form: string;
	readonly expansions: readonly string[];
	readonly labels?: readonly string[];
	readonly features?: Readonly<Record<string, unknown>>;
	readonly language?: string;
	readonly script?: string;
	readonly source?: string;
}

export interface AbbreviationTableOptions {
	readonly id?: string;
	readonly normalization?: TextlexNormalizationForm;
	readonly casefold?: boolean;
}

export interface AbbreviationTable {
	readonly id: string;
	readonly entries: readonly AbbreviationEntry[];
	readonly byKey: Readonly<Record<string, readonly AbbreviationEntry[]>>;
	readonly normalization?: TextlexNormalizationForm;
	readonly casefold: boolean;
}
