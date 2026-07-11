import { nfkcCaseFold } from "@ismail-elkorchi/textfacts/casefold";
import {
	openResourceJson,
	openResourceLookupIndex,
	openResourceTable,
	openResourceText,
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

type KbTableIndexKind = "entity" | "mention" | "relation";

interface KbTableIndex {
	readonly columns: readonly string[];
	readonly rowStartsByKind: Readonly<
		Record<KbTableIndexKind, ReadonlyMap<string, readonly number[]>>
	>;
	readonly text: string;
}

interface KbPackTableIndexes {
	readonly defaultReader: Map<string, KbTableIndex>;
	readonly readers: WeakMap<TextPackResourceReader, Map<string, KbTableIndex>>;
}

const kbTableIndexes = new WeakMap<object, KbPackTableIndexes>();

function kbTableIndexesForReader(
	pack: TextPack,
	reader: TextPackResourceReader | undefined,
): Map<string, KbTableIndex> {
	let packIndexes = kbTableIndexes.get(pack);
	if (packIndexes === undefined) {
		packIndexes = { defaultReader: new Map(), readers: new WeakMap() };
		kbTableIndexes.set(pack, packIndexes);
	}
	if (reader === undefined) return packIndexes.defaultReader;
	let indexes = packIndexes.readers.get(reader);
	if (indexes === undefined) {
		indexes = new Map();
		packIndexes.readers.set(reader, indexes);
	}
	return indexes;
}

function addRowStart(
	index: Map<string, number[]>,
	key: string,
	start: number,
): void {
	if (key.length === 0) return;
	const starts = index.get(key);
	if (starts === undefined) index.set(key, [start]);
	else starts.push(start);
}

function buildKbTableIndex(text: string): KbTableIndex {
	const headerEnd = text.indexOf("\n");
	const rawHeader = text.slice(0, headerEnd === -1 ? text.length : headerEnd);
	const columns = Object.freeze(
		(rawHeader.endsWith("\r") ? rawHeader.slice(0, -1) : rawHeader).split("\t"),
	);
	const columnIndexes = new Map(
		columns.map((column, index) => [column, index]),
	);
	const rowStartsByKind: Record<KbTableIndexKind, Map<string, number[]>> = {
		entity: new Map(),
		mention: new Map(),
		relation: new Map(),
	};
	let start = headerEnd === -1 ? text.length : headerEnd + 1;
	while (start < text.length) {
		const newline = text.indexOf("\n", start);
		const end = newline === -1 ? text.length : newline;
		const rawLine = text.slice(start, end);
		const line = rawLine.endsWith("\r") ? rawLine.slice(0, -1) : rawLine;
		if (line.length > 0) {
			const cells = line.split("\t");
			for (const name of ["alias", "label"] as const) {
				const columnIndex = columnIndexes.get(name);
				if (columnIndex !== undefined) {
					addRowStart(
						rowStartsByKind.mention,
						normalizedMention(cells[columnIndex] ?? ""),
						start,
					);
				}
			}
			const entityColumn = columnIndexes.get("entityId");
			if (entityColumn !== undefined) {
				addRowStart(
					rowStartsByKind.entity,
					canonicalKbIdentifier(cells[entityColumn] ?? ""),
					start,
				);
			}
			for (const name of ["sourceId", "targetId"] as const) {
				const columnIndex = columnIndexes.get(name);
				if (columnIndex !== undefined) {
					addRowStart(
						rowStartsByKind.relation,
						canonicalKbIdentifier(cells[columnIndex] ?? ""),
						start,
					);
				}
			}
		}
		if (newline === -1) break;
		start = newline + 1;
	}
	return { columns, rowStartsByKind, text };
}

function kbTableIndex(
	pack: TextPack,
	reader: TextPackResourceReader | undefined,
	resourceId: string,
	text: string,
): KbTableIndex {
	const indexes = kbTableIndexesForReader(pack, reader);
	const cached = indexes.get(resourceId);
	if (cached !== undefined) return cached;
	const index = buildKbTableIndex(text);
	indexes.set(resourceId, index);
	return index;
}

function kbTableRow(
	index: KbTableIndex,
	start: number,
): Readonly<Record<string, string>> {
	const newline = index.text.indexOf("\n", start);
	const end = newline === -1 ? index.text.length : newline;
	const rawLine = index.text.slice(start, end);
	const line = rawLine.endsWith("\r") ? rawLine.slice(0, -1) : rawLine;
	const cells = line.split("\t");
	const row: Record<string, string> = {};
	for (
		let columnIndex = 0;
		columnIndex < index.columns.length;
		columnIndex += 1
	) {
		const column = index.columns[columnIndex];
		if (column !== undefined && column.length > 0) {
			row[column] = cells[columnIndex] ?? "";
		}
	}
	return Object.freeze(row);
}

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

function generatedKbRows(
	index: TextPackLookupIndex,
	keysByKind: Partial<Readonly<Record<KbTableIndexKind, ReadonlySet<string>>>>,
): readonly Readonly<Record<string, string>>[] {
	const rowsByStart = new Map<
		number,
		{ readonly length: number; readonly order: number }
	>();
	for (const kind of ["entity", "mention", "relation"] as const) {
		for (const key of keysByKind[kind] ?? []) {
			for (const variant of kbLookupKeyVariants(kind, key)) {
				for (const row of index.rowsForNormalizedKey(nfkcCaseFold(variant))) {
					if (!rowsByStart.has(row.rowStart)) {
						rowsByStart.set(row.rowStart, {
							length: row.rowLength,
							order: row.rowOrder,
						});
					}
				}
			}
		}
	}
	return Object.freeze(
		[...rowsByStart.entries()]
			.sort(
				([leftStart, left], [rightStart, right]) =>
					left.order - right.order || leftStart - rightStart,
			)
			.map(([rowStart, row]) =>
				index.materializeRow({
					rowStart,
					rowLength: row.length,
					rowOrder: row.order,
				}),
			),
	);
}

async function indexedKbRows(
	pack: TextPack,
	reader: TextPackResourceReader | undefined,
	resourceId: string,
	text: string,
	keysByKind: Partial<Readonly<Record<KbTableIndexKind, ReadonlySet<string>>>>,
	lookupIndexResourceId?: string,
): Promise<readonly Readonly<Record<string, string>>[]> {
	if (lookupIndexResourceId !== undefined) {
		return generatedKbRows(
			await openResourceLookupIndex(
				pack,
				resourceId,
				lookupIndexResourceId,
				reader,
			),
			keysByKind,
		);
	}
	const index = kbTableIndex(pack, reader, resourceId, text);
	const starts = new Set<number>();
	for (const kind of ["entity", "mention", "relation"] as const) {
		for (const key of keysByKind[kind] ?? []) {
			for (const start of index.rowStartsByKind[kind].get(key) ?? []) {
				starts.add(start);
			}
		}
	}
	return Object.freeze(
		[...starts]
			.sort((left, right) => left - right)
			.map((start) => kbTableRow(index, start)),
	);
}

function lookupIndexForKbSource(
	pack: TextPack,
	refs: readonly CanonicalResourceRef[],
	sourceResourceId: string,
): string | undefined {
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
	return undefined;
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
			for (const row of await indexedKbRows(
				pack,
				options.reader,
				ref.resourceId,
				text,
				{ mention: mentionKeys },
				lookupIndexForKbSource(pack, refs, ref.resourceId),
			)) {
				if (
					(options.language !== undefined &&
						row.languageTag !== options.language) ||
					row.alias === undefined ||
					!mentionKeys.has(normalizedMention(row.alias))
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
			const text = await openResourceText(pack, ref.resourceId, options.reader);
			for (const row of await indexedKbRows(
				pack,
				options.reader,
				ref.resourceId,
				text,
				{ entity: entityIds, mention: mentionKeys },
				lookupIndexForKbSource(pack, refs, ref.resourceId),
			)) {
				const matchesId =
					row.entityId !== undefined &&
					entityIds.has(canonicalKbIdentifier(row.entityId));
				const matchesLabel =
					(options.language === undefined ||
						row.languageTag === options.language) &&
					row.label !== undefined &&
					mentionKeys.has(normalizedMention(row.label));
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
			const text = await openResourceText(pack, ref.resourceId, options.reader);
			for (const row of await indexedKbRows(
				pack,
				options.reader,
				ref.resourceId,
				text,
				{ relation: entityIds },
				lookupIndexForKbSource(pack, refs, ref.resourceId),
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

export async function knowledgeBaseSliceFromPack(
	pack: TextPack,
	options: KnowledgeBaseSliceFromPackOptions,
): Promise<KnowledgeBase> {
	const mentions = [...new Set(options.mentions.map(normalizedMention))]
		.filter((mention) => mention.length > 0)
		.sort((left, right) => left.localeCompare(right));
	const key = JSON.stringify([
		"slice",
		options.resourceId ?? null,
		options.language ?? null,
		mentions,
	]);
	return cachedKnowledgeBase(
		knowledgeBaseCache(pack, options.reader),
		key,
		() => materializeKnowledgeBaseSliceFromPack(pack, options),
	);
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
