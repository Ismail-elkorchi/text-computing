export const packageName = "@ismail-elkorchi/textpack" as const;
export type PackageName = typeof packageName;

export type {
	TextPackJsonPayload,
	TextPackLoadedResource,
	TextPackRawPayload,
	TextPackResourceFamily,
	TextPackResourceFamilyLoadOptions,
	TextPackResourceFamilyName,
	TextPackResourcePayload,
	TextPackTablePayload,
	TextPackTableRow,
} from "./adapters.js";
export {
	loadCorpus,
	loadKnowledgeBase,
	loadLexicon,
	loadMorphology,
	loadNormalizer,
	loadParallelResources,
	loadQualityProfile,
	loadSearchAnalyzer,
	loadSegmenter,
	loadSyntaxResources,
} from "./adapters.js";
export { capabilities } from "./capabilities.js";
export { composePacks } from "./compose.js";
export { validateManifest } from "./manifest.js";
export type {
	TextPackFileBackedResource,
	TextPackMaterializedTable,
	TextPackMaterializedTableRow,
	TextPackResourceEncoding,
	TextPackResourceReadContext,
	TextPackResourceReader,
} from "./materialize.js";
export {
	isFileBackedResource,
	openResourceJson,
	openResourceTable,
	openResourceText,
	parseResourceTable,
} from "./materialize.js";
export { createPack, getResource, loadPack } from "./pack.js";
export { listResources } from "./query.js";
export { resolvePackComponents } from "./resolve.js";
export type {
	PackComposeOptions,
	PackResourceMap,
	ResolveTextPackComponentsOptions,
	ResourceKind,
	ResourceQuery,
	TextPack,
	TextPackArtifactDescriptor,
	TextPackArtifactPolicy,
	TextPackArtifactProfile,
	TextPackArtifactRedistributionPolicy,
	TextPackArtifactRetrieval,
	TextPackArtifactRetrievalKind,
	TextPackCapabilities,
	TextPackCapabilityName,
	TextPackCapabilitySlot,
	TextPackCapabilitySlotStatus,
	TextPackComponent,
	TextPackComponentCapabilityPolicy,
	TextPackComponentLicensePolicy,
	TextPackComponentResolver,
	TextPackComponentRole,
	TextPackCompositeProfile,
	TextPackDependency,
	TextPackGapNote,
	TextPackGeneratedInfo,
	TextPackManifest,
	TextPackManifestSchemaVersion,
	TextPackModality,
	TextPackResource,
	TextPackTargets,
} from "./types.js";
export { resourceKinds, textPackModalities } from "./types.js";
