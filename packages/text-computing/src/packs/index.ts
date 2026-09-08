import type { packageName } from "../internal/constants.ts";

export { packageName } from "../internal/constants.ts";
export type PackageName = typeof packageName;

export type {
	ArtifactIdentity,
	TextPackArtifactReadContext,
	TextPackArtifactReader,
	TextPackFetchArtifactReaderOptions,
} from "./artifacts.ts";
export {
	artifactIdentity,
	createFetchArtifactReader,
	openArtifactBytes,
} from "./artifacts.ts";

export type {
	TextPackTaskBindingQuery,
	TextPackTaskBindingSource,
} from "./bindings.ts";
export {
	capabilityResourceIdsFromBindings,
	listTaskResourceBindings,
	requireCapabilityResourceBindings,
	requireSingleCapabilityResourceBinding,
	requireSingleTaskResourceBinding,
	requireTaskResourceBindings,
	taskResourceIdsFromBindings,
} from "./bindings.ts";
export { capabilities } from "./capabilities.ts";
export { composePacks } from "./compose.ts";
export type {
	TextPackLookupIndex,
	TextPackLookupIndexRow,
} from "./lookup-index.ts";
export {
	lookupIndexSchemaId,
	openResourceLookupIndex,
} from "./lookup-index.ts";
export { validateManifest } from "./manifest.ts";
export type {
	TextPackFetchResourceReaderOptions,
	TextPackFileBackedResource,
	TextPackMaterializedTable,
	TextPackMaterializedTableRow,
	TextPackResourceEncoding,
	TextPackResourceReadContext,
	TextPackResourceReader,
	TextPackResourceReadRange,
} from "./materialize.ts";
export {
	createFetchResourceReader,
	isFileBackedResource,
	openResourceJson,
	openResourceStorageTextRange,
	openResourceTable,
	openResourceText,
	parseResourceTable,
} from "./materialize.ts";
export { createPack, getResource, loadPack } from "./pack.ts";
export { listResources } from "./query.ts";
export type {
	PackComposeOptions,
	PackResourceMap,
	ResourceKind,
	ResourceQuery,
	TextPack,
	TextPackArtifactDescriptor,
	TextPackArtifactExpectedFile,
	TextPackArtifactPolicy,
	TextPackArtifactProfile,
	TextPackArtifactRedistributionPolicy,
	TextPackArtifactRetrieval,
	TextPackArtifactRetrievalKind,
	TextPackCapabilities,
	TextPackCapabilityName,
	TextPackCapabilitySlot,
	TextPackCapabilitySlotStatus,
	TextPackCapabilityTier,
	TextPackComponent,
	TextPackComponentCapabilityPolicy,
	TextPackComponentLicensePolicy,
	TextPackComponentRole,
	TextPackDependency,
	TextPackGapNote,
	TextPackGeneratedInfo,
	TextPackManifest,
	TextPackManifestSchemaVersion,
	TextPackModality,
	TextPackResource,
	TextPackTargets,
	TextPackTaskResourceBinding,
	TextPackTaskResourceBindingRole,
} from "./types.ts";
export {
	resourceKinds,
	textPackCapabilityTiers,
	textPackModalities,
} from "./types.ts";
