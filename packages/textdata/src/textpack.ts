import {
	openResourceJson,
	openResourceTable,
	type TextPack,
	type TextPackMaterializedTable,
	type TextPackResource,
	type TextPackResourceReader,
	type TextPackTaskResourceBindingOwnerPackage,
	type TextPackTaskResourceBindingRole,
	taskResourceIdsFromBindings,
} from "@ismail-elkorchi/textpack";

export interface TextDataRowsFromPackOptions {
	readonly reader?: TextPackResourceReader;
	readonly resourceIds?: readonly string[];
	readonly schemaIds?: readonly string[];
	readonly slot?: string;
	readonly role?: TextPackTaskResourceBindingRole;
	readonly ownerPackage?: TextPackTaskResourceBindingOwnerPackage;
}

export interface TextDataTableResource {
	readonly id: string;
	readonly descriptor: TextPackResource;
	readonly columns: readonly string[];
	readonly rows: TextPackMaterializedTable["rows"];
}

export interface TextDataSegmentationProfileResource {
	readonly id: string;
	readonly descriptor: TextPackResource;
	readonly profile: Readonly<Record<string, unknown>>;
}

export interface TextDataSegmentationResources {
	readonly profiles: readonly TextDataSegmentationProfileResource[];
	readonly tables: readonly TextDataTableResource[];
}

export interface TextDataSegment {
	readonly text: string;
	readonly startCU: number;
	readonly endCU: number;
	readonly granularity: "lexical-unit" | "word" | "sentence" | "grapheme";
	readonly isWordLike?: boolean;
	readonly source?: string;
}

export interface TextDataSegmentationAdapter {
	readonly languageTag: string;
	readonly resources: TextDataSegmentationResources;
	readonly lexicalUnits: (text: string) => readonly TextDataSegment[];
	readonly words: (text: string) => readonly TextDataSegment[];
	readonly sentences: (text: string) => readonly TextDataSegment[];
}

function resourcesByBinding(
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

async function tableResourceFromPack(
	pack: TextPack,
	resource: TextPackResource,
	reader: TextPackResourceReader | undefined,
): Promise<TextDataTableResource> {
	const table = await openResourceTable(pack, resource.id, reader);
	return Object.freeze({
		id: resource.id,
		descriptor: resource,
		columns: table.columns,
		rows: table.rows,
	});
}

async function profileResourceFromPack(
	pack: TextPack,
	resource: TextPackResource,
	reader: TextPackResourceReader | undefined,
): Promise<TextDataSegmentationProfileResource> {
	const profile = await openResourceJson<Readonly<Record<string, unknown>>>(
		pack,
		resource.id,
		reader,
	);
	return Object.freeze({
		id: resource.id,
		descriptor: resource,
		profile,
	});
}

export async function corpusRowsFromPack(
	pack: TextPack,
	options: TextDataRowsFromPackOptions = {},
): Promise<readonly TextDataTableResource[]> {
	const resourceIds = taskResourceIdsFromBindings(pack, {
		slot: options.slot ?? "corpus",
		...(options.ownerPackage === undefined
			? {}
			: { ownerPackage: options.ownerPackage }),
		schemaId: options.schemaIds ?? ["textdata.corpus.rows.v1"],
		role: options.role ?? "table",
		...(options.resourceIds === undefined
			? {}
			: { resourceIds: options.resourceIds }),
	});
	return Promise.all(
		resourcesByBinding(pack, resourceIds).map((resource) =>
			tableResourceFromPack(pack, resource, options.reader),
		),
	);
}

export async function segmentationResourcesFromPack(
	pack: TextPack,
	options: TextDataRowsFromPackOptions = {},
): Promise<TextDataSegmentationResources> {
	const schemaIds = options.schemaIds ?? [
		"textdata.segmentation-profile.v1",
		"textdata.segmentation-table.v1",
	];
	const resourceIds = taskResourceIdsFromBindings(pack, {
		slot: options.slot ?? "segmentation",
		ownerPackage: options.ownerPackage ?? "@ismail-elkorchi/textdata",
		schemaId: schemaIds,
		...(options.role === undefined ? {} : { role: options.role }),
		...(options.resourceIds === undefined
			? {}
			: { resourceIds: options.resourceIds }),
	});
	const resources = resourcesByBinding(pack, resourceIds);
	const profiles = await Promise.all(
		resources
			.filter(
				(resource) => resource.schemaId === "textdata.segmentation-profile.v1",
			)
			.map((resource) =>
				profileResourceFromPack(pack, resource, options.reader),
			),
	);
	const tables = await Promise.all(
		resources
			.filter(
				(resource) => resource.schemaId === "textdata.segmentation-table.v1",
			)
			.map((resource) => tableResourceFromPack(pack, resource, options.reader)),
	);
	return Object.freeze({
		profiles: Object.freeze(profiles),
		tables: Object.freeze(tables),
	});
}

function profileLanguage(
	resources: TextDataSegmentationResources,
	pack: TextPack,
): string {
	for (const resource of resources.profiles) {
		const languageTag = resource.profile.languageTag;
		if (typeof languageTag === "string" && languageTag.length > 0) {
			return languageTag;
		}
	}
	return pack.manifest.targets.languages?.[0] ?? "und";
}

function frenchElisionPrefixes(
	resources: TextDataSegmentationResources,
): ReadonlySet<string> {
	const prefixes = new Set<string>();
	for (const table of resources.tables) {
		if (!table.id.includes("elision-prefix")) continue;
		for (const row of table.rows) {
			const prefix = row.prefix;
			if (typeof prefix === "string" && prefix.length > 0) {
				prefixes.add(prefix.toLocaleLowerCase("fr"));
			}
		}
	}
	return prefixes;
}

function intlSegments(
	text: string,
	languageTag: string,
	granularity: "word" | "sentence" | "grapheme",
): readonly TextDataSegment[] {
	if (typeof Intl.Segmenter !== "function") return [];
	const segmenter = new Intl.Segmenter(languageTag, { granularity });
	return Object.freeze(
		[...segmenter.segment(text)].map((segment) =>
			Object.freeze({
				text: segment.segment,
				startCU: segment.index,
				endCU: segment.index + segment.segment.length,
				granularity,
				...(segment.isWordLike !== undefined
					? { isWordLike: segment.isWordLike }
					: {}),
				source: "Intl.Segmenter",
			}),
		),
	);
}

function fallbackLexicalSegments(text: string): readonly TextDataSegment[] {
	const output: TextDataSegment[] = [];
	const pattern =
		/[\p{Letter}\p{Number}]+(?:['’][\p{Letter}\p{Number}]+)?|[^\p{White_Space}]/gu;
	for (const match of text.matchAll(pattern)) {
		const value = match[0];
		const start = match.index;
		output.push(
			Object.freeze({
				text: value,
				startCU: start,
				endCU: start + value.length,
				granularity: "lexical-unit",
				isWordLike: /[\p{Letter}\p{Number}]/u.test(value),
				source: "textdata.fallback",
			}),
		);
	}
	return Object.freeze(output);
}

function splitFrenchElisions(
	segments: readonly TextDataSegment[],
	prefixes: ReadonlySet<string>,
): readonly TextDataSegment[] {
	if (prefixes.size === 0) return segments;
	const output: TextDataSegment[] = [];
	for (const segment of segments) {
		const match = /^([\p{Letter}]+)(['’])([\p{Letter}\p{Number}].*)$/u.exec(
			segment.text,
		);
		const prefix = match?.[1];
		const apostrophe = match?.[2];
		const rest = match?.[3];
		if (
			prefix === undefined ||
			apostrophe === undefined ||
			rest === undefined ||
			!prefixes.has(prefix.toLocaleLowerCase("fr"))
		) {
			output.push(segment);
			continue;
		}
		const split = prefix.length + apostrophe.length;
		output.push(
			Object.freeze({
				text: segment.text.slice(0, split),
				startCU: segment.startCU,
				endCU: segment.startCU + split,
				granularity: "lexical-unit",
				isWordLike: true,
				source: "textdata.segmentation-profile",
			}),
			Object.freeze({
				text: rest,
				startCU: segment.startCU + split,
				endCU: segment.endCU,
				granularity: "lexical-unit",
				isWordLike: true,
				source: "textdata.segmentation-profile",
			}),
		);
	}
	return Object.freeze(output);
}

function lexicalSegments(
	text: string,
	languageTag: string,
	resources: TextDataSegmentationResources,
): readonly TextDataSegment[] {
	const wordSegments = intlSegments(text, languageTag, "word")
		.filter((segment) => segment.text.trim().length > 0)
		.map((segment) =>
			Object.freeze({
				...segment,
				granularity: "lexical-unit" as const,
			}),
		);
	const base =
		wordSegments.length > 0 ? wordSegments : fallbackLexicalSegments(text);
	return languageTag === "fr"
		? splitFrenchElisions(base, frenchElisionPrefixes(resources))
		: Object.freeze(base);
}

export async function segmentationAdapterFromPack(
	pack: TextPack,
	options: TextDataRowsFromPackOptions = {},
): Promise<TextDataSegmentationAdapter> {
	const resources = await segmentationResourcesFromPack(pack, options);
	const languageTag = profileLanguage(resources, pack);
	return Object.freeze({
		languageTag,
		resources,
		lexicalUnits(text: string) {
			return lexicalSegments(text, languageTag, resources);
		},
		words(text: string) {
			return lexicalSegments(text, languageTag, resources).filter(
				(segment) => segment.isWordLike !== false,
			);
		},
		sentences(text: string) {
			const segments = intlSegments(text, languageTag, "sentence")
				.filter((segment) => segment.text.trim().length > 0)
				.map((segment) =>
					Object.freeze({
						...segment,
						granularity: "sentence" as const,
					}),
				);
			return Object.freeze(
				segments.length > 0
					? segments
					: [
							Object.freeze({
								text,
								startCU: 0,
								endCU: text.length,
								granularity: "sentence" as const,
								source: "textdata.fallback",
							}),
						],
			);
		},
	});
}
