export interface TransliterationScriptPair {
	readonly sourceScript: string;
	readonly targetScript: string;
	readonly direction: "forward" | "reverse";
}

export function transliterationScriptPair(
	input: TransliterationScriptPair,
): TransliterationScriptPair {
	if (input.sourceScript.length === 0 || input.targetScript.length === 0) {
		throw new TypeError("transliteration scripts must be explicit.");
	}
	return Object.freeze(input);
}
