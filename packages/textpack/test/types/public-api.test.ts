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
	TextPackJsonPayload,
	TextPackLoadedResource,
	TextPackManifest,
	TextPackRawPayload,
	TextPackResource,
	TextPackResourceFamily,
	TextPackResourceFamilyLoadOptions,
	TextPackResourceFamilyName,
	TextPackResourcePayload,
	TextPackTablePayload,
	TextPackTableRow,
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
	familyName: TextPackResourceFamilyName;
	family: TextPackResourceFamily;
	familyOptions: TextPackResourceFamilyLoadOptions;
	loaded: TextPackLoadedResource;
	payload: TextPackResourcePayload;
	table: TextPackTablePayload;
	row: TextPackTableRow;
	json: TextPackJsonPayload;
	raw: TextPackRawPayload;
};

export type { PublicApiSmoke };
