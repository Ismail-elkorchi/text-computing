import { caseFold } from "../../unicode/casefold/mod.ts";
import {
	type NormalizationForm,
	normalize,
} from "../../unicode/normalize/mod.ts";

export type TextlexNormalizationForm = NormalizationForm;

export interface KeyPolicy {
	readonly normalization?: TextlexNormalizationForm | undefined;
	readonly casefold?: boolean | undefined;
}

export function keyForText(text: string, policy: KeyPolicy = {}): string {
	let key = text;
	if (policy.normalization !== undefined)
		key = normalize(key, policy.normalization);
	if (policy.casefold === true) key = caseFold(key);
	return key;
}
