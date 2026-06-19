import {
	openResourceJson,
	openResourceTable,
	openResourceText,
	requireSingleTaskResourceBinding,
	type TextPack,
	type TextPackMaterializedTable,
	type TextPackResource,
	type TextPackResourceReader,
	type TextPackTaskResourceBindingRole,
	taskResourceIdsFromBindings,
} from "@ismail-elkorchi/textpack";
import {
	type Analyzer,
	type AnalyzerComponent,
	createAnalyzer,
	createIndex,
	type IndexOptions,
	type IndexSchema,
	type SearchIndex,
	type SearchToken,
} from "./internal/core.js";

export type TextSearchPackResourcePayload =
	| { readonly type: "json"; readonly value: unknown }
	| { readonly type: "table"; readonly value: TextPackMaterializedTable }
	| { readonly type: "text"; readonly value: string };

export interface TextSearchPackResource {
	readonly id: string;
	readonly descriptor: TextPackResource;
	readonly payload: TextSearchPackResourcePayload;
}

export interface SearchAnalyzerResourcesFromPackOptions {
	readonly reader?: TextPackResourceReader;
	readonly resourceIds?: readonly string[];
	readonly schemaIds?: readonly string[];
	readonly slot?: string;
	readonly role?: TextPackTaskResourceBindingRole;
}

export interface SearchAnalyzerFromPackOptions
	extends SearchAnalyzerResourcesFromPackOptions {
	readonly resourceId?: string;
}

function resourcesById(
	pack: TextPack,
	resourceIds: readonly string[],
): readonly TextPackResource[] {
	const byId = new Map(
		pack.manifest.resources.map((resource) => [resource.id, resource]),
	);
	return Object.freeze(
		resourceIds.map((resourceId) => {
			const resource = byId.get(resourceId);
			if (resource === undefined) {
				throw new TypeError(
					`Textpack ${pack.manifest.packageName} is missing bound resource ${resourceId}.`,
				);
			}
			return resource;
		}),
	);
}

function isJson(resource: TextPackResource): boolean {
	const format = resource.format ?? "";
	return format === "json" || format.endsWith("+json");
}

function isTable(resource: TextPackResource): boolean {
	const format = resource.format ?? "";
	return format.includes("tsv") || format.includes("tab-separated-values");
}

async function materializeSearchResource(
	pack: TextPack,
	resource: TextPackResource,
	reader: TextPackResourceReader | undefined,
): Promise<TextSearchPackResource> {
	if (isJson(resource)) {
		return Object.freeze({
			id: resource.id,
			descriptor: resource,
			payload: Object.freeze({
				type: "json" as const,
				value: await openResourceJson(pack, resource.id, reader),
			}),
		});
	}
	if (isTable(resource)) {
		return Object.freeze({
			id: resource.id,
			descriptor: resource,
			payload: Object.freeze({
				type: "table" as const,
				value: await openResourceTable(pack, resource.id, reader),
			}),
		});
	}
	return Object.freeze({
		id: resource.id,
		descriptor: resource,
		payload: Object.freeze({
			type: "text" as const,
			value: await openResourceText(pack, resource.id, reader),
		}),
	});
}

export async function searchAnalyzerResourcesFromPack(
	pack: TextPack,
	options: SearchAnalyzerResourcesFromPackOptions = {},
): Promise<readonly TextSearchPackResource[]> {
	const resourceIds = taskResourceIdsFromBindings(pack, {
		slot: options.slot ?? "search",
		ownerPackage: "@ismail-elkorchi/textsearch",
		schemaId: options.schemaIds ?? [
			"textsearch.analyzer-profile.v1",
			"textsearch.analyzer-table.v1",
		],
		...(options.role === undefined ? {} : { role: options.role }),
		...(options.resourceIds === undefined
			? {}
			: { resourceIds: options.resourceIds }),
	});
	const resources = resourcesById(pack, resourceIds);
	return Promise.all(
		resources.map((resource) =>
			materializeSearchResource(pack, resource, options.reader),
		),
	);
}

function stringValue(value: unknown): string | undefined {
	return typeof value === "string" && value.length > 0 ? value : undefined;
}

function recordValue(
	value: unknown,
): Readonly<Record<string, unknown>> | undefined {
	return value !== null && typeof value === "object" && !Array.isArray(value)
		? (value as Readonly<Record<string, unknown>>)
		: undefined;
}

function analyzerProfile(
	resource: TextSearchPackResource,
): Readonly<Record<string, unknown>> {
	if (resource.payload.type !== "json") {
		throw new TypeError(`${resource.id} is not a JSON analyzer profile.`);
	}
	const profile = recordValue(resource.payload.value);
	if (profile === undefined || profile.kind !== "search-profile") {
		throw new TypeError(`${resource.id} is not a search-profile resource.`);
	}
	return profile;
}

function tokenizerComponent(
	profile: Readonly<Record<string, unknown>>,
): AnalyzerComponent {
	const tokenizer = recordValue(profile.tokenizer);
	const type = stringValue(tokenizer?.type);
	if (type === "dictionary-tokenization") {
		return { kind: "tokenizer", mode: "unicode-word" };
	}
	if (type === "unicode-word-boundary" || type === undefined) {
		return { kind: "tokenizer", mode: "unicode-word" };
	}
	return { kind: "tokenizer", mode: "unicode-word" };
}

function customTokenTransform(
	id: string,
	transform: (term: string) => string,
): AnalyzerComponent {
	return {
		kind: "custom",
		id,
		transform(tokens: readonly SearchToken[]) {
			return tokens.map((token) =>
				Object.freeze({
					...token,
					term: transform(token.term),
				}),
			);
		},
	};
}

function tokenFilterComponents(
	profile: Readonly<Record<string, unknown>>,
): readonly AnalyzerComponent[] {
	const filters = Array.isArray(profile.tokenFilters)
		? profile.tokenFilters
		: [];
	const components: AnalyzerComponent[] = [];
	for (const raw of filters) {
		const filter = recordValue(raw);
		const type = stringValue(filter?.type);
		const componentId = stringValue(filter?.componentId) ?? type ?? "filter";
		if (type === "casefold") {
			components.push({ kind: "normalizer", form: "NFC", casefold: true });
			continue;
		}
		if (type === "diacritic-fold") {
			components.push(
				customTokenTransform(componentId, (term) =>
					term
						.normalize("NFD")
						.replace(/\p{Mark}+/gu, "")
						.normalize("NFC"),
				),
			);
			continue;
		}
		if (type === "arabic-mark-policy") {
			components.push(
				customTokenTransform(componentId, (term) =>
					term.replace(/[\u0640\u064B-\u065F\u0670]/gu, ""),
				),
			);
		}
	}
	return Object.freeze(components);
}

function profileFields(
	profile: Readonly<Record<string, unknown>>,
): readonly string[] {
	const fields = Array.isArray(profile.fields) ? profile.fields : [];
	const names = fields
		.map((field) => stringValue(recordValue(field)?.fieldName))
		.filter((field): field is string => field !== undefined);
	return Object.freeze(
		[...new Set(names.length === 0 ? ["text"] : names)].sort(),
	);
}

export async function analyzerFromPack(
	pack: TextPack,
	options: SearchAnalyzerFromPackOptions = {},
): Promise<Analyzer> {
	const profileBinding = requireSingleTaskResourceBinding(pack, {
		slot: options.slot ?? "search",
		ownerPackage: "@ismail-elkorchi/textsearch",
		schemaId: "textsearch.analyzer-profile.v1",
		role: options.role ?? "profile",
		...(options.resourceId === undefined
			? options.resourceIds === undefined
				? {}
				: { resourceIds: options.resourceIds }
			: { resourceId: options.resourceId }),
	});
	const resources = await searchAnalyzerResourcesFromPack(pack, {
		...(options.reader !== undefined ? { reader: options.reader } : {}),
		resourceIds: [profileBinding.resourceId],
		schemaIds: ["textsearch.analyzer-profile.v1"],
	});
	const resource = resources[0];
	if (resource === undefined) {
		throw new TypeError(
			"No textsearch.analyzer-profile.v1 resource is present.",
		);
	}
	const profile = analyzerProfile(resource);
	const components = [
		tokenizerComponent(profile),
		...tokenFilterComponents(profile),
	] satisfies AnalyzerComponent[];
	const language = stringValue(profile.languageTag);
	const script = stringValue(profile.script);
	return createAnalyzer(components, {
		id: stringValue(profile.analyzerId) ?? resource.id,
		...(language !== undefined ? { language } : {}),
		...(script !== undefined ? { script } : {}),
		resourceFingerprints: [resource.id],
		metadata: {
			resourceId: resource.id,
			profileKind: "textsearch.analyzer-profile.v1",
		},
	});
}

export async function searchIndexSchemaFromPack(
	pack: TextPack,
	options: SearchAnalyzerFromPackOptions = {},
): Promise<IndexSchema> {
	const profileBinding = requireSingleTaskResourceBinding(pack, {
		slot: options.slot ?? "search",
		ownerPackage: "@ismail-elkorchi/textsearch",
		schemaId: "textsearch.analyzer-profile.v1",
		role: options.role ?? "profile",
		...(options.resourceId === undefined
			? options.resourceIds === undefined
				? {}
				: { resourceIds: options.resourceIds }
			: { resourceId: options.resourceId }),
	});
	const resources = await searchAnalyzerResourcesFromPack(pack, {
		...(options.reader !== undefined ? { reader: options.reader } : {}),
		resourceIds: [profileBinding.resourceId],
		schemaIds: ["textsearch.analyzer-profile.v1"],
	});
	const resource = resources[0];
	if (resource === undefined) {
		throw new TypeError(
			"No textsearch.analyzer-profile.v1 resource is present.",
		);
	}
	const profile = analyzerProfile(resource);
	const analyzer = await analyzerFromPack(pack, {
		...options,
		resourceId: resource.id,
	});
	return Object.freeze({
		id: `${analyzer.id}:schema`,
		defaultAnalyzer: analyzer,
		fields: Object.freeze(
			Object.fromEntries(
				profileFields(profile).map((field) => [
					field,
					Object.freeze({
						source: {
							kind: "view" as const,
							viewId: field === "text" ? "raw" : field,
						},
						analyzer,
						store: true,
						highlight: true,
					}),
				]),
			),
		),
		metadata: {
			resourceId: resource.id,
			languageTag: stringValue(profile.languageTag) ?? "und",
		},
	});
}

export async function searchIndexFromPack(
	pack: TextPack,
	options: SearchAnalyzerFromPackOptions & {
		readonly index?: IndexOptions;
	} = {},
): Promise<SearchIndex> {
	return createIndex(
		await searchIndexSchemaFromPack(pack, options),
		options.index,
	);
}
