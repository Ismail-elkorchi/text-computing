import type { NormalizationMode } from "../../dist/index.js";

export const allCandidateKinds = [
	"spelling",
	"historical",
	"ocr",
	"dialect",
	"transliteration",
	"punctuation",
	"spacing",
	"casing",
] as const satisfies readonly NormalizationMode[];
