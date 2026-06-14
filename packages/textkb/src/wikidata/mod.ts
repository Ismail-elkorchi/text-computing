import {
	openResourceJson,
	openResourceTable,
	type TextPack,
	type TextPackResourceReader,
} from "@ismail-elkorchi/textpack";

export interface WikidataEntityRecord {
	readonly entityId: string;
	readonly languageTag: string;
	readonly label: string;
	readonly description: string;
	readonly typeId: string;
	readonly typeLabel: string;
	readonly sitelinks: number;
	readonly wikiUrl: string;
}

export interface WikidataAliasRecord {
	readonly entityId: string;
	readonly languageTag: string;
	readonly alias: string;
}

export interface WikidataRelationRecord {
	readonly sourceEntityId: string;
	readonly propertyId: string;
	readonly targetEntityId: string;
	readonly relationLabel: string;
}

export interface WikidataPackResources {
	readonly entities: readonly WikidataEntityRecord[];
	readonly aliases: readonly WikidataAliasRecord[];
	readonly relations: readonly WikidataRelationRecord[];
	readonly kb: unknown;
	readonly quality: unknown;
}

export interface WikidataResourceIds {
	readonly entities: string;
	readonly aliases: string;
	readonly relations: string;
	readonly kb: string;
	readonly quality: string;
}

export interface WikidataPackOptions {
	readonly resourceIds?: Partial<WikidataResourceIds>;
	readonly reader?: TextPackResourceReader;
}

const RESOURCE_SUFFIXES = {
	entities: "-entities",
	aliases: "-aliases",
	relations: "-relations",
	kb: "-kb-canonical",
	quality: "-quality",
} as const;

function resourceIds(pack: TextPack): readonly string[] {
	return Object.freeze(
		pack.manifest.resources
			.map((resource) => resource.id)
			.sort((left, right) => left.localeCompare(right)),
	);
}

function requiredResourceId(
	pack: TextPack,
	suffix: string,
	explicit: string | undefined,
): string {
	if (explicit !== undefined) return explicit;
	const matches = resourceIds(pack).filter((id) => id.endsWith(suffix));
	if (matches.length === 1) return matches[0] ?? "";
	if (matches.length === 0)
		throw new TypeError(`textpack Wikidata resource is missing: *${suffix}`);
	throw new TypeError(
		`textpack Wikidata resource suffix *${suffix} is ambiguous: ${matches.join(", ")}`,
	);
}

function resolveWikidataResourceIds(
	pack: TextPack,
	overrides: Partial<WikidataResourceIds> = {},
): WikidataResourceIds {
	return Object.freeze({
		entities: requiredResourceId(
			pack,
			RESOURCE_SUFFIXES.entities,
			overrides.entities,
		),
		aliases: requiredResourceId(
			pack,
			RESOURCE_SUFFIXES.aliases,
			overrides.aliases,
		),
		relations: requiredResourceId(
			pack,
			RESOURCE_SUFFIXES.relations,
			overrides.relations,
		),
		kb: requiredResourceId(pack, RESOURCE_SUFFIXES.kb, overrides.kb),
		quality: requiredResourceId(
			pack,
			RESOURCE_SUFFIXES.quality,
			overrides.quality,
		),
	});
}

export async function wikidataResourcesFromPack(
	pack: TextPack,
	options: WikidataPackOptions = {},
): Promise<WikidataPackResources> {
	const ids = resolveWikidataResourceIds(pack, options.resourceIds);
	const [entities, aliases, relations, kb, quality] = await Promise.all([
		openResourceTable(pack, ids.entities, options.reader),
		openResourceTable(pack, ids.aliases, options.reader),
		openResourceTable(pack, ids.relations, options.reader),
		openResourceJson(pack, ids.kb, options.reader),
		openResourceJson(pack, ids.quality, options.reader),
	]);
	return Object.freeze({
		entities: Object.freeze(
			entities.rows.map((row) =>
				Object.freeze({
					entityId: row.entityId ?? "",
					languageTag: row.languageTag ?? "",
					label: row.label ?? "",
					description: row.description ?? "",
					typeId: row.typeId ?? "",
					typeLabel: row.typeLabel ?? "",
					sitelinks: Number(row.sitelinks ?? "0"),
					wikiUrl: row.frwikiUrl ?? row.enwikiUrl ?? row.arwikiUrl ?? "",
				}),
			),
		),
		aliases: Object.freeze(
			aliases.rows.map((row) =>
				Object.freeze({
					entityId: row.entityId ?? "",
					languageTag: row.languageTag ?? "",
					alias: row.alias ?? "",
				}),
			),
		),
		relations: Object.freeze(
			relations.rows.map((row) =>
				Object.freeze({
					sourceEntityId: row.sourceEntityId ?? "",
					propertyId: row.propertyId ?? "",
					targetEntityId: row.targetEntityId ?? "",
					relationLabel: row.relationLabel ?? "",
				}),
			),
		),
		kb,
		quality,
	});
}
