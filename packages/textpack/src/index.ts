export const packageName = "@ismail-elkorchi/textpack" as const;
export type PackageName = typeof packageName;

export { capabilities } from "./capabilities.js";
export { composePacks } from "./compose.js";
export { validateManifest } from "./manifest.js";
export { createPack, getResource, loadPack } from "./pack.js";
export { listResources } from "./query.js";
export type {
	PackComposeOptions,
	PackResourceMap,
	ResourceKind,
	ResourceQuery,
	TextPack,
	TextPackCapabilities,
	TextPackCapabilityName,
	TextPackDependency,
	TextPackManifest,
	TextPackModality,
	TextPackResource,
	TextPackTargets,
} from "./types.js";
export { resourceKinds, textPackModalities } from "./types.js";
