export {
	buildHistoricalSpellingMap,
	buildOrthographyMap,
	createHistoricalView,
	historicalTargetViewKind,
	witnessReference,
} from "./historical/mod.ts";
export type {
	BuildHistoricalSpellingMapOptions,
	HistoricalViewMode,
	WitnessReference,
} from "./historical/types.ts";
export {
	type PackageName,
	packageName,
	packageVersion,
} from "./internal/version.ts";
export {
	candidateCasing,
	candidateContractions,
	candidatePunctuation,
	candidateRepeatedCharacters,
	candidateSpacing,
	candidateSplitMerge,
} from "./noisy/mod.ts";
export {
	buildNormalizationProfile,
	candidateNormalizations,
	diagnosticForMissingResource,
	isNormalizationMode,
	normalizeDocument,
	resolveSourceView,
	textNormDiagnostic,
} from "./normalize/mod.ts";
export type * from "./normalize/types.ts";
export {
	buildConfusionTable,
	candidateHyphenationRepair,
	candidateOcrEditDistance,
	candidateOcrNoisyChannel,
	validateOcrConfidence,
} from "./ocr/mod.ts";
export type { BuildConfusionTableOptions, OcrConfidence } from "./ocr/types.ts";
export {
	type CompiledTextNormProfile,
	normalizationProfileFromPack,
	normalizationResourcesFromPack,
	type TextNormPackResource,
	type TextNormPackResourcePayload,
	type TextNormProfileMode,
	type TextNormResourcesFromPackOptions,
} from "./resource/mod.ts";
export {
	buildSpellingMap,
	candidateFstSpellings,
	candidateLexiconSpellings,
	candidateRuleSpellings,
	compareNormalizationCandidates,
	sortCandidates,
} from "./spell/mod.ts";
export type { BuildSpellingMapOptions } from "./spell/types.ts";
export {
	buildTransliterationMap,
	candidateTransliteration,
	transliterationScriptPair,
} from "./transliteration/mod.ts";
export type {
	BuildTransliterationMapOptions,
	TransliterationScriptPair,
} from "./transliteration/types.ts";
export { buildVariantGraph } from "./variant/mod.ts";
export type { AmbiguityGroup } from "./variant/types.ts";
export {
	annotateNormalization,
	annotationValueForCandidate,
	applyEditScript,
	assertTextNormViewKind,
	computeEditScript,
	createNormalizedView,
	normalizationEvidence,
	spanMapFromEditScript,
} from "./view/mod.ts";
