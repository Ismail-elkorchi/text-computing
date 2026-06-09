import type {
	PackComposeOptions,
	PackResourceMap,
	ResolveTextPackComponentsOptions,
	ResourceKind,
	ResourceQuery,
	TextPack,
	TextPackArtifactDescriptor,
	TextPackCapabilities,
	TextPackCapabilitySlot,
	TextPackComponent,
	TextPackComponentResolver,
	TextPackCompositeProfile,
	TextPackDependency,
	TextPackGapNote,
	TextPackManifest,
	TextPackResource,
	TextPackTargets,
} from "../../src/index.ts";

type PublicApiSmoke = {
	kind: ResourceKind;
	manifest: TextPackManifest;
	resource: TextPackResource;
	component: TextPackComponent;
	artifact: TextPackArtifactDescriptor;
	slot: TextPackCapabilitySlot;
	gap: TextPackGapNote;
	targets: TextPackTargets;
	dependency: TextPackDependency;
	resources: PackResourceMap;
	pack: TextPack;
	query: ResourceQuery;
	options: PackComposeOptions;
	resolveOptions: ResolveTextPackComponentsOptions;
	resolveComponent: TextPackComponentResolver;
	profile: TextPackCompositeProfile;
	capabilities: TextPackCapabilities;
};

export type { PublicApiSmoke };
