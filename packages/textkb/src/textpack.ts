import {
	openResourceJson,
	openResourceTable,
	type TextPack,
	type TextPackResourceReader,
} from "@ismail-elkorchi/textpack";
import {
	type AliasEntryInput,
	assertJsonObject,
	type ConceptRecord,
	createKnowledgeBase,
	type EntityRecord,
	type JsonObject,
	type KnowledgeBase,
	type SemanticRelation,
	type SenseRecord,
} from "./internal/core.js";

export interface KnowledgeBaseFromPackOptions {
	readonly resourceId?: string;
	readonly reader?: TextPackResourceReader;
}

interface CanonicalLabel {
	readonly languageTag: string;
	readonly value: string;
}

interface CanonicalEntity {
	readonly entityId: string;
	readonly typeIds?: readonly string[];
	readonly labels: readonly CanonicalLabel[];
	readonly aliases?: readonly CanonicalLabel[];
	readonly descriptions?: readonly CanonicalLabel[];
	readonly metadata?: Readonly<Record<string, unknown>>;
}

interface CanonicalRelation {
	readonly sourceId: string;
	readonly predicateId: string;
	readonly targetId: string;
	readonly metadata?: Readonly<Record<string, unknown>>;
}

interface CanonicalResourceRef {
	readonly resourceId: string;
	readonly role:
		| "entities"
		| "labels"
		| "aliases"
		| "senses"
		| "synsets"
		| "relations"
		| "ontology";
}

interface CanonicalKnowledgeBaseResource {
	readonly schemaVersion: "1";
	readonly kind: "knowledge-base";
	readonly kbId?: string;
	readonly languageTags?: readonly string[];
	readonly entities?: readonly CanonicalEntity[];
	readonly relations?: readonly CanonicalRelation[];
	readonly resourceRefs?: readonly CanonicalResourceRef[];
}

function expectString(value: unknown, path: string): string {
	if (typeof value !== "string" || value.length === 0) {
		throw new TypeError(`${path} must be a non-empty string.`);
	}
	return value;
}

function optionalString(value: unknown): string | undefined {
	return typeof value === "string" && value.length > 0 ? value : undefined;
}

function stringList(value: readonly string[] | undefined): readonly string[] {
	return Object.freeze([...(value ?? [])].filter((entry) => entry.length > 0));
}

function jsonObject(
	value: Readonly<Record<string, unknown>> | undefined,
): JsonObject | undefined {
	if (value === undefined) return undefined;
	assertJsonObject(value);
	return value as JsonObject;
}

function addRecordValue(
	record: Record<string, string[]>,
	key: string,
	value: string | undefined,
): void {
	if (value === undefined || value.length === 0) return;
	record[key] = [...(record[key] ?? []), value];
}

function labelsByLanguage(
	labels: readonly CanonicalLabel[] | undefined,
): Readonly<Record<string, readonly string[]>> {
	const output: Record<string, string[]> = {};
	for (const label of labels ?? []) {
		addRecordValue(output, label.languageTag, label.value);
	}
	return Object.freeze(
		Object.fromEntries(
			Object.entries(output)
				.sort(([left], [right]) => left.localeCompare(right))
				.map(([key, values]) => [
					key,
					Object.freeze(
						[...new Set(values)].sort((left, right) =>
							left.localeCompare(right),
						),
					),
				]),
		),
	);
}

function descriptionsByLanguage(
	descriptions: readonly CanonicalLabel[] | undefined,
): Readonly<Record<string, string>> | undefined {
	const output: Record<string, string> = {};
	for (const description of descriptions ?? []) {
		output[description.languageTag] = description.value;
	}
	return Object.keys(output).length === 0
		? undefined
		: Object.freeze(
				Object.fromEntries(
					Object.entries(output).sort(([left], [right]) =>
						left.localeCompare(right),
					),
				),
			);
}

function canonicalEntity(record: CanonicalEntity): EntityRecord {
	return Object.freeze({
		id: record.entityId,
		labels: labelsByLanguage(record.labels),
		...(record.aliases === undefined
			? {}
			: { aliases: labelsByLanguage(record.aliases) }),
		...(record.descriptions === undefined
			? {}
			: { descriptions: descriptionsByLanguage(record.descriptions) }),
		...(record.typeIds === undefined
			? {}
			: { types: stringList(record.typeIds) }),
		...(record.metadata === undefined
			? {}
			: { metadata: jsonObject(record.metadata) }),
	});
}

function canonicalRelation(record: CanonicalRelation): SemanticRelation {
	return Object.freeze({
		sourceId: record.sourceId,
		targetId: record.targetId,
		type: record.predicateId,
		sourceKind: "entity" as const,
		targetKind: "entity" as const,
		...(record.metadata === undefined
			? {}
			: { metadata: jsonObject(record.metadata) }),
	});
}

function selectedKbResourceId(
	pack: TextPack,
	options: KnowledgeBaseFromPackOptions,
): string {
	if (options.resourceId !== undefined) return options.resourceId;
	const resources = pack.manifest.resources
		.filter((resource) => resource.schemaId === "textkb.knowledge-base.v1")
		.sort((left, right) => left.id.localeCompare(right.id));
	if (resources.length === 1) return resources[0]?.id ?? "";
	if (resources.length === 0) {
		throw new TypeError("No textkb.knowledge-base.v1 resource is present.");
	}
	throw new TypeError(
		`Multiple textkb.knowledge-base.v1 resources are present: ${resources
			.map((resource) => resource.id)
			.join(", ")}.`,
	);
}

function assertNeutralWikiUrlColumns(
	row: Readonly<Record<string, string>>,
): void {
	for (const key of Object.keys(row)) {
		if (/^[a-z]{2,3}wikiUrl$/u.test(key)) {
			throw new TypeError(
				`Knowledge-base entity rows must use canonical wikiUrl, not source-shaped ${key}.`,
			);
		}
	}
}

function upsertEntity(
	entities: Map<string, EntityRecord>,
	record: EntityRecord,
): void {
	const existing = entities.get(record.id);
	if (existing === undefined) {
		entities.set(record.id, record);
		return;
	}
	entities.set(
		record.id,
		Object.freeze({
			...existing,
			labels: mergeLanguageLists(existing.labels, record.labels),
			aliases: mergeLanguageLists(existing.aliases, record.aliases),
			descriptions: {
				...(existing.descriptions ?? {}),
				...(record.descriptions ?? {}),
			},
			types: stringList([...(existing.types ?? []), ...(record.types ?? [])]),
			metadata: {
				...(existing.metadata ?? {}),
				...(record.metadata ?? {}),
			} as JsonObject,
		}),
	);
}

function mergeLanguageLists(
	left: Readonly<Record<string, readonly string[]>> | undefined,
	right: Readonly<Record<string, readonly string[]>> | undefined,
): Readonly<Record<string, readonly string[]>> {
	const output: Record<string, string[]> = {};
	for (const [recordKey, recordValue] of Object.entries(left ?? {})) {
		output[recordKey] = [...recordValue];
	}
	for (const [recordKey, recordValue] of Object.entries(right ?? {})) {
		output[recordKey] = [...(output[recordKey] ?? []), ...recordValue];
	}
	return Object.freeze(
		Object.fromEntries(
			Object.entries(output)
				.sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
				.map(([recordKey, values]) => [
					recordKey,
					Object.freeze(
						[...new Set(values)].sort((leftValue, rightValue) =>
							leftValue.localeCompare(rightValue),
						),
					),
				]),
		),
	);
}

function entityTableRow(row: Readonly<Record<string, string>>): EntityRecord {
	assertNeutralWikiUrlColumns(row);
	const entityId = expectString(row.entityId, "entityId");
	const languageTag = expectString(row.languageTag, "languageTag");
	const label = expectString(row.label, "label");
	const description = optionalString(row.description);
	const typeId = optionalString(row.typeId);
	const metadata = {
		...(optionalString(row.typeLabel) === undefined
			? {}
			: { typeLabel: row.typeLabel }),
		...(optionalString(row.sitelinks) === undefined
			? {}
			: { sitelinks: Number(row.sitelinks) }),
		...(optionalString(row.wikiUrl) === undefined
			? {}
			: { wikiUrl: row.wikiUrl }),
	};
	return Object.freeze({
		id: entityId,
		labels: { [languageTag]: Object.freeze([label]) },
		...(description === undefined
			? {}
			: { descriptions: { [languageTag]: description } }),
		...(typeId === undefined ? {} : { types: Object.freeze([typeId]) }),
		...(Object.keys(metadata).length === 0
			? {}
			: { metadata: metadata as JsonObject }),
	});
}

function aliasTableRow(row: Readonly<Record<string, string>>): AliasEntryInput {
	return Object.freeze({
		alias: expectString(row.alias, "alias"),
		targetKind: "entity" as const,
		targetId: expectString(row.entityId, "entityId"),
		matchKind: "alias" as const,
		language: expectString(row.languageTag, "languageTag"),
		source: "textpack",
	});
}

function relationTableRow(
	row: Readonly<Record<string, string>>,
): SemanticRelation {
	const scope = optionalString(row.scope);
	return Object.freeze({
		sourceId: expectString(row.sourceId, "sourceId"),
		targetId: expectString(row.targetId, "targetId"),
		type: expectString(row.predicateId, "predicateId"),
		sourceKind:
			scope === "sense"
				? ("sense" as const)
				: scope === "synset"
					? ("concept" as const)
					: ("entity" as const),
		targetKind:
			scope === "sense"
				? ("sense" as const)
				: scope === "synset"
					? ("concept" as const)
					: ("entity" as const),
		metadata: Object.freeze({
			...(scope === undefined ? {} : { scope }),
			...(optionalString(row.relationLabel) === undefined
				? {}
				: { relationLabel: row.relationLabel }),
		}),
	});
}

function senseRow(
	row: Readonly<Record<string, string>>,
	language: string,
): SenseRecord {
	return Object.freeze({
		id: expectString(row.senseId, "senseId"),
		lemma: expectString(row.lemma, "lemma"),
		pos: optionalString(row.partOfSpeech),
		language,
		metadata: {
			entryId: optionalString(row.entryId) ?? "",
			synsetId: optionalString(row.synsetId) ?? "",
			...(optionalString(row.subcat) === undefined
				? {}
				: { subcat: row.subcat }),
		},
	});
}

function synsetRow(
	row: Readonly<Record<string, string>>,
	sensesBySynset: ReadonlyMap<string, readonly SenseRecord[]>,
	language: string,
): ConceptRecord {
	const id = expectString(row.synsetId, "synsetId");
	const definition = optionalString(row.definition);
	const lexfile = optionalString(row.lexfile);
	const ili = optionalString(row.ili);
	const partOfSpeech = optionalString(row.partOfSpeech);
	const members = optionalString(row.members);
	const exampleCount = optionalString(row.exampleCount);
	const lemmas = [
		...new Set((sensesBySynset.get(id) ?? []).map((sense) => sense.lemma)),
	].sort((left, right) => left.localeCompare(right));
	return Object.freeze({
		id,
		labels: { [language]: Object.freeze(lemmas.length === 0 ? [id] : lemmas) },
		...(definition === undefined
			? {}
			: { definitions: { [language]: definition } }),
		...(lexfile === undefined ? {} : { domains: Object.freeze([lexfile]) }),
		metadata: {
			...(ili === undefined ? {} : { ili }),
			...(partOfSpeech === undefined ? {} : { partOfSpeech }),
			...(members === undefined ? {} : { members }),
			...(exampleCount === undefined
				? {}
				: { exampleCount: Number(exampleCount) }),
		},
	});
}

function groupSensesBySynset(
	senses: readonly SenseRecord[],
): ReadonlyMap<string, readonly SenseRecord[]> {
	const output = new Map<string, SenseRecord[]>();
	for (const sense of senses) {
		const synsetId = optionalString(sense.metadata?.synsetId);
		if (synsetId === undefined) continue;
		output.set(synsetId, [...(output.get(synsetId) ?? []), sense]);
	}
	return new Map(
		[...output].map(([key, values]) => [key, Object.freeze(values)]),
	);
}

export async function knowledgeBaseFromPack(
	pack: TextPack,
	options: KnowledgeBaseFromPackOptions = {},
): Promise<KnowledgeBase> {
	const resourceId = selectedKbResourceId(pack, options);
	const resource = await openResourceJson<CanonicalKnowledgeBaseResource>(
		pack,
		resourceId,
		options.reader,
	);
	const language = resource.languageTags?.[0] ?? "und";
	const entities = new Map<string, EntityRecord>();
	const concepts: ConceptRecord[] = [];
	const senses: SenseRecord[] = [];
	const aliases: AliasEntryInput[] = [];
	const relations: SemanticRelation[] = [];

	for (const entity of resource.entities ?? []) {
		upsertEntity(entities, canonicalEntity(entity));
	}
	relations.push(...(resource.relations ?? []).map(canonicalRelation));

	const tableRefs = new Map<
		string,
		ReadonlyArray<Readonly<Record<string, string>>>
	>();
	for (const ref of resource.resourceRefs ?? []) {
		const table = await openResourceTable(pack, ref.resourceId, options.reader);
		tableRefs.set(ref.role, table.rows);
		if (ref.role === "entities") {
			for (const row of table.rows) upsertEntity(entities, entityTableRow(row));
		}
		if (ref.role === "aliases") {
			aliases.push(...table.rows.map(aliasTableRow));
		}
		if (ref.role === "relations") {
			relations.push(...table.rows.map(relationTableRow));
		}
		if (ref.role === "senses") {
			senses.push(...table.rows.map((row) => senseRow(row, language)));
		}
	}

	const synsetRows = tableRefs.get("synsets") ?? [];
	if (synsetRows.length > 0) {
		const sensesBySynset = groupSensesBySynset(senses);
		concepts.push(
			...synsetRows.map((row) => synsetRow(row, sensesBySynset, language)),
		);
	}

	return createKnowledgeBase({
		id: resource.kbId,
		entities: [...entities.values()],
		concepts,
		senses,
		aliases,
		relations,
		metadata: {
			resourceId,
			schemaId: "textkb.knowledge-base.v1",
			languageTags: [...(resource.languageTags ?? [])],
		},
		allowExternalRelationEndpoints: true,
	});
}
