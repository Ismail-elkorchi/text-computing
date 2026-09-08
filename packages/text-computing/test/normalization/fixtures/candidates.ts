import type { NormalizationMode } from "@ismail-elkorchi/text-computing/normalization";

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
