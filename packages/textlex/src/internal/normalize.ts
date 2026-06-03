import { caseFold } from "@ismail-elkorchi/textfacts/casefold";
import {
	type NormalizationForm,
	normalize,
} from "@ismail-elkorchi/textfacts/normalize";

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
