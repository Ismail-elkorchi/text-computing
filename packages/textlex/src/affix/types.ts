import type { TextlexNormalizationForm } from "../internal/normalize.js";

export type AffixKind = "prefix" | "suffix" | "infix" | "circumfix";

export interface AffixEntry {
	readonly id: string;
	readonly form: string;
	readonly kind: AffixKind;
	readonly suffixForm?: string;
	readonly labels?: readonly string[];
	readonly features?: Readonly<Record<string, unknown>>;
	readonly language?: string;
	readonly script?: string;
	readonly source?: string;
}

export interface AffixTableOptions {
	readonly id?: string;
	readonly normalization?: TextlexNormalizationForm;
	readonly casefold?: boolean;
}

export interface AffixTable {
	readonly id: string;
	readonly entries: readonly AffixEntry[];
	readonly normalization?: TextlexNormalizationForm;
	readonly casefold: boolean;
}

export interface AffixLookupOptions extends AffixTableOptions {
	readonly kind?: AffixKind;
	readonly labels?: string | readonly string[];
}

export interface AffixMatch {
	readonly entry: AffixEntry;
	readonly form: string;
	readonly kind: AffixKind;
	readonly start: number;
	readonly end: number;
	readonly score: number;
	readonly rank: number;
}
