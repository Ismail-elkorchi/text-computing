export const resourceKinds = [
	"unicode-profile",
	"language-registry",
	"locale-profile",
	"segmentation-profile",
	"normalization-profile",
	"search-profile",
	"lexicon",
	"gazetteer",
	"termbase",
	"abbreviation-table",
	"stoplist",
	"phrase-list",
	"fst",
	"morphology",
	"grammar",
	"rule-set",
	"statistical-model",
	"corpus",
	"dataset",
	"knowledge-base",
	"ontology",
	"translation-memory",
	"alignment-table",
	"quality-profile",
	"composite",
] as const;

export type ResourceKind = (typeof resourceKinds)[number];

export const textPackModalities = [
	"typed",
	"ocr",
	"atr",
	"asr",
	"social",
	"transliterated",
	"historical",
] as const;

export type TextPackModality = (typeof textPackModalities)[number];

export interface TextPackTargets {
	readonly languages?: readonly string[];
	readonly scripts?: readonly string[];
	readonly regions?: readonly string[];
	readonly domains?: readonly string[];
	readonly periods?: readonly string[];
	readonly orthographies?: readonly string[];
	readonly modalities?: readonly TextPackModality[];
}

export interface TextPackDependency {
	readonly id: string;
	readonly packageName?: string;
	readonly version?: string;
	readonly optional?: boolean;
}

export interface TextPackResource {
	readonly id: string;
	readonly kind: ResourceKind;
	readonly name?: string;
	readonly path?: string;
	readonly format?: string;
	readonly mediaType?: string;
	readonly schemaId?: string;
	readonly targets?: TextPackTargets;
	readonly license?: string;
	readonly citations?: readonly string[];
	readonly dependencies?: readonly TextPackDependency[];
	readonly metadata?: unknown;
}

export interface TextPackCapabilities {
	readonly segmentation?:
		| "none"
		| "default"
		| "profile"
		| "dictionary"
		| "fst"
		| "rules";
	readonly normalization?:
		| "none"
		| "unicode"
		| "lexicon"
		| "rules"
		| "fst"
		| "statistical";
	readonly morphology?:
		| "none"
		| "lookup"
		| "paradigm-table"
		| "rules"
		| "fst"
		| "statistical";
	readonly tagging?: "none" | "rules" | "statistical" | "hybrid";
	readonly parsing?: "none" | "rules" | "statistical" | "hybrid";
	readonly extraction?:
		| "none"
		| "gazetteer"
		| "rules"
		| "statistical"
		| "hybrid";
	readonly search?: "none" | "analyzer" | "index-profile";
	readonly terminology?: "none" | "lexicon" | "corpus" | "kb";
	readonly historical?: boolean;
	readonly noisyText?: boolean;
	readonly parallel?: boolean;
}

export type TextPackCapabilityName = keyof TextPackCapabilities;

export type TextPackManifestSchemaVersion = "1";

export type TextPackComponentRole = "required" | "optional" | "excluded";

export type TextPackComponentLicensePolicy =
	| "default"
	| "allow-attribution"
	| "allow-share-alike"
	| "allow-copyleft"
	| "local-only";

export type TextPackComponentCapabilityPolicy =
	| "contributes-default"
	| "available-optional"
	| "documentation-only";

export type TextPackArtifactPolicy = "none" | "locked" | "fetch-explicit";

export type TextPackArtifactProfile = "research" | "full" | "local";

export type TextPackArtifactRedistributionPolicy =
	| "redistributable"
	| "redistributable-with-attribution"
	| "derived-only"
	| "local-only"
	| "blocked";

export type TextPackArtifactRetrievalKind =
	| "https"
	| "s3"
	| "huggingface"
	| "local"
	| "manual";

export type TextPackCapabilitySlotStatus =
	| "unsupported"
	| "planned"
	| "profiled"
	| "sampled"
	| "artifact-backed"
	| "task-supported"
	| "feature-complete"
	| "not-applicable";

export const textPackCapabilityTiers = [
	"none",
	"resource-only",
	"baseline",
	"lookup",
	"rule-based",
	"contextual",
	"model-backed",
] as const;

export type TextPackCapabilityTier = (typeof textPackCapabilityTiers)[number];

export interface TextPackComponent {
	readonly packageName: string;
	readonly versionRange: string;
	readonly role: TextPackComponentRole;
	readonly reason?: string;
	readonly licensePolicy: TextPackComponentLicensePolicy;
	readonly capabilityPolicy: TextPackComponentCapabilityPolicy;
	readonly artifactPolicy?: TextPackArtifactPolicy;
}

export interface TextPackArtifactChecksum {
	readonly algorithm: "sha1" | "sha256" | "sha512";
	readonly value: string;
}

export interface TextPackArtifactRetrieval {
	readonly kind: TextPackArtifactRetrievalKind;
	readonly uri?: string;
	readonly instructions?: string;
}

export interface TextPackArtifactExpectedFile {
	readonly path: string;
	readonly sizeBytes?: number;
	readonly checksum?: string;
}

export interface TextPackArtifactDescriptor {
	readonly artifactId: string;
	readonly sourceIds: readonly string[];
	readonly version: string;
	readonly profile: TextPackArtifactProfile;
	readonly sizeBytes: number;
	readonly mediaType: string;
	readonly compression?: "gzip" | "bzip2" | "zstd" | "zip" | "tar";
	readonly checksum: TextPackArtifactChecksum;
	readonly licenseExpression: string;
	readonly redistributionPolicy: TextPackArtifactRedistributionPolicy;
	readonly retrieval: TextPackArtifactRetrieval;
	readonly cacheKey: string;
	readonly expectedFiles: readonly TextPackArtifactExpectedFile[];
}

export type TextPackTaskResourceBindingRole =
	| "primary"
	| "profile"
	| "table"
	| "index"
	| "annotation"
	| "evidence"
	| "quality"
	| "projection"
	| "metadata";

export interface TextPackTaskResourceBinding {
	readonly role: TextPackTaskResourceBindingRole;
	readonly resourceId: string;
	readonly schemaId: string;
	readonly required: boolean;
}

export interface TextPackCapabilitySlot {
	readonly slot: string;
	readonly status: TextPackCapabilitySlotStatus;
	readonly tier: TextPackCapabilityTier;
	readonly resourceIds?: readonly string[];
	readonly artifactIds?: readonly string[];
	readonly bindings?: readonly TextPackTaskResourceBinding[];
	readonly prerequisites?: readonly string[];
	readonly readerRequired?: boolean;
	readonly notes?: readonly string[];
	readonly capabilities?: TextPackCapabilities;
}

export interface TextPackGapNote {
	readonly id: string;
	readonly slot?: string;
	readonly runtimeSurface?: string;
	readonly status:
		| "unsupported"
		| "planned"
		| "artifact-backed"
		| "not-applicable";
	readonly message: string;
}

export interface TextPackGeneratedInfo {
	readonly forgeVersion: string;
	readonly lockfileChecksum: string;
	readonly generatedAt: string;
	readonly generatorCommand: string;
}

export interface TextPackManifest {
	readonly schemaVersion: TextPackManifestSchemaVersion;
	readonly id: string;
	readonly name: string;
	readonly version: string;
	readonly packageName: string;
	readonly targets: TextPackTargets;
	readonly resources: readonly TextPackResource[];
	readonly components?: readonly TextPackComponent[];
	readonly artifacts?: readonly TextPackArtifactDescriptor[];
	readonly capabilitySlots: readonly TextPackCapabilitySlot[];
	readonly gapNotes?: readonly TextPackGapNote[];
	readonly license?: string;
	readonly citations?: readonly string[];
	readonly generated?: TextPackGeneratedInfo;
}

export type PackResourceMap = Readonly<Record<string, unknown>>;

export interface TextPack {
	readonly manifest: TextPackManifest;
	readonly resources: PackResourceMap;
}

export interface PackComposeOptions {
	readonly id?: string;
	readonly name?: string;
	readonly version?: string;
	readonly packageName?: string;
	readonly precedence?: readonly string[];
	readonly conflictPolicy?: "error" | "first" | "last";
	readonly license?: string;
	readonly citations?: readonly string[];
}

type QueryText = string | readonly string[];

export interface ResourceQuery {
	readonly id?: QueryText;
	readonly kind?: ResourceKind | readonly ResourceKind[];
	readonly schemaId?: QueryText;
	readonly packageId?: QueryText;
	readonly packageName?: QueryText;
	readonly languages?: QueryText;
	readonly scripts?: QueryText;
	readonly regions?: QueryText;
	readonly domains?: QueryText;
	readonly periods?: QueryText;
	readonly orthographies?: QueryText;
	readonly modalities?: TextPackModality | readonly TextPackModality[];
	readonly capability?: TextPackCapabilityName;
	readonly metadata?: Readonly<Record<string, unknown>>;
}
