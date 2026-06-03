import { keyForText } from "../internal/normalize.js";
import type { Stoplist, Wordlist, WordlistOptions } from "./types.js";

export function hasWord(
	wordlist: Wordlist,
	text: string,
	options: WordlistOptions = {},
): boolean {
	const key = keyForText(text, {
		normalization: options.normalization ?? wordlist.normalization,
		casefold: options.casefold ?? wordlist.casefold,
	});
	return wordlist.keys.includes(key);
}

export function hasStopword(
	stoplist: Stoplist,
	text: string,
	options: WordlistOptions = {},
): boolean {
	return hasWord(stoplist, text, options);
}
