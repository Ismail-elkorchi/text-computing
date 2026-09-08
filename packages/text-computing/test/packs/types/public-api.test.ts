import type {
	PackComposeOptions,
	PackResourceMap,
	ResourceKind,
	ResourceQuery,
	TextPack,
	TextPackArtifactDescriptor,
	TextPackArtifactReader,
	TextPackCapabilities,
	TextPackCapabilitySlot,
	TextPackCapabilityTier,
	TextPackComponent,
	TextPackDependency,
	TextPackFetchResourceReaderOptions,
	TextPackGapNote,
	TextPackManifest,
	TextPackResource,
	TextPackTargets,
} from "../../../src/packs/index.ts";

type PublicApiSmoke = {
	kind: ResourceKind;
	manifest: TextPackManifest;
	resource: TextPackResource;
	component: TextPackComponent;
	artifact: TextPackArtifactDescriptor;
	artifactReader: TextPackArtifactReader;
	slot: TextPackCapabilitySlot;
	tier: TextPackCapabilityTier;
	gap: TextPackGapNote;
	targets: TextPackTargets;
	dependency: TextPackDependency;
	resources: PackResourceMap;
	pack: TextPack;
	query: ResourceQuery;
	options: PackComposeOptions;
	capabilities: TextPackCapabilities;
	fetchReaderOptions: TextPackFetchResourceReaderOptions;
};

export type { PublicApiSmoke };
