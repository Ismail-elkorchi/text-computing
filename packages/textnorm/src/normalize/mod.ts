export { candidateNormalizations } from "./candidates.js";
export {
	diagnosticForMissingResource,
	textNormDiagnostic,
} from "./diagnostics.js";
export { normalizeDocument } from "./normalize-document.js";
export {
	type ResolvedCandidateOptions,
	type ResolvedTextNormOptions,
	resolveCandidateOptions,
	resolveSourceView,
	resolveTextNormOptions,
} from "./options.js";
export {
	assertNormalizationModes,
	buildNormalizationProfile,
	isNormalizationMode,
} from "./profile.js";
export type * from "./types.js";
