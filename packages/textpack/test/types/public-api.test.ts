import type {
	PackComposeOptions,
	PackResourceMap,
	ResourceKind,
	ResourceQuery,
	TextPack,
	TextPackCapabilities,
	TextPackDependency,
	TextPackManifest,
	TextPackResource,
	TextPackTargets,
} from "../../src/index.ts";

type PublicApiSmoke = {
	kind: ResourceKind;
	manifest: TextPackManifest;
	resource: TextPackResource;
	targets: TextPackTargets;
	dependency: TextPackDependency;
	resources: PackResourceMap;
	pack: TextPack;
	query: ResourceQuery;
	options: PackComposeOptions;
	capabilities: TextPackCapabilities;
};

export type { PublicApiSmoke };
