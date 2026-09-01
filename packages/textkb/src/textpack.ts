import { nfkcCaseFold } from "@ismail-elkorchi/textfacts/casefold";
import { boundedEditDistance } from "@ismail-elkorchi/textlex/fuzzy";
import {
	openResourceJson,
	openResourceLookupIndex,
	openResourceTable,
	requireSingleTaskResourceBinding,
	type TextPack,
	type TextPackLookupIndex,
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
	readonly maxEditDistance?: number;
}

export interface KnowledgeBaseMentionKeyLengths {
	readonly codePointLengths: readonly number[];
	readonly maximumCodePointLength: number;
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

interface KnowledgeBasePackCache {
	readonly defaultReader: Map<string, Promise<KnowledgeBase>>;
	readonly readers: WeakMap<
		TextPackResourceReader,
		Map<string, Promise<KnowledgeBase>>
	>;
}

const knowledgeBaseCaches = new WeakMap<object, KnowledgeBasePackCache>();

function knowledgeBaseCache(
	pack: TextPack,
	reader: TextPackResourceReader | undefined,
): Map<string, Promise<KnowledgeBase>> {
	let packCache = knowledgeBaseCaches.get(pack);
	if (packCache === undefined) {
		packCache = { defaultReader: new Map(), readers: new WeakMap() };
		knowledgeBaseCaches.set(pack, packCache);
	}
	if (reader === undefined) return packCache.defaultReader;
	let cache = packCache.readers.get(reader);
	if (cache === undefined) {
		cache = new Map();
		packCache.readers.set(reader, cache);
	}
	return cache;
}

function cachedKnowledgeBase(
	cache: Map<string, Promise<KnowledgeBase>>,
	key: string,
	materialize: () => Promise<KnowledgeBase>,
): Promise<KnowledgeBase> {
	const cached = cache.get(key);
	if (cached !== undefined) return cached;
	const pending = materialize();
	cache.set(key, pending);
	void pending.catch(() => {
		if (cache.get(key) === pending) cache.delete(key);
	});
	return pending;
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
		| "ontology"
		| "lookup-index";
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

function canonicalKbIdentifier(value: string): string {
	return (
		/^(?:https?:\/\/www\.wikidata\.org\/entity\/)?(Q[1-9][0-9]*)$/u.exec(
			value,
		)?.[1] ?? value
	);
}

function identifierProvenance(
	canonical: string,
	source: string,
	field: string,
): Readonly<Record<string, string>> {
	return canonical === source ? {} : { [field]: source };
}

function normalizedMention(value: string): string {
	return nfkcCaseFold(value).replace(/\s+/gu, " ").trim();
}

function mentionKeyMatches(
	value: string,
	mentionKeys: ReadonlySet<string>,
	maxEditDistance: number,
): boolean {
	const key = normalizedMention(value);
	if (mentionKeys.has(key)) return true;
	if (maxEditDistance === 0) return false;
	for (const mention of mentionKeys) {
		if (boundedEditDistance(key, mention, maxEditDistance) !== undefined) {
			return true;
		}
	}
	return false;
}

type KbTableIndexKind = "entity" | "mention" | "relation";

function kbLookupKeyVariants(
	kind: KbTableIndexKind,
	key: string,
): readonly string[] {
	if (
		(kind === "entity" || kind === "relation") &&
		/^Q[1-9][0-9]*$/u.test(key)
	) {
		return Object.freeze([
			key,
			`http://www.wikidata.org/entity/${key}`,
			`https://www.wikidata.org/entity/${key}`,
		]);
	}
	return Object.freeze([key]);
}

const kbIndexColumns: Readonly<Record<KbTableIndexKind, readonly string[]>> =
	Object.freeze({
		entity: Object.freeze(["entityId"]),
		mention: Object.freeze(["alias", "label"]),
		relation: Object.freeze(["sourceId", "targetId"]),
	});

async function generatedKbRows(
	index: TextPackLookupIndex,
	keysByKind: Partial<Readonly<Record<KbTableIndexKind, ReadonlySet<string>>>>,
	maxEditDistance = 0,
): Promise<readonly Readonly<Record<string, string>>[]> {
	const rowsByOrder = new Map<number, Readonly<Record<string, string>>>();
	for (const kind of ["entity", "mention", "relation"] as const) {
		const columns = kbIndexColumns[kind].filter((column) =>
			index.keyColumns.includes(column),
		);
		for (const key of keysByKind[kind] ?? []) {
			for (const variant of kbLookupKeyVariants(kind, key)) {
				for (const column of columns) {
					const normalized = nfkcCaseFold(variant);
					const rows =
						kind === "mention" && maxEditDistance > 0
							? await index.rowsForNormalizedKeyWithinEditDistance(
									column,
									normalized,
									maxEditDistance,
								)
							: await index.rowsForNormalizedKey(column, normalized);
					for (const row of rows) {
						if (!rowsByOrder.has(row.rowOrder)) {
							rowsByOrder.set(row.rowOrder, row.values);
						}
					}
				}
			}
		}
	}
	return Object.freeze(
		[...rowsByOrder.entries()]
			.sort(([leftOrder], [rightOrder]) => leftOrder - rightOrder)
			.map(([, row]) => row),
	);
}

async function indexedKbRows(
	pack: TextPack,
	reader: TextPackResourceReader | undefined,
	resourceId: string,
	keysByKind: Partial<Readonly<Record<KbTableIndexKind, ReadonlySet<string>>>>,
	lookupIndexResourceId: string,
	maxEditDistance = 0,
): Promise<readonly Readonly<Record<string, string>>[]> {
	return generatedKbRows(
		await openResourceLookupIndex(
			pack,
			resourceId,
			lookupIndexResourceId,
			reader,
		),
		keysByKind,
		maxEditDistance,
	);
}

function requiredLookupIndexForKbSource(
	pack: TextPack,
	refs: readonly CanonicalResourceRef[],
	sourceResourceId: string,
): string {
	for (const ref of refs) {
		if (ref.role !== "lookup-index") continue;
		const descriptor = pack.manifest.resources.find(
			(resource) => resource.id === ref.resourceId,
		);
		if (descriptor === undefined) {
			throw new TypeError(
				`Canonical lookup-index ref is missing: ${ref.resourceId}.`,
			);
		}
		const metadata =
			descriptor?.metadata !== null &&
			typeof descriptor?.metadata === "object" &&
			!Array.isArray(descriptor.metadata)
				? (descriptor.metadata as Readonly<Record<string, unknown>>)
				: undefined;
		if (
			descriptor.schemaId !== "textpack.lookup-index.v1" ||
			typeof metadata?.indexedResourceId !== "string"
		) {
			throw new TypeError(
				`Canonical lookup-index ref ${descriptor.id} has invalid metadata.`,
			);
		}
		if (metadata?.indexedResourceId === sourceResourceId) return ref.resourceId;
	}
	throw new TypeError(
		`Canonical KB resource ${sourceResourceId} requires a textpack.lookup-index.v1 reference for targeted lookup.`,
	);
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
	const id = canonicalKbIdentifier(record.entityId);
	return Object.freeze({
		id,
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
		metadata: {
			...(jsonObject(record.metadata) ?? {}),
			...identifierProvenance(id, record.entityId, "sourceEntityId"),
		} as JsonObject,
	});
}

function canonicalRelation(record: CanonicalRelation): SemanticRelation {
	const sourceId = canonicalKbIdentifier(record.sourceId);
	const targetId = canonicalKbIdentifier(record.targetId);
	return Object.freeze({
		sourceId,
		targetId,
		type: record.predicateId,
		sourceKind: "entity" as const,
		targetKind: "entity" as const,
		metadata: {
			...(jsonObject(record.metadata) ?? {}),
			...identifierProvenance(
				sourceId,
				record.sourceId,
				"sourceRelationSourceId",
			),
			...identifierProvenance(
				targetId,
				record.targetId,
				"sourceRelationTargetId",
			),
		} as JsonObject,
	});
}

function selectedKbResourceId(
	pack: TextPack,
	options: KnowledgeBaseFromPackOptions,
): string {
	return requireSingleTaskResourceBinding(pack, {
		slot: "kb",
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
	const sourceEntityId = expectString(row.entityId, "entityId");
	const entityId = canonicalKbIdentifier(sourceEntityId);
	const languageTag = expectString(row.languageTag, "languageTag");
	const label = expectString(row.label, "label");
	const description = optionalString(row.description);
	const typeId = optionalString(row.typeId);
	const metadata = {
		...identifierProvenance(entityId, sourceEntityId, "sourceEntityId"),
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
		targetId: canonicalKbIdentifier(expectString(row.entityId, "entityId")),
		matchKind: "alias" as const,
		language: expectString(row.languageTag, "languageTag"),
		source: "textpack",
	});
}

function relationTableRow(
	row: Readonly<Record<string, string>>,
): SemanticRelation {
	const scope = optionalString(row.scope);
	const sourceSourceId = expectString(row.sourceId, "sourceId");
	const sourceTargetId = expectString(row.targetId, "targetId");
	const sourceId = canonicalKbIdentifier(sourceSourceId);
	const targetId = canonicalKbIdentifier(sourceTargetId);
	return Object.freeze({
		sourceId,
		targetId,
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
			...identifierProvenance(
				sourceId,
				sourceSourceId,
				"sourceRelationSourceId",
			),
			...identifierProvenance(
				targetId,
				sourceTargetId,
				"sourceRelationTargetId",
			),
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

async function materializeKnowledgeBaseFromPack(
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
		if (ref.role === "lookup-index") continue;
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

export async function knowledgeBaseFromPack(
	pack: TextPack,
	options: KnowledgeBaseFromPackOptions = {},
): Promise<KnowledgeBase> {
	const resourceId = selectedKbResourceId(pack, options);
	return cachedKnowledgeBase(
		knowledgeBaseCache(pack, options.reader),
		JSON.stringify(["full", resourceId]),
		() =>
			materializeKnowledgeBaseFromPack(pack, {
				...options,
				resourceId,
			}),
	);
}

function labelMatchesMention(
	labels: readonly CanonicalLabel[] | undefined,
	mentionKeys: ReadonlySet<string>,
	language: string | undefined,
	maxEditDistance: number,
): boolean {
	return (labels ?? []).some(
		(label) =>
			(language === undefined || label.languageTag === language) &&
			mentionKeyMatches(label.value, mentionKeys, maxEditDistance),
	);
}

function inlineEntityAliases(
	entity: CanonicalEntity,
): readonly AliasEntryInput[] {
	const aliases: AliasEntryInput[] = [];
	const entityId = canonicalKbIdentifier(entity.entityId);
	for (const label of entity.labels) {
		aliases.push(
			Object.freeze({
				alias: label.value,
				targetKind: "entity" as const,
				targetId: entityId,
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
				targetId: entityId,
				matchKind: "alias" as const,
				language: alias.languageTag,
				source: "textpack",
			}),
		);
	}
	return Object.freeze(aliases);
}

async function materializeKnowledgeBaseSliceFromPack(
	pack: TextPack,
	options: KnowledgeBaseSliceFromPackOptions,
): Promise<KnowledgeBase> {
	const maxEditDistance = options.maxEditDistance ?? 0;
	if (!Number.isSafeInteger(maxEditDistance) || maxEditDistance < 0) {
		throw new TypeError("maxEditDistance must be a non-negative safe integer.");
	}
	const mentionKeys = new Set(
		options.mentions
			.map((mention) => normalizedMention(mention))
			.filter((mention) => mention.length > 0),
	);
	const resourceIds = selectedKbResourceIds(pack, options);
	const entities = new Map<string, EntityRecord>();
	const aliases: AliasEntryInput[] = [];
	const relations: SemanticRelation[] = [];
	const languageTags = new Set<string>();

	for (const resourceId of resourceIds) {
		// Candidate ids are scoped to one canonical KB. Carrying Wikidata QIDs
		// into the following WordNet resource causes cross-KB relation probes and
		// can contaminate an otherwise independent slice.
		const entityIds = new Set<string>();
		const resource = await openResourceJson<CanonicalKnowledgeBaseResource>(
			pack,
			resourceId,
			options.reader,
		);
		for (const tag of resource.languageTags ?? []) languageTags.add(tag);
		const language = options.language ?? resource.languageTags?.[0];

		for (const entity of resource.entities ?? []) {
			if (
				!labelMatchesMention(
					entity.labels,
					mentionKeys,
					language,
					maxEditDistance,
				) &&
				!labelMatchesMention(
					entity.aliases,
					mentionKeys,
					language,
					maxEditDistance,
				)
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
			for (const row of await indexedKbRows(
				pack,
				options.reader,
				ref.resourceId,
				{ mention: mentionKeys },
				requiredLookupIndexForKbSource(pack, refs, ref.resourceId),
				maxEditDistance,
			)) {
				if (
					(options.language !== undefined &&
						row.languageTag !== options.language) ||
					row.alias === undefined ||
					!mentionKeyMatches(row.alias, mentionKeys, maxEditDistance)
				) {
					continue;
				}
				const alias = aliasTableRow(row);
				aliases.push(alias);
				entityIds.add(alias.targetId);
			}
		}

		for (const ref of refs.filter(
			(candidate) => candidate.role === "entities",
		)) {
			for (const row of await indexedKbRows(
				pack,
				options.reader,
				ref.resourceId,
				{ entity: entityIds, mention: mentionKeys },
				requiredLookupIndexForKbSource(pack, refs, ref.resourceId),
				maxEditDistance,
			)) {
				const matchesId =
					row.entityId !== undefined &&
					entityIds.has(canonicalKbIdentifier(row.entityId));
				const matchesLabel =
					(options.language === undefined ||
						row.languageTag === options.language) &&
					row.label !== undefined &&
					mentionKeyMatches(row.label, mentionKeys, maxEditDistance);
				if (!matchesId && !matchesLabel) continue;
				const record = entityTableRow(row);
				upsertEntity(entities, record);
				entityIds.add(record.id);
			}
		}

		for (const ref of refs.filter(
			(candidate) => candidate.role === "relations",
		)) {
			if (entityIds.size === 0) continue;
			for (const row of await indexedKbRows(
				pack,
				options.reader,
				ref.resourceId,
				{ relation: entityIds },
				requiredLookupIndexForKbSource(pack, refs, ref.resourceId),
			)) {
				if (
					!(
						(row.sourceId !== undefined &&
							entityIds.has(canonicalKbIdentifier(row.sourceId))) ||
						(row.targetId !== undefined &&
							entityIds.has(canonicalKbIdentifier(row.targetId)))
					)
				) {
					continue;
				}
				relations.push(relationTableRow(row));
			}
		}
	}

	const knownAliases = aliases.filter((alias) => entities.has(alias.targetId));
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

export async function knowledgeBaseSliceFromPack(
	pack: TextPack,
	options: KnowledgeBaseSliceFromPackOptions,
): Promise<KnowledgeBase> {
	return materializeKnowledgeBaseSliceFromPack(pack, options);
}

export async function knowledgeBaseMentionKeyLengthsFromPack(
	pack: TextPack,
	options: KnowledgeBaseFromPackOptions & { readonly language?: string } = {},
): Promise<KnowledgeBaseMentionKeyLengths> {
	const lengths = new Set<number>();
	for (const resourceId of selectedKbResourceIds(pack, options)) {
		const canonical = await openResourceJson<CanonicalKnowledgeBaseResource>(
			pack,
			resourceId,
			options.reader,
		);
		for (const entity of canonical.entities ?? []) {
			for (const label of [...entity.labels, ...(entity.aliases ?? [])]) {
				if (
					options.language !== undefined &&
					label.languageTag !== options.language
				) {
					continue;
				}
				const normalized = normalizedMention(label.value);
				if (normalized.length > 0) lengths.add(Array.from(normalized).length);
			}
		}
		const refs = canonical.resourceRefs ?? [];
		for (const ref of refs) {
			const column =
				ref.role === "aliases"
					? "alias"
					: ref.role === "entities"
						? "label"
						: undefined;
			if (column === undefined) continue;
			const index = await openResourceLookupIndex(
				pack,
				ref.resourceId,
				requiredLookupIndexForKbSource(pack, refs, ref.resourceId),
				options.reader,
			);
			for (const length of index.normalizedKeyCodePointLengths(column)) {
				lengths.add(length);
			}
		}
	}
	const codePointLengths = Object.freeze(
		[...lengths].sort((left, right) => left - right),
	);
	return Object.freeze({
		codePointLengths,
		maximumCodePointLength: codePointLengths.at(-1) ?? 0,
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
		...(options.maxEditDistance === undefined
			? {}
			: { maxEditDistance: options.maxEditDistance }),
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
