export const resourceKinds = [
	"unicode-profile",
	"locale-profile",
	"segmentation-profile",
	"normalization-profile",
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
	readonly morphology?: "none" | "lookup" | "rules" | "fst" | "statistical";
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

export interface TextPackManifest {
	readonly id: string;
	readonly name: string;
	readonly version: string;
	readonly packageName: string;
	readonly kind: readonly ResourceKind[];
	readonly targets: TextPackTargets;
	readonly engines: Readonly<Record<string, string>>;
	readonly resources: readonly TextPackResource[];
	readonly dependencies?: readonly TextPackDependency[];
	readonly capabilities: TextPackCapabilities;
	readonly license?: string;
	readonly citations?: readonly string[];
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
