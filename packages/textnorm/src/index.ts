export {
	buildHistoricalSpellingMap,
	buildOrthographyMap,
	createHistoricalView,
	historicalTargetViewKind,
	witnessReference,
} from "./historical/mod.js";
export type {
	BuildHistoricalSpellingMapOptions,
	HistoricalViewMode,
	WitnessReference,
} from "./historical/types.js";
export {
	type PackageName,
	packageName,
	packageVersion,
} from "./internal/version.js";
export {
	candidateCasing,
	candidateContractions,
	candidatePunctuation,
	candidateRepeatedCharacters,
	candidateSpacing,
	candidateSplitMerge,
} from "./noisy/mod.js";
export {
	buildNormalizationProfile,
	candidateNormalizations,
	diagnosticForMissingResource,
	isNormalizationMode,
	normalizeDocument,
	resolveSourceView,
	textNormDiagnostic,
} from "./normalize/mod.js";
export type * from "./normalize/types.js";
export {
	buildConfusionTable,
	candidateHyphenationRepair,
	candidateOcrEditDistance,
	candidateOcrNoisyChannel,
	validateOcrConfidence,
} from "./ocr/mod.js";
export type { BuildConfusionTableOptions, OcrConfidence } from "./ocr/types.js";
export {
	buildSpellingMap,
	candidateFstSpellings,
	candidateLexiconSpellings,
	candidateRuleSpellings,
	compareNormalizationCandidates,
	sortCandidates,
} from "./spell/mod.js";
export type { BuildSpellingMapOptions } from "./spell/types.js";
export {
	buildTransliterationMap,
	candidateTransliteration,
	transliterationScriptPair,
} from "./transliteration/mod.js";
export type {
	BuildTransliterationMapOptions,
	TransliterationScriptPair,
} from "./transliteration/types.js";
export { buildVariantGraph } from "./variant/mod.js";
export type { AmbiguityGroup } from "./variant/types.js";
export {
	annotateNormalization,
	annotationValueForCandidate,
	applyEditScript,
	assertTextNormViewKind,
	computeEditScript,
	createNormalizedView,
	normalizationEvidence,
	spanMapFromEditScript,
} from "./view/mod.js";
