export { candidateNormalizations } from "./candidates.ts";
export {
	diagnosticForMissingResource,
	textNormDiagnostic,
} from "./diagnostics.ts";
export { normalizeDocument } from "./normalize-document.ts";
export {
	type ResolvedCandidateOptions,
	type ResolvedTextNormOptions,
	resolveCandidateOptions,
	resolveSourceView,
	resolveTextNormOptions,
} from "./options.ts";
export {
	assertNormalizationModes,
	buildNormalizationProfile,
	isNormalizationMode,
} from "./profile.ts";
export type * from "./types.ts";
