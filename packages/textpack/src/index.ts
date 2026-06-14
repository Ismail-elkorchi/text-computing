export const packageName = "@ismail-elkorchi/textpack" as const;
export type PackageName = typeof packageName;

export { capabilities } from "./capabilities.js";
export { composePacks } from "./compose.js";
export { validateManifest } from "./manifest.js";
export type {
	TextPackFetchResourceReaderOptions,
	TextPackFileBackedResource,
	TextPackMaterializedTable,
	TextPackMaterializedTableRow,
	TextPackResourceEncoding,
	TextPackResourceReadContext,
	TextPackResourceReader,
} from "./materialize.js";
export {
	createFetchResourceReader,
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
