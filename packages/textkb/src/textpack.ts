import {
	openResourceJson,
	openResourceTable,
	openResourceText,
	requireSingleTaskResourceBinding,
	type TextPack,
	type TextPackResourceReader,
	taskResourceIdsFromBindings,
} from "@ismail-elkorchi/textpack";
import {
	type AliasEntryInput,
	assertJsonObject,
	type ConceptRecord,
	candidateEntities,
	createKnowledgeBase,
	type EntityCandidate,
	type EntityLinkOptions,
	type EntityRecord,
	type JsonObject,
	type KnowledgeBase,
	linkEntities as linkEntitiesWithKnowledgeBase,
	type SemanticRelation,
	type SenseRecord,
} from "./internal/core.js";

export interface KnowledgeBaseFromPackOptions {
	readonly resourceId?: string;
	readonly reader?: TextPackResourceReader;
}

export interface KnowledgeBaseSliceFromPackOptions
	extends KnowledgeBaseFromPackOptions {
	readonly mentions: readonly string[];
	readonly language?: string;
}

export interface EntityLinkerFromPackOptions
	extends KnowledgeBaseFromPackOptions {
	readonly linkOptions?: EntityLinkOptions;
}

export interface TextPackEntityLinker {
	readonly kb: KnowledgeBase;
	readonly candidates: (
		text: string,
		options?: EntityLinkOptions,
	) => readonly EntityCandidate[];
	readonly linkEntities: (
		doc: Parameters<typeof linkEntitiesWithKnowledgeBase>[0],
		options?: EntityLinkOptions,
	) => ReturnType<typeof linkEntitiesWithKnowledgeBase>;
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

function normalizedMention(value: string): string {
	return value
		.normalize("NFKC")
		.toLocaleLowerCase()
		.replace(/\s+/gu, " ")
		.trim();
}

function parseMatchingRows(
	text: string,
	matches: (row: Readonly<Record<string, string>>) => boolean,
): readonly Readonly<Record<string, string>>[] {
	const lines = text.replace(/\r\n/gu, "\n").replace(/\r/gu, "\n").split("\n");
	while (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
	const header = lines[0]?.split("\t") ?? [];
	if (header.length === 0) return [];
	const rows: Readonly<Record<string, string>>[] = [];
	for (const line of lines.slice(1)) {
		if (line.length === 0) continue;
		const cells = line.split("\t");
		const row: Record<string, string> = {};
		for (let index = 0; index < header.length; index += 1) {
			const column = header[index];
			if (column !== undefined && column.length > 0) {
				row[column] = cells[index] ?? "";
			}
		}
		const frozen = Object.freeze(row);
		if (matches(frozen)) rows.push(frozen);
	}
	return Object.freeze(rows);
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
	return requireSingleTaskResourceBinding(pack, {
		slot: "kb",
		ownerPackage: "@ismail-elkorchi/textkb",
		schemaId: "textkb.knowledge-base.v1",
		role: "primary",
		...(options.resourceId === undefined
			? {}
			: { resourceId: options.resourceId }),
	}).resourceId;
}

function selectedKbResourceIds(
	pack: TextPack,
	options: KnowledgeBaseFromPackOptions,
): readonly string[] {
	return taskResourceIdsFromBindings(pack, {
		slot: "kb",
		ownerPackage: "@ismail-elkorchi/textkb",
		schemaId: "textkb.knowledge-base.v1",
		role: "primary",
		...(options.resourceId === undefined
			? {}
			: { resourceId: options.resourceId }),
	});
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
): SenseRecord | undefined {
	const id = optionalString(row.senseId);
	const lemma = optionalString(row.lemma);
	if (id === undefined || lemma === undefined) return undefined;
	return Object.freeze({
		id,
		lemma,
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

function relationKey(relation: SemanticRelation): string {
	return [
		relation.sourceKind,
		relation.sourceId,
		relation.type,
		relation.targetKind,
		relation.targetId,
	].join("\u0000");
}

function uniqueRelations(
	relations: readonly SemanticRelation[],
): readonly SemanticRelation[] {
	const byKey = new Map<string, SemanticRelation>();
	for (const relation of relations) {
		if (!byKey.has(relationKey(relation))) {
			byKey.set(relationKey(relation), relation);
		}
	}
	return Object.freeze(
		[...byKey.values()].sort(
			(left, right) =>
				left.sourceId.localeCompare(right.sourceId) ||
				left.type.localeCompare(right.type) ||
				left.targetId.localeCompare(right.targetId),
		),
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
	for (const relation of resource.relations ?? []) {
		relations.push(canonicalRelation(relation));
	}

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
			for (const row of table.rows) aliases.push(aliasTableRow(row));
		}
		if (ref.role === "relations") {
			for (const row of table.rows) relations.push(relationTableRow(row));
		}
		if (ref.role === "senses") {
			for (const row of table.rows) {
				const sense = senseRow(row, language);
				if (sense !== undefined) senses.push(sense);
			}
		}
	}

	const synsetRows = tableRefs.get("synsets") ?? [];
	if (synsetRows.length > 0) {
		const sensesBySynset = groupSensesBySynset(senses);
		for (const row of synsetRows) {
			concepts.push(synsetRow(row, sensesBySynset, language));
		}
	}

	return createKnowledgeBase({
		id: resource.kbId,
		entities: [...entities.values()],
		concepts,
		senses,
		aliases,
		relations: uniqueRelations(relations),
		metadata: {
			resourceId,
			schemaId: "textkb.knowledge-base.v1",
			languageTags: [...(resource.languageTags ?? [])],
		},
		allowExternalRelationEndpoints: true,
	});
}

function labelMatchesMention(
	labels: readonly CanonicalLabel[] | undefined,
	mentionKeys: ReadonlySet<string>,
	language: string | undefined,
): boolean {
	return (labels ?? []).some(
		(label) =>
			(language === undefined || label.languageTag === language) &&
			mentionKeys.has(normalizedMention(label.value)),
	);
}

function inlineEntityAliases(
	entity: CanonicalEntity,
): readonly AliasEntryInput[] {
	const aliases: AliasEntryInput[] = [];
	for (const label of entity.labels) {
		aliases.push(
			Object.freeze({
				alias: label.value,
				targetKind: "entity" as const,
				targetId: entity.entityId,
				matchKind: "label" as const,
				language: label.languageTag,
				source: "textpack",
			}),
		);
	}
	for (const alias of entity.aliases ?? []) {
		aliases.push(
			Object.freeze({
				alias: alias.value,
				targetKind: "entity" as const,
				targetId: entity.entityId,
				matchKind: "alias" as const,
				language: alias.languageTag,
				source: "textpack",
			}),
		);
	}
	return Object.freeze(aliases);
}

export async function knowledgeBaseSliceFromPack(
	pack: TextPack,
	options: KnowledgeBaseSliceFromPackOptions,
): Promise<KnowledgeBase> {
	const mentionKeys = new Set(
		options.mentions
			.map((mention) => normalizedMention(mention))
			.filter((mention) => mention.length > 0),
	);
	const resourceIds = selectedKbResourceIds(pack, options);
	const entities = new Map<string, EntityRecord>();
	const aliases: AliasEntryInput[] = [];
	const relations: SemanticRelation[] = [];
	const entityIds = new Set<string>();
	const languageTags = new Set<string>();

	for (const resourceId of resourceIds) {
		const resource = await openResourceJson<CanonicalKnowledgeBaseResource>(
			pack,
			resourceId,
			options.reader,
		);
		for (const tag of resource.languageTags ?? []) languageTags.add(tag);
		const language = options.language ?? resource.languageTags?.[0];

		for (const entity of resource.entities ?? []) {
			if (
				!labelMatchesMention(entity.labels, mentionKeys, language) &&
				!labelMatchesMention(entity.aliases, mentionKeys, language)
			) {
				continue;
			}
			const record = canonicalEntity(entity);
			upsertEntity(entities, record);
			entityIds.add(record.id);
			aliases.push(...inlineEntityAliases(entity));
		}

		const refs = resource.resourceRefs ?? [];
		for (const ref of refs.filter(
			(candidate) => candidate.role === "aliases",
		)) {
			const text = await openResourceText(pack, ref.resourceId, options.reader);
			for (const row of parseMatchingRows(
				text,
				(row) =>
					(options.language === undefined ||
						row.languageTag === options.language) &&
					row.alias !== undefined &&
					mentionKeys.has(normalizedMention(row.alias)),
			)) {
				const alias = aliasTableRow(row);
				aliases.push(alias);
				entityIds.add(alias.targetId);
			}
		}

		for (const ref of refs.filter(
			(candidate) => candidate.role === "entities",
		)) {
			const text = await openResourceText(pack, ref.resourceId, options.reader);
			for (const row of parseMatchingRows(
				text,
				(row) =>
					(row.entityId !== undefined && entityIds.has(row.entityId)) ||
					((options.language === undefined ||
						row.languageTag === options.language) &&
						row.label !== undefined &&
						mentionKeys.has(normalizedMention(row.label))),
			)) {
				const record = entityTableRow(row);
				upsertEntity(entities, record);
				entityIds.add(record.id);
			}
		}

		for (const ref of refs.filter(
			(candidate) => candidate.role === "relations",
		)) {
			const text = await openResourceText(pack, ref.resourceId, options.reader);
			for (const row of parseMatchingRows(
				text,
				(row) =>
					(row.sourceId !== undefined && entityIds.has(row.sourceId)) ||
					(row.targetId !== undefined && entityIds.has(row.targetId)),
			)) {
				relations.push(relationTableRow(row));
			}
		}
	}

	const knownAliases = aliases.filter((alias) => entityIds.has(alias.targetId));
	return createKnowledgeBase({
		id: `${pack.manifest.id}:kb-slice`,
		entities: [...entities.values()],
		aliases: knownAliases,
		relations: uniqueRelations(relations),
		metadata: {
			resourceIds: [...resourceIds],
			schemaId: "textkb.knowledge-base.v1",
			mentions: [...mentionKeys].sort((left, right) =>
				left.localeCompare(right),
			),
			languageTags: [...languageTags].sort((left, right) =>
				left.localeCompare(right),
			),
		},
		allowExternalRelationEndpoints: true,
	});
}

export async function candidateEntitiesFromPack(
	pack: TextPack,
	mention: string,
	options: KnowledgeBaseFromPackOptions & EntityLinkOptions = {},
): Promise<readonly EntityCandidate[]> {
	const kb = await knowledgeBaseSliceFromPack(pack, {
		...(options.resourceId === undefined
			? {}
			: { resourceId: options.resourceId }),
		...(options.reader === undefined ? {} : { reader: options.reader }),
		mentions: [mention],
		...(options.language === undefined ? {} : { language: options.language }),
	});
	return Object.freeze(candidateEntities(kb, mention, options));
}

export async function entityLinkerFromPack(
	pack: TextPack,
	options: EntityLinkerFromPackOptions = {},
): Promise<TextPackEntityLinker> {
	const kb = await knowledgeBaseFromPack(pack, options);
	return Object.freeze({
		kb,
		candidates(text: string, candidateOptions: EntityLinkOptions = {}) {
			return candidateEntities(kb, text, {
				...options.linkOptions,
				...candidateOptions,
			});
		},
		linkEntities(
			doc: Parameters<typeof linkEntitiesWithKnowledgeBase>[0],
			linkOptions: EntityLinkOptions = {},
		) {
			return linkEntitiesWithKnowledgeBase(doc, kb, {
				...options.linkOptions,
				...linkOptions,
			});
		},
	});
}
