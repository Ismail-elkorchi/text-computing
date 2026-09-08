import type {
	ResourceKind,
	TextPackResourceReader,
	TextPackTaskResourceBindingRole,
} from "../../packs/index.ts";

export interface PackResourceQueryLike {
	readonly id?: string;
	readonly schemaId?: string | readonly string[];
	readonly kind?: ResourceKind | readonly ResourceKind[];
}

export interface ResourceParseOptions {
	readonly idPrefix?: string;
	readonly language?: string;
	readonly script?: string;
	readonly source?: string;
}

export interface ResourceMaterializationOptions {
	readonly reader?: TextPackResourceReader;
	readonly slot?: string;
	readonly role?: TextPackTaskResourceBindingRole;
}
