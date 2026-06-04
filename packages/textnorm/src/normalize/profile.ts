import { deepFreeze } from "../internal/freeze.js";
import { assertJsonValue } from "../internal/json.js";
import { sortedUnique } from "../internal/stable.js";
import type { NormalizationMode, NormalizationProfile } from "./types.js";

const modes: readonly NormalizationMode[] = [
	"spelling",
	"historical",
	"ocr",
	"dialect",
	"transliteration",
	"punctuation",
	"spacing",
	"casing",
];

export function isNormalizationMode(
	value: unknown,
): value is NormalizationMode {
	return (
		typeof value === "string" && modes.includes(value as NormalizationMode)
	);
}

export function assertNormalizationModes(
	values: readonly NormalizationMode[] | undefined,
): void {
	for (const value of values ?? []) {
		if (!isNormalizationMode(value))
			throw new TypeError(`unknown normalization mode: ${String(value)}`);
	}
}

export function buildNormalizationProfile(
	input: NormalizationProfile,
): NormalizationProfile {
	assertNormalizationModes(input.modes);
	assertJsonValue(input.metadata ?? {});
	return deepFreeze({
		...input,
		...(input.languages !== undefined
			? { languages: sortedUnique(input.languages) }
			: {}),
		...(input.scripts !== undefined
			? { scripts: sortedUnique(input.scripts) }
			: {}),
		...(input.periods !== undefined
			? { periods: sortedUnique(input.periods) }
			: {}),
		...(input.orthographies !== undefined
			? { orthographies: sortedUnique(input.orthographies) }
			: {}),
		...(input.modes !== undefined
			? { modes: Object.freeze([...input.modes]) }
			: {}),
	}) as NormalizationProfile;
}
