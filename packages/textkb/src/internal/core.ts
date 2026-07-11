import {
	type Annotation,
	type AnnotationAlternative,
	type AnnotationLayer,
	addAnnotation,
	addLayer,
	type Evidence,
	type Score,
	type SpanRef,
	selectAnnotations,
	type TextDocument,
} from "@ismail-elkorchi/textdoc";
import { nfkcCaseFold } from "@ismail-elkorchi/textfacts/casefold";
import { stableHash64 } from "@ismail-elkorchi/textfacts/hash";
import { segmentWords } from "@ismail-elkorchi/textfacts/segment";
import { boundedEditDistance } from "@ismail-elkorchi/textlex/fuzzy";

export const packageName = "@ismail-elkorchi/textkb" as const;
export const packageVersion = "0.1.0" as const;

export type PackageName = typeof packageName;

export class TextKbError extends Error {
	readonly code: string;

	constructor(code: string, message: string) {
		super(`${code}: ${message}`);
		this.name = "TextKbError";
		this.code = code;
	}
}

function fail(code: string, message: string): never {
	throw new TextKbError(code, message);
}

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
	| JsonPrimitive
	| readonly JsonValue[]
	| { readonly [key: string]: JsonValue };
export type JsonObject = { readonly [key: string]: JsonValue };

export type KbDiagnosticSeverity = "info" | "warning" | "error";

export interface KbDiagnostic {
	readonly code: string;
	readonly severity: KbDiagnosticSeverity;
	readonly message: string;
	readonly kbId?: string;
	readonly recordId?: string;
	readonly relationId?: string;
	readonly docId?: string;
	readonly layerId?: string;
	readonly annotationId?: string;
	readonly span?: SpanRef;
	readonly metadata?: JsonObject;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		return false;
	}
	if (Object.prototype.toString.call(value) !== "[object Object]") {
		return false;
	}
	const prototype = Object.getPrototypeOf(value);
	if (prototype === null) return true;
	const objectConstructor = (prototype as { readonly constructor?: unknown })
		.constructor;
	return (
		typeof objectConstructor === "function" &&
		Function.prototype.toString.call(objectConstructor) ===
			Function.prototype.toString.call(Object)
	);
}

function assertJsonString(value: string, path: string): void {
	for (let index = 0; index < value.length; ) {
		const codeUnit = value.charCodeAt(index);
		if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
			const next = value.charCodeAt(index + 1);
			if (next >= 0xdc00 && next <= 0xdfff) {
				index += 2;
				continue;
			}
			fail("TEXTKB_JSON_STRING", `${path} contains a lone high surrogate`);
		}
		if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
			fail("TEXTKB_JSON_STRING", `${path} contains a lone low surrogate`);
		}
		index += 1;
	}
}

export function assertJsonValue(
	value: unknown,
	path = "$",
): asserts value is JsonValue {
	if (value === null || typeof value === "boolean") return;
	if (typeof value === "string") {
		assertJsonString(value, path);
		return;
	}
	if (typeof value === "number") {
		if (!Number.isFinite(value)) {
			fail("TEXTKB_JSON_NUMBER", `${path} must be finite`);
		}
		return;
	}
	if (Array.isArray(value)) {
		for (let index = 0; index < value.length; index += 1) {
			assertJsonValue(value[index], `${path}[${index}]`);
		}
		return;
	}
	if (isPlainRecord(value)) {
		for (const key of Object.keys(value)) {
			assertJsonString(key, `${path}.key`);
			assertJsonValue(value[key], `${path}.${key}`);
		}
		return;
	}
	fail("TEXTKB_JSON_VALUE", `${path} must be an I-JSON value`);
}

export function assertJsonObject(
	value: unknown,
	path = "$",
): asserts value is JsonObject {
	assertJsonValue(value, path);
	if (!isPlainRecord(value)) {
		fail("TEXTKB_JSON_OBJECT", `${path} must be a JSON object`);
	}
}

function stableJsonClone<T extends JsonValue>(value: T): T {
	if (value === null || typeof value !== "object") return value;
	if (Array.isArray(value)) {
		return Object.freeze(
			value.map((entry) => stableJsonClone(entry)),
		) as unknown as T;
	}
	const output: Record<string, JsonValue> = {};
	for (const key of Object.keys(value).sort(compareStrings)) {
		output[key] = stableJsonClone(
			(value as Record<string, JsonValue>)[key] as JsonValue,
		);
	}
	return Object.freeze(output) as T;
}

function stableStringify(value: JsonValue): string {
	return JSON.stringify(stableJsonClone(value));
}

function jsonObjectClone(
	value: Readonly<Record<string, unknown>> | undefined,
	path: string,
): JsonObject {
	const input = value ?? {};
	assertJsonObject(input, path);
	return stableJsonClone(input);
}

function jsonValueClone(value: unknown, path: string): JsonValue {
	assertJsonValue(value, path);
	return stableJsonClone(value);
}

function compareStrings(left: string, right: string): number {
	return left < right ? -1 : left > right ? 1 : 0;
}

function compareNumbers(left: number, right: number): number {
	return left < right ? -1 : left > right ? 1 : 0;
}

function stableEntries<T>(record: Readonly<Record<string, T>>): [string, T][] {
	return Object.entries(record).sort(([left], [right]) =>
		compareStrings(left, right),
	);
}

function freezeArray<T>(values: readonly T[]): readonly T[] {
	return Object.freeze([...values]);
}

function freezeRecord<T>(
	record: Readonly<Record<string, T>>,
): Readonly<Record<string, T>> {
	return Object.freeze(Object.fromEntries(stableEntries(record)));
}

function uniqueSorted(values: Iterable<string>): readonly string[] {
	return freezeArray([...new Set(values)].sort(compareStrings));
}

function stableId(prefix: string, payload: JsonValue): string {
	return `${prefix}-${stableHash64(stableStringify(payload))}`;
}

function assertNonEmptyString(
	value: unknown,
	path: string,
): asserts value is string {
	if (typeof value !== "string" || value.length === 0) {
		fail("TEXTKB_STRING", `${path} must be a non-empty string`);
	}
}

function finiteNumber(value: unknown, path: string): number {
	if (typeof value !== "number" || !Number.isFinite(value)) {
		fail("TEXTKB_NUMBER", `${path} must be finite`);
	}
	return value;
}

function normalizeAliasText(text: string): string {
	return nfkcCaseFold(text).replace(/\s+/gu, " ").trim();
}

function normalizedTextTokens(text: string): readonly string[] {
	const normalized = normalizeAliasText(text);
	if (normalized.length === 0) return [];
	return freezeArray(normalized.split(" ").filter((token) => token.length > 0));
}

function copyStringList(
	values: readonly string[] | undefined,
	path: string,
): readonly string[] | undefined {
	if (values === undefined) return undefined;
	if (!Array.isArray(values)) {
		fail("TEXTKB_STRING_LIST", `${path} must be a string array`);
	}
	const result = uniqueSorted(
		values.map((value, index) => {
			assertNonEmptyString(value, `${path}[${index}]`);
			return value;
		}),
	);
	if (result.length === 0) return undefined;
	return result;
}

function copyStringRecord(
	record: Readonly<Record<string, string>> | undefined,
	path: string,
): Readonly<Record<string, string>> | undefined {
	if (record === undefined) return undefined;
	if (!isPlainRecord(record)) {
		fail("TEXTKB_STRING_RECORD", `${path} must be a string record`);
	}
	const output: Record<string, string> = {};
	for (const [key, value] of stableEntries(record)) {
		assertNonEmptyString(key, `${path}.key`);
		if (typeof value !== "string") {
			fail("TEXTKB_STRING_RECORD", `${path}.${key} must be a string`);
		}
		output[key] = value;
	}
	return freezeRecord(output);
}

function copyStringListRecord(
	record: Readonly<Record<string, readonly string[]>>,
	path: string,
	allowEmpty = false,
): Readonly<Record<string, readonly string[]>> {
	if (!isPlainRecord(record)) {
		fail("TEXTKB_STRING_LIST_RECORD", `${path} must be a string-list record`);
	}
	const output: Record<string, readonly string[]> = {};
	for (const [key, value] of stableEntries(record)) {
		assertNonEmptyString(key, `${path}.key`);
		const copied = copyStringList(value as readonly string[], `${path}.${key}`);
		if (copied !== undefined) {
			output[key] = copied;
		}
	}
	if (!allowEmpty && Object.keys(output).length === 0) {
		fail("TEXTKB_STRING_LIST_RECORD", `${path} must not be empty`);
	}
	return freezeRecord(output);
}

function copyPriors(
	priors: Readonly<Record<string, number>> | undefined,
	path: string,
): Readonly<Record<string, number>> | undefined {
	if (priors === undefined) return undefined;
	if (!isPlainRecord(priors)) {
		fail("TEXTKB_PRIORS", `${path} must be a number record`);
	}
	const output: Record<string, number> = {};
	for (const [key, value] of stableEntries(priors)) {
		assertNonEmptyString(key, `${path}.key`);
		output[key] = finiteNumber(value, `${path}.${key}`);
	}
	return freezeRecord(output);
}

export type KbTargetKind =
	| "entity"
	| "concept"
	| "sense"
	| "term"
	| "type"
	| "external";

export type RelationDirection = "directed" | "undirected";

export const standardSemanticRelationTypes = freezeArray([
	"synonymy",
	"antonymy",
	"hypernymy",
	"hyponymy",
	"meronymy",
	"holonymy",
	"instance-of",
	"part-of",
	"broader-term",
	"narrower-term",
	"related-term",
	"equivalent-concept",
]);

export interface SourceMapping {
	readonly id: string;
	readonly sourceName: string;
	readonly sourceVersion?: string | undefined;
	readonly externalId?: string | undefined;
	readonly license?: string | undefined;
	readonly citation?: string | undefined;
	readonly priority?: number | undefined;
	readonly confidence?: number | undefined;
	readonly metadata?: JsonObject | undefined;
}

export interface SemanticRelation {
	readonly id?: string | undefined;
	readonly sourceId: string;
	readonly targetId: string;
	readonly type: string;
	readonly direction?: RelationDirection | undefined;
	readonly sourceKind?: KbTargetKind | undefined;
	readonly targetKind?: KbTargetKind | undefined;
	readonly domain?: string | undefined;
	readonly weight?: number | undefined;
	readonly sourceMappingIds?: readonly string[] | undefined;
	readonly metadata?: JsonObject | undefined;
}

export interface EntityRecord {
	readonly id: string;
	readonly labels: Readonly<Record<string, readonly string[]>>;
	readonly aliases?: Readonly<Record<string, readonly string[]>> | undefined;
	readonly types?: readonly string[] | undefined;
	readonly descriptions?: Readonly<Record<string, string>> | undefined;
	readonly relations?: readonly SemanticRelation[] | undefined;
	readonly priors?: Readonly<Record<string, number>> | undefined;
	readonly sourceMappings?: readonly SourceMapping[] | undefined;
	readonly metadata?: JsonObject | undefined;
}

export interface ConceptRecord {
	readonly id: string;
	readonly labels: Readonly<Record<string, readonly string[]>>;
	readonly aliases?: Readonly<Record<string, readonly string[]>> | undefined;
	readonly definitions?: Readonly<Record<string, string>> | undefined;
	readonly domains?: readonly string[] | undefined;
	readonly relations?: readonly SemanticRelation[] | undefined;
	readonly priors?: Readonly<Record<string, number>> | undefined;
	readonly sourceMappings?: readonly SourceMapping[] | undefined;
	readonly metadata?: JsonObject | undefined;
}

export interface SenseRecord {
	readonly id: string;
	readonly lemma: string;
	readonly pos?: string | undefined;
	readonly language?: string | undefined;
	readonly definition?: string | undefined;
	readonly examples?: readonly string[] | undefined;
	readonly aliases?: Readonly<Record<string, readonly string[]>> | undefined;
	readonly relations?: readonly SemanticRelation[] | undefined;
	readonly priors?: Readonly<Record<string, number>> | undefined;
	readonly sourceMappings?: readonly SourceMapping[] | undefined;
	readonly metadata?: JsonObject | undefined;
}

export interface EntityRecordStore {
	readonly kind: "entity-record-store";
	readonly records: Readonly<Record<string, EntityRecord>>;
	readonly ids: readonly string[];
	readonly size: number;
}

export interface ConceptRecordStore {
	readonly kind: "concept-record-store";
	readonly records: Readonly<Record<string, ConceptRecord>>;
	readonly ids: readonly string[];
	readonly size: number;
}

export interface SenseRecordStore {
	readonly kind: "sense-record-store";
	readonly records: Readonly<Record<string, SenseRecord>>;
	readonly ids: readonly string[];
	readonly size: number;
}

export interface SemanticRelationStore {
	readonly kind: "semantic-relation-store";
	readonly records: Readonly<Record<string, SemanticRelation>>;
	readonly ids: readonly string[];
	readonly bySource: Readonly<Record<string, readonly string[]>>;
	readonly byTarget: Readonly<Record<string, readonly string[]>>;
	readonly byType: Readonly<Record<string, readonly string[]>>;
	readonly size: number;
}

export interface AliasEntry {
	readonly key: string;
	readonly alias: string;
	readonly targetKind: "entity" | "concept" | "sense";
	readonly targetId: string;
	readonly matchKind: "label" | "alias" | "lemma";
	readonly language?: string | undefined;
	readonly source?: string | undefined;
	readonly types?: readonly string[] | undefined;
	readonly priority?: number | undefined;
}

export interface AliasIndex {
	readonly id: string;
	readonly normalizer: "nfkc-casefold";
	readonly keys: readonly string[];
	readonly entries: Readonly<Record<string, readonly AliasEntry[]>>;
	readonly size: number;
}

export interface KnowledgeBase {
	readonly id: string;
	readonly entities: EntityRecordStore;
	readonly concepts: ConceptRecordStore;
	readonly senses: SenseRecordStore;
	readonly relations: SemanticRelationStore;
	readonly aliases: AliasIndex;
	readonly metadata: JsonObject;
}

function normalizeSourceMapping(
	mapping: SourceMapping,
	path: string,
): SourceMapping {
	assertNonEmptyString(mapping.id, `${path}.id`);
	assertNonEmptyString(mapping.sourceName, `${path}.sourceName`);
	const priority =
		mapping.priority === undefined
			? undefined
			: finiteNumber(mapping.priority, `${path}.priority`);
	const confidence =
		mapping.confidence === undefined
			? undefined
			: finiteNumber(mapping.confidence, `${path}.confidence`);
	return Object.freeze({
		id: mapping.id,
		sourceName: mapping.sourceName,
		...(mapping.sourceVersion !== undefined
			? { sourceVersion: mapping.sourceVersion }
			: {}),
		...(mapping.externalId !== undefined
			? { externalId: mapping.externalId }
			: {}),
		...(mapping.license !== undefined ? { license: mapping.license } : {}),
		...(mapping.citation !== undefined ? { citation: mapping.citation } : {}),
		...(priority !== undefined ? { priority } : {}),
		...(confidence !== undefined ? { confidence } : {}),
		...(mapping.metadata !== undefined
			? { metadata: jsonObjectClone(mapping.metadata, `${path}.metadata`) }
			: {}),
	});
}

function normalizeSourceMappings(
	mappings: readonly SourceMapping[] | undefined,
	path: string,
): readonly SourceMapping[] | undefined {
	if (mappings === undefined) return undefined;
	if (!Array.isArray(mappings)) {
		fail("TEXTKB_SOURCE_MAPPINGS", `${path} must be an array`);
	}
	return freezeArray(
		mappings
			.map((mapping, index) =>
				normalizeSourceMapping(mapping, `${path}[${index}]`),
			)
			.sort((left, right) => compareStrings(left.id, right.id)),
	);
}

function normalizeRelation(
	relation: SemanticRelation,
	path: string,
): SemanticRelation {
	assertNonEmptyString(relation.sourceId, `${path}.sourceId`);
	assertNonEmptyString(relation.targetId, `${path}.targetId`);
	assertNonEmptyString(relation.type, `${path}.type`);
	const direction = relation.direction ?? "directed";
	if (direction !== "directed" && direction !== "undirected") {
		fail("TEXTKB_RELATION_DIRECTION", `${path}.direction is invalid`);
	}
	const weight =
		relation.weight === undefined
			? undefined
			: finiteNumber(relation.weight, `${path}.weight`);
	return Object.freeze({
		...(relation.id !== undefined ? { id: relation.id } : {}),
		sourceId: relation.sourceId,
		targetId: relation.targetId,
		type: relation.type,
		direction,
		...(relation.sourceKind !== undefined
			? { sourceKind: relation.sourceKind }
			: {}),
		...(relation.targetKind !== undefined
			? { targetKind: relation.targetKind }
			: {}),
		...(relation.domain !== undefined ? { domain: relation.domain } : {}),
		...(weight !== undefined ? { weight } : {}),
		...(relation.sourceMappingIds !== undefined
			? {
					sourceMappingIds: copyStringList(
						relation.sourceMappingIds,
						`${path}.sourceMappingIds`,
					),
				}
			: {}),
		...(relation.metadata !== undefined
			? { metadata: jsonObjectClone(relation.metadata, `${path}.metadata`) }
			: {}),
	});
}

function normalizeRelations(
	relations: readonly SemanticRelation[] | undefined,
	path: string,
): readonly SemanticRelation[] | undefined {
	if (relations === undefined) return undefined;
	if (!Array.isArray(relations)) {
		fail("TEXTKB_RELATIONS", `${path} must be an array`);
	}
	return freezeArray(
		relations
			.map((relation, index) =>
				normalizeRelation(relation, `${path}[${index}]`),
			)
			.sort(compareRelations),
	);
}

function compareRelations(
	left: SemanticRelation,
	right: SemanticRelation,
): number {
	return (
		compareStrings(left.sourceId, right.sourceId) ||
		compareStrings(left.type, right.type) ||
		compareStrings(left.targetId, right.targetId) ||
		compareStrings(left.id ?? "", right.id ?? "")
	);
}

function normalizeEntityRecord(
	record: EntityRecord,
	path: string,
): EntityRecord {
	assertNonEmptyString(record.id, `${path}.id`);
	return Object.freeze({
		id: record.id,
		labels: copyStringListRecord(record.labels, `${path}.labels`),
		...(record.aliases !== undefined
			? {
					aliases: copyStringListRecord(
						record.aliases,
						`${path}.aliases`,
						true,
					),
				}
			: {}),
		...(record.types !== undefined
			? { types: copyStringList(record.types, `${path}.types`) }
			: {}),
		...(record.descriptions !== undefined
			? {
					descriptions: copyStringRecord(
						record.descriptions,
						`${path}.descriptions`,
					),
				}
			: {}),
		...(record.relations !== undefined
			? { relations: normalizeRelations(record.relations, `${path}.relations`) }
			: {}),
		...(record.priors !== undefined
			? { priors: copyPriors(record.priors, `${path}.priors`) }
			: {}),
		...(record.sourceMappings !== undefined
			? {
					sourceMappings: normalizeSourceMappings(
						record.sourceMappings,
						`${path}.sourceMappings`,
					),
				}
			: {}),
		...(record.metadata !== undefined
			? { metadata: jsonObjectClone(record.metadata, `${path}.metadata`) }
			: {}),
	});
}

function normalizeConceptRecord(
	record: ConceptRecord,
	path: string,
): ConceptRecord {
	assertNonEmptyString(record.id, `${path}.id`);
	return Object.freeze({
		id: record.id,
		labels: copyStringListRecord(record.labels, `${path}.labels`),
		...(record.aliases !== undefined
			? {
					aliases: copyStringListRecord(
						record.aliases,
						`${path}.aliases`,
						true,
					),
				}
			: {}),
		...(record.definitions !== undefined
			? {
					definitions: copyStringRecord(
						record.definitions,
						`${path}.definitions`,
					),
				}
			: {}),
		...(record.domains !== undefined
			? { domains: copyStringList(record.domains, `${path}.domains`) }
			: {}),
		...(record.relations !== undefined
			? { relations: normalizeRelations(record.relations, `${path}.relations`) }
			: {}),
		...(record.priors !== undefined
			? { priors: copyPriors(record.priors, `${path}.priors`) }
			: {}),
		...(record.sourceMappings !== undefined
			? {
					sourceMappings: normalizeSourceMappings(
						record.sourceMappings,
						`${path}.sourceMappings`,
					),
				}
			: {}),
		...(record.metadata !== undefined
			? { metadata: jsonObjectClone(record.metadata, `${path}.metadata`) }
			: {}),
	});
}

function normalizeSenseRecord(record: SenseRecord, path: string): SenseRecord {
	assertNonEmptyString(record.id, `${path}.id`);
	assertNonEmptyString(record.lemma, `${path}.lemma`);
	return Object.freeze({
		id: record.id,
		lemma: record.lemma,
		...(record.pos !== undefined ? { pos: record.pos } : {}),
		...(record.language !== undefined ? { language: record.language } : {}),
		...(record.definition !== undefined
			? { definition: record.definition }
			: {}),
		...(record.examples !== undefined
			? { examples: copyStringList(record.examples, `${path}.examples`) }
			: {}),
		...(record.aliases !== undefined
			? {
					aliases: copyStringListRecord(
						record.aliases,
						`${path}.aliases`,
						true,
					),
				}
			: {}),
		...(record.relations !== undefined
			? { relations: normalizeRelations(record.relations, `${path}.relations`) }
			: {}),
		...(record.priors !== undefined
			? { priors: copyPriors(record.priors, `${path}.priors`) }
			: {}),
		...(record.sourceMappings !== undefined
			? {
					sourceMappings: normalizeSourceMappings(
						record.sourceMappings,
						`${path}.sourceMappings`,
					),
				}
			: {}),
		...(record.metadata !== undefined
			? { metadata: jsonObjectClone(record.metadata, `${path}.metadata`) }
			: {}),
	});
}

function duplicateGuard(id: string, seen: Set<string>, path: string): void {
	if (seen.has(id)) {
		fail("TEXTKB_DUPLICATE_ID", `${path} contains duplicate id: ${id}`);
	}
	seen.add(id);
}

export function createEntityRecordStore(
	records: readonly EntityRecord[] = [],
): EntityRecordStore {
	const seen = new Set<string>();
	const output: Record<string, EntityRecord> = {};
	for (const [index, record] of records.entries()) {
		const normalized = normalizeEntityRecord(record, `entities[${index}]`);
		duplicateGuard(normalized.id, seen, "entities");
		output[normalized.id] = normalized;
	}
	const frozen = freezeRecord(output);
	const ids = uniqueSorted(Object.keys(frozen));
	return Object.freeze({
		kind: "entity-record-store",
		records: frozen,
		ids,
		size: ids.length,
	});
}

export function createConceptRecordStore(
	records: readonly ConceptRecord[] = [],
): ConceptRecordStore {
	const seen = new Set<string>();
	const output: Record<string, ConceptRecord> = {};
	for (const [index, record] of records.entries()) {
		const normalized = normalizeConceptRecord(record, `concepts[${index}]`);
		duplicateGuard(normalized.id, seen, "concepts");
		output[normalized.id] = normalized;
	}
	const frozen = freezeRecord(output);
	const ids = uniqueSorted(Object.keys(frozen));
	return Object.freeze({
		kind: "concept-record-store",
		records: frozen,
		ids,
		size: ids.length,
	});
}

export function createSenseRecordStore(
	records: readonly SenseRecord[] = [],
): SenseRecordStore {
	const seen = new Set<string>();
	const output: Record<string, SenseRecord> = {};
	for (const [index, record] of records.entries()) {
		const normalized = normalizeSenseRecord(record, `senses[${index}]`);
		duplicateGuard(normalized.id, seen, "senses");
		output[normalized.id] = normalized;
	}
	const frozen = freezeRecord(output);
	const ids = uniqueSorted(Object.keys(frozen));
	return Object.freeze({
		kind: "sense-record-store",
		records: frozen,
		ids,
		size: ids.length,
	});
}

function relationId(relation: SemanticRelation): string {
	return (
		relation.id ??
		stableId("rel", {
			sourceId: relation.sourceId,
			targetId: relation.targetId,
			type: relation.type,
			domain: relation.domain ?? null,
		})
	);
}

function relationEndpointIsExternal(kind: KbTargetKind | undefined): boolean {
	return kind === "external" || kind === "type";
}

export interface SemanticRelationStoreOptions {
	readonly knownIds?: readonly string[];
	readonly allowExternalEndpoints?: boolean;
}

export function createSemanticRelationStore(
	relations: readonly SemanticRelation[] = [],
	options: SemanticRelationStoreOptions = {},
): SemanticRelationStore {
	const knownIds = new Set(options.knownIds ?? []);
	const allowExternal = options.allowExternalEndpoints ?? false;
	const seen = new Set<string>();
	const records: Record<string, SemanticRelation> = {};
	for (const [index, relation] of relations.entries()) {
		const normalized = normalizeRelation(relation, `relations[${index}]`);
		if (
			!knownIds.has(normalized.sourceId) &&
			!relationEndpointIsExternal(normalized.sourceKind) &&
			!allowExternal
		) {
			fail(
				"TEXTKB_RELATION_ENDPOINT",
				`relation source is missing: ${normalized.sourceId}`,
			);
		}
		if (
			!knownIds.has(normalized.targetId) &&
			!relationEndpointIsExternal(normalized.targetKind) &&
			!allowExternal
		) {
			fail(
				"TEXTKB_RELATION_ENDPOINT",
				`relation target is missing: ${normalized.targetId}`,
			);
		}
		const id = relationId(normalized);
		duplicateGuard(id, seen, "relations");
		records[id] = Object.freeze({ ...normalized, id });
	}
	const frozen = freezeRecord(records);
	const ids = uniqueSorted(Object.keys(frozen));
	const bySource = indexRelationIds(frozen, "sourceId");
	const byTarget = indexRelationIds(frozen, "targetId");
	const byType = indexRelationIds(frozen, "type");
	return Object.freeze({
		kind: "semantic-relation-store",
		records: frozen,
		ids,
		bySource,
		byTarget,
		byType,
		size: ids.length,
	});
}

function indexRelationIds(
	relations: Readonly<Record<string, SemanticRelation>>,
	field: "sourceId" | "targetId" | "type",
): Readonly<Record<string, readonly string[]>> {
	const output: Record<string, string[]> = {};
	for (const [id, relation] of stableEntries(relations)) {
		const key = relation[field];
		output[key] = [...(output[key] ?? []), id];
	}
	return freezeRecord(
		Object.fromEntries(
			stableEntries(output).map(([key, ids]) => [key, uniqueSorted(ids)]),
		),
	);
}

export interface AliasEntryInput {
	readonly alias: string;
	readonly targetKind: "entity" | "concept" | "sense";
	readonly targetId: string;
	readonly matchKind?: "label" | "alias" | "lemma" | undefined;
	readonly language?: string | undefined;
	readonly source?: string | undefined;
	readonly types?: readonly string[] | undefined;
	readonly priority?: number | undefined;
}

export interface BuildAliasIndexInput {
	readonly id?: string | undefined;
	readonly entities?: EntityRecordStore | undefined;
	readonly concepts?: ConceptRecordStore | undefined;
	readonly senses?: SenseRecordStore | undefined;
	readonly aliases?: readonly AliasEntryInput[] | undefined;
}

export function buildAliasIndex(input: BuildAliasIndexInput = {}): AliasIndex {
	const entries: AliasEntry[] = [];
	if (input.entities !== undefined) {
		for (const entity of Object.values(input.entities.records)) {
			entries.push(...recordAliasEntries("entity", entity));
		}
	}
	if (input.concepts !== undefined) {
		for (const concept of Object.values(input.concepts.records)) {
			entries.push(...recordAliasEntries("concept", concept));
		}
	}
	if (input.senses !== undefined) {
		for (const sense of Object.values(input.senses.records)) {
			entries.push(...senseAliasEntries(sense));
		}
	}
	for (const [index, alias] of (input.aliases ?? []).entries()) {
		entries.push(normalizeAliasEntryInput(alias, `aliases[${index}]`));
	}
	validateAliasTargets(entries, input);
	const grouped: Record<string, AliasEntry[]> = Object.create(null);
	for (const entry of entries) {
		if (entry.key.length === 0) continue;
		const bucket = Object.hasOwn(grouped, entry.key)
			? (grouped[entry.key] ?? [])
			: [];
		bucket.push(entry);
		grouped[entry.key] = bucket;
	}
	const output: Record<string, readonly AliasEntry[]> = Object.create(null);
	for (const [key, values] of stableEntries(grouped)) {
		output[key] = freezeArray(values.sort(compareAliasEntries));
	}
	const keys = uniqueSorted(Object.keys(output));
	const id =
		input.id ??
		stableId("alias-index", {
			keys,
			entries: Object.fromEntries(
				keys.map((key) => [
					key,
					(output[key] ?? []).map((entry) => [
						entry.targetKind,
						entry.targetId,
						entry.alias,
						entry.matchKind,
					]),
				]),
			),
		});
	return Object.freeze({
		id,
		normalizer: "nfkc-casefold",
		keys,
		entries: freezeRecord(output),
		size: entries.length,
	});
}

function recordAliasEntries(
	targetKind: "entity" | "concept",
	record: EntityRecord | ConceptRecord,
): AliasEntry[] {
	const output: AliasEntry[] = [];
	const recordTypes =
		targetKind === "entity"
			? (record as EntityRecord).types
			: (record as ConceptRecord).domains;
	for (const [language, labels] of stableEntries(record.labels)) {
		for (const label of labels) {
			output.push(
				makeAliasEntry({
					alias: label,
					targetKind,
					targetId: record.id,
					matchKind: "label",
					language,
					types: recordTypes,
				}),
			);
		}
	}
	for (const [language, aliases] of stableEntries(record.aliases ?? {})) {
		for (const alias of aliases) {
			output.push(
				makeAliasEntry({
					alias,
					targetKind,
					targetId: record.id,
					matchKind: "alias",
					language,
					types: recordTypes,
				}),
			);
		}
	}
	return output;
}

function senseAliasEntries(sense: SenseRecord): AliasEntry[] {
	const output = [
		makeAliasEntry({
			alias: sense.lemma,
			targetKind: "sense",
			targetId: sense.id,
			matchKind: "lemma",
			...(sense.language !== undefined ? { language: sense.language } : {}),
			...(sense.pos !== undefined ? { types: [sense.pos] } : {}),
		}),
	];
	for (const [language, aliases] of stableEntries(sense.aliases ?? {})) {
		for (const alias of aliases) {
			output.push(
				makeAliasEntry({
					alias,
					targetKind: "sense",
					targetId: sense.id,
					matchKind: "alias",
					language,
					...(sense.pos !== undefined ? { types: [sense.pos] } : {}),
				}),
			);
		}
	}
	return output;
}

function normalizeAliasEntryInput(
	input: AliasEntryInput,
	path: string,
): AliasEntry {
	assertNonEmptyString(input.alias, `${path}.alias`);
	assertNonEmptyString(input.targetId, `${path}.targetId`);
	if (
		input.targetKind !== "entity" &&
		input.targetKind !== "concept" &&
		input.targetKind !== "sense"
	) {
		fail("TEXTKB_ALIAS_TARGET", `${path}.targetKind is invalid`);
	}
	return makeAliasEntry({
		alias: input.alias,
		targetKind: input.targetKind,
		targetId: input.targetId,
		matchKind: input.matchKind ?? "alias",
		...(input.language !== undefined ? { language: input.language } : {}),
		...(input.source !== undefined ? { source: input.source } : {}),
		...(input.types !== undefined ? { types: input.types } : {}),
		...(input.priority !== undefined
			? { priority: finiteNumber(input.priority, `${path}.priority`) }
			: {}),
	});
}

function makeAliasEntry(
	input: Omit<AliasEntry, "key"> & {
		readonly types?: readonly string[] | undefined;
	},
): AliasEntry {
	return Object.freeze({
		key: normalizeAliasText(input.alias),
		alias: input.alias,
		targetKind: input.targetKind,
		targetId: input.targetId,
		matchKind: input.matchKind,
		...(input.language !== undefined ? { language: input.language } : {}),
		...(input.source !== undefined ? { source: input.source } : {}),
		...(input.types !== undefined
			? { types: copyStringList(input.types, "alias.types") }
			: {}),
		...(input.priority !== undefined ? { priority: input.priority } : {}),
	});
}

function compareAliasEntries(left: AliasEntry, right: AliasEntry): number {
	return (
		compareStrings(left.targetKind, right.targetKind) ||
		compareStrings(left.targetId, right.targetId) ||
		compareNumbers(
			aliasMatchRank(left.matchKind),
			aliasMatchRank(right.matchKind),
		) ||
		compareStrings(left.alias, right.alias)
	);
}

function aliasMatchRank(kind: AliasEntry["matchKind"]): number {
	if (kind === "label") return 0;
	if (kind === "lemma") return 1;
	return 2;
}

function validateAliasTargets(
	entries: readonly AliasEntry[],
	input: BuildAliasIndexInput,
): void {
	for (const entry of entries) {
		if (
			entry.targetKind === "entity" &&
			input.entities?.records[entry.targetId] === undefined
		) {
			fail(
				"TEXTKB_ALIAS_TARGET",
				`entity alias target is missing: ${entry.targetId}`,
			);
		}
		if (
			entry.targetKind === "concept" &&
			input.concepts?.records[entry.targetId] === undefined
		) {
			fail(
				"TEXTKB_ALIAS_TARGET",
				`concept alias target is missing: ${entry.targetId}`,
			);
		}
		if (
			entry.targetKind === "sense" &&
			input.senses?.records[entry.targetId] === undefined
		) {
			fail(
				"TEXTKB_ALIAS_TARGET",
				`sense alias target is missing: ${entry.targetId}`,
			);
		}
	}
}

export interface CreateKnowledgeBaseOptions {
	readonly id?: string | undefined;
	readonly entities?: readonly EntityRecord[] | undefined;
	readonly concepts?: readonly ConceptRecord[] | undefined;
	readonly senses?: readonly SenseRecord[] | undefined;
	readonly relations?: readonly SemanticRelation[] | undefined;
	readonly aliases?: readonly AliasEntryInput[] | undefined;
	readonly metadata?: Readonly<Record<string, unknown>> | undefined;
	readonly allowExternalRelationEndpoints?: boolean | undefined;
}

export function createKnowledgeBase(
	options: CreateKnowledgeBaseOptions = {},
): KnowledgeBase {
	const entities = createEntityRecordStore(options.entities ?? []);
	const concepts = createConceptRecordStore(options.concepts ?? []);
	const senses = createSenseRecordStore(options.senses ?? []);
	const relationInputs = [
		...(options.relations ?? []),
		...Object.values(entities.records).flatMap(
			(record) => record.relations ?? [],
		),
		...Object.values(concepts.records).flatMap(
			(record) => record.relations ?? [],
		),
		...Object.values(senses.records).flatMap(
			(record) => record.relations ?? [],
		),
	];
	const knownIds = uniqueSorted([
		...entities.ids,
		...concepts.ids,
		...senses.ids,
	]);
	const relations = createSemanticRelationStore(relationInputs, {
		knownIds,
		allowExternalEndpoints: options.allowExternalRelationEndpoints ?? false,
	});
	const aliases = buildAliasIndex({
		entities,
		concepts,
		senses,
		aliases: options.aliases,
	});
	const metadata = jsonObjectClone(options.metadata, "metadata");
	const id =
		options.id ??
		stableId("kb", {
			entities: entities.ids,
			concepts: concepts.ids,
			senses: senses.ids,
			relations: relations.ids,
			metadata,
		});
	assertNonEmptyString(id, "id");
	return Object.freeze({
		id,
		entities,
		concepts,
		senses,
		relations,
		aliases,
		metadata,
	});
}

export interface EntityRowParseOptions {
	readonly language?: string;
	readonly source?: string;
}

export function parseEntityRows(
	rows: readonly string[],
	options: EntityRowParseOptions = {},
): EntityRecord[] {
	return rows
		.map((row, index) => parseEntityRow(row, index, options))
		.sort((left, right) => compareStrings(left.id, right.id));
}

function parseEntityRow(
	row: string,
	index: number,
	options: EntityRowParseOptions,
): EntityRecord {
	const cells = row.split(/\t+/u).filter((cell) => cell.length > 0);
	const id = cells.shift();
	assertNonEmptyString(id, `entityRows[${index}].id`);
	const labels: Record<string, string[]> = {};
	const aliases: Record<string, string[]> = {};
	const types: string[] = [];
	for (const part of cells) {
		const [key, ...valueParts] = part.split("=");
		const value = valueParts.join("=");
		if (key === "label" && value.length > 0) {
			labels[options.language ?? "und"] = [
				...(labels[options.language ?? "und"] ?? []),
				value.replace(/_/gu, " "),
			];
		} else if (key === "alias" && value.length > 0) {
			aliases[options.language ?? "und"] = [
				...(aliases[options.language ?? "und"] ?? []),
				value.replace(/_/gu, " "),
			];
		} else if (key === "type" && value.length > 0) {
			types.push(value);
		}
	}
	if (Object.keys(labels).length === 0) labels.und = [id];
	return {
		id,
		labels,
		...(Object.keys(aliases).length > 0 ? { aliases } : {}),
		...(types.length > 0 ? { types } : {}),
		...(options.source !== undefined
			? {
					sourceMappings: [
						{ id: `${options.source}:${id}`, sourceName: options.source },
					],
				}
			: {}),
	};
}

export function parseAliasRows(rows: readonly string[]): AliasEntryInput[] {
	return rows
		.map((row, index) => {
			const [alias, ...fields] = row.split(/\t+/u);
			assertNonEmptyString(alias, `aliasRows[${index}].alias`);
			let targetId = "";
			let targetKind: AliasEntryInput["targetKind"] = "entity";
			for (const field of fields.flatMap((part) => part.split(/\s+/u))) {
				const [key, ...valueParts] = field.split("=");
				const value = valueParts.join("=");
				if (key === "kb" || key === "entity") {
					targetKind = "entity";
					targetId = value;
				}
				if (key === "concept") {
					targetKind = "concept";
					targetId = value;
				}
				if (key === "sense") {
					targetKind = "sense";
					targetId = value;
				}
			}
			assertNonEmptyString(targetId, `aliasRows[${index}].targetId`);
			return {
				alias,
				targetKind,
				targetId,
				matchKind: "alias" as const,
				source: "row",
			};
		})
		.sort((left, right) => compareStrings(left.alias, right.alias));
}

export function parseRelationRows(rows: readonly string[]): SemanticRelation[] {
	return rows
		.map((row, index) => {
			const [sourceId, type, targetId] = row.split(/\s+/u);
			assertNonEmptyString(sourceId, `relationRows[${index}].sourceId`);
			assertNonEmptyString(type, `relationRows[${index}].type`);
			assertNonEmptyString(targetId, `relationRows[${index}].targetId`);
			return {
				sourceId,
				targetId,
				type,
				sourceKind: "type" as const,
				targetKind: "type" as const,
			};
		})
		.sort(compareRelations);
}

export interface DisambiguationFeatures {
	readonly aliasScore?: number | undefined;
	readonly prior?: number | undefined;
	readonly typeMatch?: number | undefined;
	readonly contextOverlap?: number | undefined;
	readonly corpusCount?: number | undefined;
	readonly ruleScore?: number | undefined;
	readonly sourcePriority?: number | undefined;
}

export interface DisambiguationWeights {
	readonly aliasScore?: number | undefined;
	readonly prior?: number | undefined;
	readonly typeMatch?: number | undefined;
	readonly contextOverlap?: number | undefined;
	readonly corpusCount?: number | undefined;
	readonly ruleScore?: number | undefined;
	readonly sourcePriority?: number | undefined;
}

const defaultWeights: {
	readonly aliasScore: number;
	readonly prior: number;
	readonly typeMatch: number;
	readonly contextOverlap: number;
	readonly corpusCount: number;
	readonly ruleScore: number;
	readonly sourcePriority: number;
} = {
	aliasScore: 1,
	prior: 0.25,
	typeMatch: 0.2,
	contextOverlap: 0.2,
	corpusCount: 0.15,
	ruleScore: 0.25,
	sourcePriority: 0.1,
};

export function scoreDisambiguation(
	features: DisambiguationFeatures,
	weights: DisambiguationWeights = {},
): number {
	const resolved: {
		readonly aliasScore: number;
		readonly prior: number;
		readonly typeMatch: number;
		readonly contextOverlap: number;
		readonly corpusCount: number;
		readonly ruleScore: number;
		readonly sourcePriority: number;
	} = {
		aliasScore: weights.aliasScore ?? defaultWeights.aliasScore,
		prior: weights.prior ?? defaultWeights.prior,
		typeMatch: weights.typeMatch ?? defaultWeights.typeMatch,
		contextOverlap: weights.contextOverlap ?? defaultWeights.contextOverlap,
		corpusCount: weights.corpusCount ?? defaultWeights.corpusCount,
		ruleScore: weights.ruleScore ?? defaultWeights.ruleScore,
		sourcePriority: weights.sourcePriority ?? defaultWeights.sourcePriority,
	};
	const score =
		featureValue(features.aliasScore, "aliasScore") * resolved.aliasScore +
		featureValue(features.prior, "prior") * resolved.prior +
		featureValue(features.typeMatch, "typeMatch") * resolved.typeMatch +
		featureValue(features.contextOverlap, "contextOverlap") *
			resolved.contextOverlap +
		featureValue(features.corpusCount, "corpusCount") * resolved.corpusCount +
		featureValue(features.ruleScore, "ruleScore") * resolved.ruleScore +
		featureValue(features.sourcePriority, "sourcePriority") *
			resolved.sourcePriority;
	return Math.round(score * 1_000_000) / 1_000_000;
}

function featureValue(value: number | undefined, path: string): number {
	if (value === undefined) return 0;
	const finite = finiteNumber(value, path);
	if (finite < 0) return 0;
	if (finite > 1) return 1;
	return finite;
}

export interface CandidateOptions {
	readonly language?: string | undefined;
	readonly targetTypes?: readonly string[] | undefined;
	readonly maxCandidates?: number | undefined;
	readonly minScore?: number | undefined;
	readonly maxEditDistance?: number | undefined;
	readonly contextText?: string | undefined;
	readonly contextTerms?: readonly string[] | undefined;
	readonly corpusCounts?: Readonly<Record<string, number>> | undefined;
	readonly ruleConstraints?:
		| Readonly<Record<string, number | "allow" | "block">>
		| undefined;
	readonly weights?: DisambiguationWeights | undefined;
}

export interface EntityCandidate {
	readonly kind: "entity";
	readonly kbId: string;
	readonly entityId: string;
	readonly label: string;
	readonly matchedAlias: string;
	readonly aliasMatchKind: AliasEntry["matchKind"];
	readonly matchKind: "exact" | "normalized" | "fuzzy";
	readonly score: number;
	readonly rank: number;
	readonly types: readonly string[];
	readonly prior?: number | undefined;
	readonly editDistance?: number | undefined;
	readonly features: DisambiguationFeatures;
	readonly spans?: readonly SpanRef[] | undefined;
}

export interface ConceptCandidate {
	readonly kind: "concept";
	readonly kbId: string;
	readonly conceptId: string;
	readonly label: string;
	readonly matchedAlias: string;
	readonly aliasMatchKind: AliasEntry["matchKind"];
	readonly matchKind: "exact" | "normalized" | "fuzzy";
	readonly score: number;
	readonly rank: number;
	readonly domains: readonly string[];
	readonly prior?: number | undefined;
	readonly editDistance?: number | undefined;
	readonly features: DisambiguationFeatures;
	readonly spans?: readonly SpanRef[] | undefined;
}

export interface SenseCandidate {
	readonly kind: "sense";
	readonly kbId: string;
	readonly senseId: string;
	readonly lemma: string;
	readonly pos?: string | undefined;
	readonly language?: string | undefined;
	readonly matchedAlias: string;
	readonly aliasMatchKind: AliasEntry["matchKind"];
	readonly matchKind: "exact" | "normalized" | "fuzzy";
	readonly score: number;
	readonly rank: number;
	readonly prior?: number | undefined;
	readonly editDistance?: number | undefined;
	readonly features: DisambiguationFeatures;
	readonly spans?: readonly SpanRef[] | undefined;
}

interface AliasMatch {
	readonly entry: AliasEntry;
	readonly matchKind: "exact" | "normalized" | "fuzzy";
	readonly aliasScore: number;
	readonly editDistance?: number;
}

export function candidateEntities(
	kb: KnowledgeBase,
	mention: string,
	options: CandidateOptions = {},
): EntityCandidate[] {
	assertNonEmptyString(mention, "mention");
	const candidates = collectAliasMatches(kb, mention, "entity", options)
		.map((match) => entityCandidateFromMatch(kb, match, options))
		.filter(
			(candidate): candidate is EntityCandidate => candidate !== undefined,
		);
	return rankCandidates(candidates, options) as EntityCandidate[];
}

export function candidateConcepts(
	kb: KnowledgeBase,
	term: string,
	options: CandidateOptions = {},
): ConceptCandidate[] {
	assertNonEmptyString(term, "term");
	const candidates = collectAliasMatches(kb, term, "concept", options)
		.map((match) => conceptCandidateFromMatch(kb, match, options))
		.filter(
			(candidate): candidate is ConceptCandidate => candidate !== undefined,
		);
	return rankCandidates(candidates, options) as ConceptCandidate[];
}

export function candidateSenses(
	kb: KnowledgeBase,
	word: string,
	options: CandidateOptions & { readonly pos?: string | undefined } = {},
): SenseCandidate[] {
	assertNonEmptyString(word, "word");
	const candidates = collectAliasMatches(kb, word, "sense", options)
		.map((match) => senseCandidateFromMatch(kb, match, options))
		.filter(
			(candidate): candidate is SenseCandidate => candidate !== undefined,
		);
	return rankCandidates(candidates, options) as SenseCandidate[];
}

function collectAliasMatches(
	kb: KnowledgeBase,
	text: string,
	targetKind: AliasEntry["targetKind"],
	options: CandidateOptions,
): AliasMatch[] {
	const key = normalizeAliasText(text);
	const matches: AliasMatch[] = [];
	for (const entry of kb.aliases.entries[key] ?? []) {
		if (entry.targetKind !== targetKind) continue;
		if (!aliasLanguageMatches(entry.language, options.language)) continue;
		matches.push({
			entry,
			matchKind: entry.alias === text ? "exact" : "normalized",
			aliasScore: entry.alias === text ? 1 : 0.92,
		});
	}
	const maxEditDistance = options.maxEditDistance ?? 0;
	if (maxEditDistance > 0) {
		for (const candidateKey of kb.aliases.keys) {
			if (candidateKey === key) continue;
			const distance = boundedEditDistance(key, candidateKey, maxEditDistance);
			if (distance === undefined) continue;
			for (const entry of kb.aliases.entries[candidateKey] ?? []) {
				if (entry.targetKind !== targetKind) continue;
				if (!aliasLanguageMatches(entry.language, options.language)) continue;
				matches.push({
					entry,
					matchKind: "fuzzy",
					aliasScore: Math.max(0.35, 0.85 - distance * 0.15),
					editDistance: distance,
				});
			}
		}
	}
	return matches.sort(compareAliasMatches);
}

function aliasLanguageMatches(
	entryLanguage: string | undefined,
	requestedLanguage: string | undefined,
): boolean {
	if (entryLanguage === undefined || requestedLanguage === undefined)
		return true;
	const entry = entryLanguage.toLocaleLowerCase();
	const requested = requestedLanguage.toLocaleLowerCase();
	return entry === requested || entry.split("-")[0] === requested.split("-")[0];
}

function compareAliasMatches(left: AliasMatch, right: AliasMatch): number {
	return (
		compareNumbers(
			aliasMatchKindRank(left.matchKind),
			aliasMatchKindRank(right.matchKind),
		) ||
		compareAliasEntries(left.entry, right.entry) ||
		compareNumbers(left.editDistance ?? 0, right.editDistance ?? 0)
	);
}

function aliasMatchKindRank(kind: AliasMatch["matchKind"]): number {
	if (kind === "exact") return 0;
	if (kind === "normalized") return 1;
	return 2;
}

function entityCandidateFromMatch(
	kb: KnowledgeBase,
	match: AliasMatch,
	options: CandidateOptions,
): EntityCandidate | undefined {
	const record = kb.entities.records[match.entry.targetId];
	if (record === undefined) return undefined;
	const types = record.types ?? [];
	if (!targetTypesMatch(types, options.targetTypes)) return undefined;
	const rule = options.ruleConstraints?.[record.id];
	if (rule === "block") return undefined;
	const prior = topPrior(record.priors, options.language);
	const features: DisambiguationFeatures = {
		aliasScore: match.aliasScore,
		prior,
		typeMatch: typeMatchScore(types, options.targetTypes),
		contextOverlap: contextOverlap(recordText(record), options),
		corpusCount: corpusScore(options.corpusCounts?.[record.id]),
		ruleScore: ruleScore(rule),
		sourcePriority: sourcePriority(record.sourceMappings),
	};
	const score = scoreDisambiguation(features, options.weights);
	if (score < (options.minScore ?? 0)) return undefined;
	return Object.freeze({
		kind: "entity",
		kbId: kb.id,
		entityId: record.id,
		label: preferredLabel(record.labels, options.language) ?? record.id,
		matchedAlias: match.entry.alias,
		aliasMatchKind: match.entry.matchKind,
		matchKind: match.matchKind,
		score,
		rank: 0,
		types,
		...(prior !== undefined ? { prior } : {}),
		...(match.editDistance !== undefined
			? { editDistance: match.editDistance }
			: {}),
		features,
	});
}

function conceptCandidateFromMatch(
	kb: KnowledgeBase,
	match: AliasMatch,
	options: CandidateOptions,
): ConceptCandidate | undefined {
	const record = kb.concepts.records[match.entry.targetId];
	if (record === undefined) return undefined;
	const domains = record.domains ?? [];
	if (!targetTypesMatch(domains, options.targetTypes)) return undefined;
	const rule = options.ruleConstraints?.[record.id];
	if (rule === "block") return undefined;
	const prior = topPrior(record.priors, options.language);
	const features: DisambiguationFeatures = {
		aliasScore: match.aliasScore,
		prior,
		typeMatch: typeMatchScore(domains, options.targetTypes),
		contextOverlap: contextOverlap(recordText(record), options),
		corpusCount: corpusScore(options.corpusCounts?.[record.id]),
		ruleScore: ruleScore(rule),
		sourcePriority: sourcePriority(record.sourceMappings),
	};
	const score = scoreDisambiguation(features, options.weights);
	if (score < (options.minScore ?? 0)) return undefined;
	return Object.freeze({
		kind: "concept",
		kbId: kb.id,
		conceptId: record.id,
		label: preferredLabel(record.labels, options.language) ?? record.id,
		matchedAlias: match.entry.alias,
		aliasMatchKind: match.entry.matchKind,
		matchKind: match.matchKind,
		score,
		rank: 0,
		domains,
		...(prior !== undefined ? { prior } : {}),
		...(match.editDistance !== undefined
			? { editDistance: match.editDistance }
			: {}),
		features,
	});
}

function senseCandidateFromMatch(
	kb: KnowledgeBase,
	match: AliasMatch,
	options: CandidateOptions & { readonly pos?: string | undefined },
): SenseCandidate | undefined {
	const record = kb.senses.records[match.entry.targetId];
	if (record === undefined) return undefined;
	if (options.language !== undefined && record.language !== options.language) {
		return undefined;
	}
	const rule = options.ruleConstraints?.[record.id];
	if (rule === "block") return undefined;
	const prior = topPrior(record.priors, options.language);
	const posMatches =
		options.pos === undefined || record.pos === undefined
			? undefined
			: record.pos === options.pos
				? 1
				: 0;
	const features: DisambiguationFeatures = {
		aliasScore: match.aliasScore,
		prior,
		typeMatch: posMatches,
		contextOverlap: contextOverlap(recordText(record), options),
		corpusCount: corpusScore(options.corpusCounts?.[record.id]),
		ruleScore: ruleScore(rule),
		sourcePriority: sourcePriority(record.sourceMappings),
	};
	const score = scoreDisambiguation(features, options.weights);
	if (score < (options.minScore ?? 0)) return undefined;
	return Object.freeze({
		kind: "sense",
		kbId: kb.id,
		senseId: record.id,
		lemma: record.lemma,
		...(record.pos !== undefined ? { pos: record.pos } : {}),
		...(record.language !== undefined ? { language: record.language } : {}),
		matchedAlias: match.entry.alias,
		aliasMatchKind: match.entry.matchKind,
		matchKind: match.matchKind,
		score,
		rank: 0,
		...(prior !== undefined ? { prior } : {}),
		...(match.editDistance !== undefined
			? { editDistance: match.editDistance }
			: {}),
		features,
	});
}

type Candidate = EntityCandidate | ConceptCandidate | SenseCandidate;

function rankCandidates<T extends Candidate>(
	candidates: readonly T[],
	options: CandidateOptions,
): readonly T[] {
	const selected = new Map<string, T>();
	for (const candidate of candidates) {
		const id = candidateTargetId(candidate);
		const existing = selected.get(id);
		if (existing === undefined || compareCandidates(candidate, existing) < 0) {
			selected.set(id, candidate);
		}
	}
	const limit = options.maxCandidates ?? 10;
	if (!Number.isInteger(limit) || limit <= 0) {
		fail("TEXTKB_CANDIDATE_LIMIT", "maxCandidates must be a positive integer");
	}
	return [...selected.values()]
		.sort(compareCandidates)
		.slice(0, limit)
		.map((candidate, index) =>
			Object.freeze({ ...candidate, rank: index + 1 }),
		) as unknown as readonly T[];
}

function candidateTargetId(candidate: Candidate): string {
	if (candidate.kind === "entity") return candidate.entityId;
	if (candidate.kind === "concept") return candidate.conceptId;
	return candidate.senseId;
}

function compareCandidates(left: Candidate, right: Candidate): number {
	return (
		compareNumbers(right.score, left.score) ||
		compareNumbers(matchRank(left.matchKind), matchRank(right.matchKind)) ||
		compareNumbers(right.prior ?? 0, left.prior ?? 0) ||
		compareStrings(candidateTargetId(left), candidateTargetId(right))
	);
}

function matchRank(kind: Candidate["matchKind"]): number {
	if (kind === "exact") return 0;
	if (kind === "normalized") return 1;
	return 2;
}

function targetTypesMatch(
	recordTypes: readonly string[],
	targetTypes: readonly string[] | undefined,
): boolean {
	if (targetTypes === undefined || targetTypes.length === 0) return true;
	const allowed = new Set(targetTypes);
	return recordTypes.some((type) => allowed.has(type));
}

function typeMatchScore(
	recordTypes: readonly string[],
	targetTypes: readonly string[] | undefined,
): number | undefined {
	if (targetTypes === undefined || targetTypes.length === 0) return undefined;
	return targetTypesMatch(recordTypes, targetTypes) ? 1 : 0;
}

function topPrior(
	priors: Readonly<Record<string, number>> | undefined,
	language: string | undefined,
): number | undefined {
	if (priors === undefined) return undefined;
	const values = [
		...(language !== undefined && priors[language] !== undefined
			? [priors[language]]
			: []),
		...(priors.default !== undefined ? [priors.default] : []),
		...Object.values(priors),
	];
	const max = Math.max(...values.map((value) => finiteNumber(value, "prior")));
	return Number.isFinite(max) ? Math.max(0, Math.min(1, max)) : undefined;
}

function recordText(
	record: EntityRecord | ConceptRecord | SenseRecord,
): string {
	const values: string[] = [];
	if ("labels" in record) {
		values.push(...Object.values(record.labels).flat());
		values.push(...Object.values(record.aliases ?? {}).flat());
	}
	if ("descriptions" in record && record.descriptions !== undefined) {
		values.push(...Object.values(record.descriptions));
	}
	if ("definitions" in record && record.definitions !== undefined) {
		values.push(...Object.values(record.definitions));
	}
	if ("definition" in record && record.definition !== undefined) {
		values.push(record.definition);
	}
	if ("examples" in record && record.examples !== undefined) {
		values.push(...record.examples);
	}
	if ("lemma" in record) values.push(record.lemma);
	return values.join(" ");
}

function contextOverlap(
	text: string,
	options: CandidateOptions,
): number | undefined {
	const contextTerms =
		options.contextTerms ?? normalizedTextTokens(options.contextText ?? "");
	if (contextTerms.length === 0) return undefined;
	const context = new Set(contextTerms.map(normalizeAliasText));
	const recordTokens = new Set(normalizedTextTokens(text));
	if (recordTokens.size === 0) return undefined;
	let hits = 0;
	for (const token of context) {
		if (recordTokens.has(token)) hits += 1;
	}
	return hits / Math.max(1, context.size);
}

function corpusScore(count: number | undefined): number | undefined {
	if (count === undefined) return undefined;
	const finite = finiteNumber(count, "corpusCount");
	if (finite <= 0) return 0;
	return Math.min(1, Math.log1p(finite) / 10);
}

function ruleScore(
	rule: number | "allow" | "block" | undefined,
): number | undefined {
	if (rule === undefined || rule === "allow" || rule === "block")
		return undefined;
	return featureValue(rule, "ruleScore");
}

function sourcePriority(
	mappings: readonly SourceMapping[] | undefined,
): number | undefined {
	if (mappings === undefined || mappings.length === 0) return undefined;
	return Math.max(...mappings.map((mapping) => mapping.priority ?? 0));
}

function preferredLabel(
	labels: Readonly<Record<string, readonly string[]>>,
	language: string | undefined,
): string | undefined {
	const exact = language === undefined ? undefined : labels[language]?.[0];
	if (exact !== undefined) return exact;
	return labels.und?.[0] ?? Object.values(labels)[0]?.[0];
}

export interface SemanticRelationQuery {
	readonly sourceId?: string | undefined;
	readonly targetId?: string | undefined;
	readonly type?: string | readonly string[] | undefined;
	readonly domain?: string | undefined;
	readonly direction?: "outgoing" | "incoming" | "any" | undefined;
}

export function querySemanticRelations(
	kb: KnowledgeBase,
	query: SemanticRelationQuery = {},
): SemanticRelation[] {
	const types =
		query.type === undefined
			? undefined
			: new Set(typeof query.type === "string" ? [query.type] : query.type);
	return Object.values(kb.relations.records)
		.filter((relation) => {
			if (types !== undefined && !types.has(relation.type)) return false;
			if (query.domain !== undefined && relation.domain !== query.domain)
				return false;
			if (query.sourceId !== undefined || query.targetId !== undefined) {
				const direction = query.direction ?? "outgoing";
				const outgoing =
					(query.sourceId === undefined ||
						relation.sourceId === query.sourceId) &&
					(query.targetId === undefined ||
						relation.targetId === query.targetId);
				const incoming =
					(query.sourceId === undefined ||
						relation.targetId === query.sourceId) &&
					(query.targetId === undefined ||
						relation.sourceId === query.targetId);
				if (direction === "outgoing") return outgoing;
				if (direction === "incoming") return incoming;
				return outgoing || incoming || relation.direction === "undirected";
			}
			return true;
		})
		.sort(compareRelations);
}

export interface SemanticRelationPath {
	readonly startId: string;
	readonly endId: string;
	readonly relationIds: readonly string[];
	readonly relationTypes: readonly string[];
	readonly depth: number;
}

export interface TraverseSemanticRelationsOptions {
	readonly types?: readonly string[] | undefined;
	readonly direction?: "outgoing" | "incoming" | "any" | undefined;
	readonly maxDepth?: number | undefined;
}

export function traverseSemanticRelations(
	kb: KnowledgeBase,
	startId: string,
	options: TraverseSemanticRelationsOptions = {},
): SemanticRelationPath[] {
	assertNonEmptyString(startId, "startId");
	const maxDepth = options.maxDepth ?? 1;
	if (!Number.isInteger(maxDepth) || maxDepth < 1) {
		fail("TEXTKB_TRAVERSAL_DEPTH", "maxDepth must be a positive integer");
	}
	const typeSet =
		options.types === undefined ? undefined : new Set(options.types);
	const queue: SemanticRelationPath[] = [
		{ startId, endId: startId, relationIds: [], relationTypes: [], depth: 0 },
	];
	const results: SemanticRelationPath[] = [];
	const visited = new Set<string>([`${startId}:0`]);
	for (let index = 0; index < queue.length; index += 1) {
		const path = queue[index] as SemanticRelationPath;
		if (path.depth >= maxDepth) continue;
		for (const relation of Object.values(kb.relations.records).sort(
			compareRelations,
		)) {
			if (typeSet !== undefined && !typeSet.has(relation.type)) continue;
			const nextId = nextRelationNode(
				path.endId,
				relation,
				options.direction ?? "outgoing",
			);
			if (nextId === undefined) continue;
			const nextPath: SemanticRelationPath = Object.freeze({
				startId,
				endId: nextId,
				relationIds: freezeArray([...path.relationIds, relation.id as string]),
				relationTypes: freezeArray([...path.relationTypes, relation.type]),
				depth: path.depth + 1,
			});
			const key = `${nextPath.endId}:${nextPath.relationIds.join(">")}`;
			if (visited.has(key)) continue;
			visited.add(key);
			results.push(nextPath);
			queue.push(nextPath);
		}
	}
	return results.sort(
		(left, right) =>
			compareNumbers(left.depth, right.depth) ||
			compareStrings(left.endId, right.endId) ||
			compareStrings(left.relationIds.join(">"), right.relationIds.join(">")),
	);
}

function nextRelationNode(
	nodeId: string,
	relation: SemanticRelation,
	direction: "outgoing" | "incoming" | "any",
): string | undefined {
	if (direction !== "incoming" && relation.sourceId === nodeId) {
		return relation.targetId;
	}
	if (
		(direction !== "outgoing" || relation.direction === "undirected") &&
		relation.targetId === nodeId
	) {
		return relation.sourceId;
	}
	return undefined;
}

export interface GazetteerOptions {
	readonly viewId?: string | undefined;
	readonly targetKinds?: readonly ("entity" | "concept")[] | undefined;
	readonly targetTypes?: readonly string[] | undefined;
	readonly layerId?: string | undefined;
	readonly boundary?: boolean | undefined;
	readonly maxMatches?: number | undefined;
}

export interface KbGazetteerMatch {
	readonly kbId: string;
	readonly targetKind: "entity" | "concept";
	readonly targetId: string;
	readonly label: string;
	readonly matchedAlias: string;
	readonly spans: readonly SpanRef[];
	readonly types: readonly string[];
}

export function ontologyGazetteer(
	input: string | TextDocument,
	kb: KnowledgeBase,
	options: GazetteerOptions = {},
): KbGazetteerMatch[] {
	const textContext =
		typeof input === "string"
			? stringContext(input)
			: documentContext(input, options.viewId);
	const kinds = new Set(options.targetKinds ?? ["entity", "concept"]);
	const aliases = Object.values(kb.aliases.entries)
		.flat()
		.filter(
			(entry) =>
				(entry.targetKind === "entity" || entry.targetKind === "concept") &&
				kinds.has(entry.targetKind),
		)
		.sort(compareAliasEntries);
	const matches: KbGazetteerMatch[] = [];
	const seen = new Set<string>();
	for (const entry of aliases) {
		for (const ref of scanAlias(
			textContext.text,
			textContext.viewId,
			entry.alias,
			options.boundary ?? true,
		)) {
			const record =
				entry.targetKind === "entity"
					? kb.entities.records[entry.targetId]
					: kb.concepts.records[entry.targetId];
			if (record === undefined) continue;
			const targetKind = entry.targetKind as "entity" | "concept";
			const types =
				targetKind === "entity"
					? ((record as EntityRecord).types ?? [])
					: ((record as ConceptRecord).domains ?? []);
			if (!targetTypesMatch(types, options.targetTypes)) continue;
			const key = `${targetKind}:${entry.targetId}:${ref.span.start}:${ref.span.end}`;
			if (seen.has(key)) continue;
			seen.add(key);
			matches.push(
				Object.freeze({
					kbId: kb.id,
					targetKind,
					targetId: entry.targetId,
					label: preferredLabel(record.labels, undefined) ?? entry.targetId,
					matchedAlias: entry.alias,
					spans: freezeArray([ref]),
					types,
				}),
			);
			if (matches.length >= (options.maxMatches ?? Number.POSITIVE_INFINITY)) {
				return matches.sort(compareGazetteerMatches);
			}
		}
	}
	return matches.sort(compareGazetteerMatches);
}

function compareGazetteerMatches(
	left: KbGazetteerMatch,
	right: KbGazetteerMatch,
): number {
	const leftSpan = left.spans[0]?.span;
	const rightSpan = right.spans[0]?.span;
	return (
		compareNumbers(leftSpan?.start ?? 0, rightSpan?.start ?? 0) ||
		compareNumbers(right.matchedAlias.length, left.matchedAlias.length) ||
		compareStrings(left.targetKind, right.targetKind) ||
		compareStrings(left.targetId, right.targetId)
	);
}

export function annotateOntologyGazetteer(
	doc: TextDocument,
	kb: KnowledgeBase,
	options: GazetteerOptions = {},
): TextDocument {
	const layerId = options.layerId ?? "kb.gazetteer";
	let output = ensureLayer(doc, layerId, "kb.gazetteer", options.viewId);
	for (const match of ontologyGazetteer(doc, kb, options)) {
		const annotation = makeAnnotation(
			output,
			kb,
			layerId,
			"kb.gazetteer",
			match.spans,
			{
				kind: "kb-gazetteer",
				kbId: kb.id,
				targetKind: match.targetKind,
				targetId: match.targetId,
				label: match.label,
				matchedAlias: match.matchedAlias,
				types: match.types,
			},
			[],
			optionsHash({ layerId, targetKinds: options.targetKinds ?? null }),
		);
		output = addAnnotationIfMissing(output, annotation);
	}
	return output;
}

export interface EntityLinkOptions extends CandidateOptions {
	readonly viewId?: string | undefined;
	readonly layerId?: string | undefined;
	readonly sourceLayerIds?: readonly string[] | undefined;
	readonly mentionSpans?: readonly SpanRef[] | undefined;
	readonly mentionSource?: "annotations" | "aliases" | "both" | undefined;
	readonly keepAlternatives?: boolean | undefined;
}

export interface TermLinkOptions extends CandidateOptions {
	readonly viewId?: string | undefined;
	readonly layerId?: string | undefined;
	readonly sourceLayerIds?: readonly string[] | undefined;
	readonly termSpans?: readonly SpanRef[] | undefined;
	readonly mentionSource?: "annotations" | "aliases" | "both" | undefined;
	readonly keepAlternatives?: boolean | undefined;
}

export interface SenseOptions extends CandidateOptions {
	readonly viewId?: string | undefined;
	readonly layerId?: string | undefined;
	readonly tokenLayerIds?: readonly string[] | undefined;
	readonly wordSpans?: readonly SpanRef[] | undefined;
	readonly pos?: string | undefined;
	readonly keepAlternatives?: boolean | undefined;
}

interface Mention {
	readonly text: string;
	readonly ref: SpanRef;
	readonly sourceAnnotationId?: string;
	readonly sourceLayerId?: string;
	readonly pos?: string;
}

export function linkEntities(
	doc: TextDocument,
	kb: KnowledgeBase,
	options: EntityLinkOptions = {},
): TextDocument {
	const layerId = options.layerId ?? "link.entity";
	let output = ensureLayer(doc, layerId, "link.entity", options.viewId);
	for (const mention of entityMentions(doc, kb, options)) {
		const candidates = candidateEntities(kb, mention.text, {
			...options,
			contextText: options.contextText ?? contextForMention(doc, mention.ref),
		});
		if (candidates.length === 0) continue;
		const [top, ...alternatives] = candidates;
		if (top === undefined) continue;
		const value = entityLinkValue(kb, top, mention);
		const annotation = makeAnnotation(
			output,
			kb,
			layerId,
			"link.entity",
			[mention.ref],
			value,
			options.keepAlternatives === false
				? []
				: alternatives.map((candidate) =>
						candidateAlternative(kb, "link.entity", candidate, mention.ref),
					),
			optionsHash({
				layerId,
				entityId: top.entityId,
				sourceAnnotationId: mention.sourceAnnotationId ?? null,
			}),
		);
		output = addAnnotationIfMissing(output, annotation);
	}
	return output;
}

export function linkTerms(
	doc: TextDocument,
	kb: KnowledgeBase,
	options: TermLinkOptions = {},
): TextDocument {
	const layerId = options.layerId ?? "term.link";
	let output = ensureLayer(doc, layerId, "term.link", options.viewId);
	for (const mention of termMentions(doc, kb, options)) {
		const candidates = candidateConcepts(kb, mention.text, {
			...options,
			contextText: options.contextText ?? contextForMention(doc, mention.ref),
		});
		if (candidates.length === 0) continue;
		const [top, ...alternatives] = candidates;
		if (top === undefined) continue;
		const annotation = makeAnnotation(
			output,
			kb,
			layerId,
			"term.link",
			[mention.ref],
			conceptLinkValue(kb, top, mention),
			options.keepAlternatives === false
				? []
				: alternatives.map((candidate) =>
						candidateAlternative(kb, "term.link", candidate, mention.ref),
					),
			optionsHash({
				layerId,
				conceptId: top.conceptId,
				sourceAnnotationId: mention.sourceAnnotationId ?? null,
			}),
		);
		output = addAnnotationIfMissing(output, annotation);
	}
	return output;
}

export function disambiguateSense(
	doc: TextDocument,
	kb: KnowledgeBase,
	options: SenseOptions = {},
): TextDocument {
	const layerId = options.layerId ?? "sense.link";
	let output = ensureLayer(doc, layerId, "sense.link", options.viewId);
	for (const mention of senseMentions(doc, options)) {
		const pos = mention.pos ?? options.pos;
		const candidates = candidateSenses(kb, mention.text, {
			...options,
			...(pos !== undefined ? { pos } : {}),
			contextText: options.contextText ?? contextForMention(doc, mention.ref),
		});
		if (candidates.length === 0) continue;
		const [top, ...alternatives] = candidates;
		if (top === undefined) continue;
		const annotation = makeAnnotation(
			output,
			kb,
			layerId,
			"sense.link",
			[mention.ref],
			senseLinkValue(kb, top, mention),
			options.keepAlternatives === false
				? []
				: alternatives.map((candidate) =>
						candidateAlternative(kb, "sense.link", candidate, mention.ref),
					),
			optionsHash({
				layerId,
				senseId: top.senseId,
				sourceAnnotationId: mention.sourceAnnotationId ?? null,
			}),
		);
		output = addAnnotationIfMissing(output, annotation);
	}
	return output;
}

function entityMentions(
	doc: TextDocument,
	kb: KnowledgeBase,
	options: EntityLinkOptions,
): Mention[] {
	return collectMentions(doc, kb, {
		viewId: options.viewId,
		sourceLayerIds: options.sourceLayerIds,
		explicitSpans: options.mentionSpans,
		mentionSource: options.mentionSource ?? "both",
		annotationLayerPrefix: "entity.",
		aliasTargetKind: "entity",
		language: options.language,
	});
}

function termMentions(
	doc: TextDocument,
	kb: KnowledgeBase,
	options: TermLinkOptions,
): Mention[] {
	return collectMentions(doc, kb, {
		viewId: options.viewId,
		sourceLayerIds: options.sourceLayerIds,
		explicitSpans: options.termSpans,
		mentionSource: options.mentionSource ?? "both",
		annotationLayerPrefix: "term.",
		aliasTargetKind: "concept",
		language: options.language,
	});
}

function senseMentions(doc: TextDocument, options: SenseOptions): Mention[] {
	const viewId = resolveViewId(doc, options.viewId);
	const mentions: Mention[] = [];
	const tokenLayerIds = new Set(options.tokenLayerIds ?? []);
	const annotations =
		tokenLayerIds.size > 0
			? selectAnnotations(doc, { layer: [...tokenLayerIds], order: "document" })
			: selectAnnotations(doc, { order: "document" }).filter(
					(annotation) =>
						annotation.layer.startsWith("token.") ||
						annotation.layer.startsWith("lemma.") ||
						annotation.type.startsWith("token.") ||
						annotation.type.startsWith("lemma."),
				);
	for (const annotation of annotations) {
		const mention = mentionFromAnnotation(doc, annotation);
		if (mention !== undefined) mentions.push(mention);
	}
	for (const ref of options.wordSpans ?? []) {
		mentions.push(mentionFromSpan(doc, ref));
	}
	if (mentions.length === 0) {
		const view = doc.views[viewId];
		if (view === undefined) {
			fail("TEXTKB_VIEW", `view is missing: ${viewId}`);
		}
		for (const span of segmentWords(view.text)) {
			const ref: SpanRef = {
				viewId,
				span: { start: span.startCU, end: span.endCU, unit: "utf16-code-unit" },
			};
			const text = view.text.slice(span.startCU, span.endCU);
			if (normalizeAliasText(text).length > 0) {
				mentions.push({ text, ref });
			}
		}
	}
	return dedupeMentions(mentions);
}

function collectMentions(
	doc: TextDocument,
	kb: KnowledgeBase,
	config: {
		readonly viewId?: string | undefined;
		readonly sourceLayerIds?: readonly string[] | undefined;
		readonly explicitSpans?: readonly SpanRef[] | undefined;
		readonly mentionSource: "annotations" | "aliases" | "both";
		readonly annotationLayerPrefix: string;
		readonly aliasTargetKind: AliasEntry["targetKind"];
		readonly language?: string | undefined;
	},
): Mention[] {
	const mentions: Mention[] = [];
	if (config.mentionSource !== "aliases") {
		const sourceLayerIds = new Set(config.sourceLayerIds ?? []);
		const annotations =
			sourceLayerIds.size > 0
				? selectAnnotations(doc, {
						layer: [...sourceLayerIds],
						order: "document",
					})
				: selectAnnotations(doc, { order: "document" }).filter(
						(annotation) =>
							annotation.layer.startsWith(config.annotationLayerPrefix) ||
							annotation.type.startsWith(config.annotationLayerPrefix),
					);
		for (const annotation of annotations) {
			const mention = mentionFromAnnotation(doc, annotation);
			if (mention !== undefined) mentions.push(mention);
		}
	}
	for (const ref of config.explicitSpans ?? []) {
		mentions.push(mentionFromSpan(doc, ref));
	}
	if (config.mentionSource !== "annotations") {
		const view = documentContext(doc, config.viewId);
		const aliasEntries = Object.values(kb.aliases.entries)
			.flat()
			.filter(
				(entry) =>
					entry.targetKind === config.aliasTargetKind &&
					aliasLanguageMatches(entry.language, config.language),
			);
		const aliasKeys = new Set(aliasEntries.map((entry) => entry.key));
		const mentionPriorityByKey = new Map<string, number>();
		for (const entry of aliasEntries) {
			const matchKindPriority =
				entry.matchKind === "label" ? 2 : entry.matchKind === "lemma" ? 1 : 0;
			const priority = matchKindPriority * 1_000_000 + (entry.priority ?? 0);
			mentionPriorityByKey.set(
				entry.key,
				Math.max(mentionPriorityByKey.get(entry.key) ?? priority, priority),
			);
		}
		for (const ref of scanAliasKeys(
			view.text,
			view.viewId,
			aliasKeys,
			true,
			mentionPriorityByKey,
		)) {
			mentions.push({
				text: view.text.slice(ref.span.start, ref.span.end),
				ref,
			});
		}
	}
	return dedupeMentions(mentions);
}

function mentionFromAnnotation(
	doc: TextDocument,
	annotation: Annotation,
): Mention | undefined {
	const ref = annotation.spans[0];
	if (ref === undefined) return undefined;
	const text = annotationValueText(annotation) ?? spanText(doc, ref);
	const pos = annotationFeatureText(annotation, "pos");
	return {
		text,
		ref: assertUtf16SpanRef(doc, ref),
		sourceAnnotationId: annotation.id,
		sourceLayerId: annotation.layer,
		...(pos !== undefined ? { pos } : {}),
	};
}

function annotationValueText(annotation: Annotation): string | undefined {
	const value = annotation.value;
	if (typeof value === "string" && value.length > 0) return value;
	if (!isPlainRecord(value)) return undefined;
	for (const key of ["text", "term", "label", "canonical", "lemma"]) {
		const candidate = value[key];
		if (typeof candidate === "string" && candidate.length > 0) return candidate;
	}
	return undefined;
}

function annotationFeatureText(
	annotation: Annotation,
	key: string,
): string | undefined {
	const candidate = annotation.features?.[key];
	return typeof candidate === "string" && candidate.length > 0
		? candidate
		: undefined;
}

function mentionFromSpan(doc: TextDocument, ref: SpanRef): Mention {
	const checked = assertUtf16SpanRef(doc, ref);
	return { text: spanText(doc, checked), ref: checked };
}

function dedupeMentions(mentions: readonly Mention[]): Mention[] {
	const seen = new Set<string>();
	const output: Mention[] = [];
	for (const mention of [...mentions].sort(compareMentions)) {
		const key = `${mention.ref.viewId}:${mention.ref.span.start}:${mention.ref.span.end}:${normalizeAliasText(mention.text)}`;
		if (seen.has(key)) continue;
		seen.add(key);
		output.push(mention);
	}
	return output;
}

function compareMentions(left: Mention, right: Mention): number {
	return (
		compareStrings(left.ref.viewId, right.ref.viewId) ||
		compareNumbers(left.ref.span.start, right.ref.span.start) ||
		compareNumbers(left.ref.span.end, right.ref.span.end) ||
		compareStrings(left.text, right.text)
	);
}

function assertUtf16SpanRef(doc: TextDocument, ref: SpanRef): SpanRef {
	if (ref.span.unit !== "utf16-code-unit") {
		fail(
			"TEXTKB_SPAN_UNIT",
			"textkb text slicing requires utf16-code-unit spans",
		);
	}
	const view = doc.views[ref.viewId];
	if (view === undefined) {
		fail("TEXTKB_VIEW", `view is missing: ${ref.viewId}`);
	}
	if (
		!Number.isInteger(ref.span.start) ||
		!Number.isInteger(ref.span.end) ||
		ref.span.start < 0 ||
		ref.span.end < ref.span.start ||
		ref.span.end > view.text.length
	) {
		fail("TEXTKB_SPAN", "span must be a valid half-open UTF-16 range");
	}
	return ref;
}

function spanText(doc: TextDocument, ref: SpanRef): string {
	const checked = assertUtf16SpanRef(doc, ref);
	return (doc.views[checked.viewId] as { readonly text: string }).text.slice(
		checked.span.start,
		checked.span.end,
	);
}

function contextForMention(doc: TextDocument, ref: SpanRef): string {
	const view = doc.views[ref.viewId];
	if (view === undefined) return "";
	const left = Math.max(0, ref.span.start - 80);
	const right = Math.min(view.text.length, ref.span.end + 80);
	return view.text.slice(left, right);
}

function resolveViewId(
	doc: TextDocument,
	preferred: string | undefined,
): string {
	if (preferred !== undefined) {
		if (doc.views[preferred] === undefined) {
			fail("TEXTKB_VIEW", `view is missing: ${preferred}`);
		}
		return preferred;
	}
	if (doc.views.raw !== undefined) return "raw";
	const first = Object.keys(doc.views).sort(compareStrings)[0];
	if (first === undefined) fail("TEXTKB_VIEW", "document has no views");
	return first;
}

function stringContext(text: string): {
	readonly text: string;
	readonly viewId: string;
} {
	return { text, viewId: "string" };
}

function documentContext(
	doc: TextDocument,
	viewId: string | undefined,
): { readonly text: string; readonly viewId: string } {
	const resolved = resolveViewId(doc, viewId);
	const view = doc.views[resolved];
	if (view === undefined) fail("TEXTKB_VIEW", `view is missing: ${resolved}`);
	return { text: view.text, viewId: resolved };
}

function scanAlias(
	text: string,
	viewId: string,
	alias: string,
	boundary: boolean,
): SpanRef[] {
	const aliasKey = normalizeAliasText(alias);
	return scanAliasKeys(text, viewId, new Set([aliasKey]), boundary);
}

function nextCodePointBoundary(text: string, offset: number): number {
	const codePoint = text.codePointAt(offset);
	return offset + (codePoint !== undefined && codePoint > 0xffff ? 2 : 1);
}

function codePointAtOffset(text: string, offset: number): string | undefined {
	if (offset < 0 || offset >= text.length) return undefined;
	const codePoint = text.codePointAt(offset);
	return codePoint === undefined ? undefined : String.fromCodePoint(codePoint);
}

function codePointBeforeOffset(
	text: string,
	offset: number,
): string | undefined {
	if (offset <= 0 || offset > text.length) return undefined;
	const low = text.charCodeAt(offset - 1);
	const start = low >= 0xdc00 && low <= 0xdfff ? offset - 2 : offset - 1;
	return codePointAtOffset(text, start);
}

function scanAliasKeys(
	text: string,
	viewId: string,
	keys: ReadonlySet<string>,
	boundary: boolean,
	priorityByKey: ReadonlyMap<string, number> = new Map(),
): SpanRef[] {
	const usableKeys = new Set([...keys].filter((key) => key.length > 0));
	if (usableKeys.size === 0 || text.length === 0) return [];
	const maxKeyLength = Math.max(...[...usableKeys].map((key) => key.length));
	const candidates: { readonly priority: number; readonly ref: SpanRef }[] = [];
	for (
		let start = 0;
		start < text.length;
		start = nextCodePointBoundary(text, start)
	) {
		if (/^\p{White_Space}$/u.test(codePointAtOffset(text, start) ?? ""))
			continue;
		if (boundary && isWordChar(codePointBeforeOffset(text, start))) continue;
		for (
			let end = nextCodePointBoundary(text, start);
			end <= text.length;
			end = nextCodePointBoundary(text, end)
		) {
			if (/^\p{White_Space}$/u.test(codePointBeforeOffset(text, end) ?? ""))
				continue;
			const key = normalizeAliasText(text.slice(start, end));
			if (key.length > maxKeyLength) break;
			if (!usableKeys.has(key)) continue;
			if (boundary && !isBoundary(text, start, end)) continue;
			candidates.push({
				priority: priorityByKey.get(key) ?? 0,
				ref: {
					viewId,
					span: { start, end, unit: "utf16-code-unit" },
				},
			});
			if (end === text.length) break;
		}
	}
	const selected: { readonly priority: number; readonly ref: SpanRef }[] = [];
	for (const candidate of candidates.sort((left, right) => {
		const leftLength = left.ref.span.end - left.ref.span.start;
		const rightLength = right.ref.span.end - right.ref.span.start;
		return (
			compareNumbers(right.priority, left.priority) ||
			compareNumbers(rightLength, leftLength) ||
			compareNumbers(left.ref.span.start, right.ref.span.start) ||
			compareNumbers(left.ref.span.end, right.ref.span.end)
		);
	})) {
		if (
			selected.some(
				(existing) =>
					existing.ref.span.start < candidate.ref.span.end &&
					candidate.ref.span.start < existing.ref.span.end,
			)
		) {
			continue;
		}
		selected.push(candidate);
	}
	return selected
		.sort(
			(left, right) =>
				compareNumbers(left.ref.span.start, right.ref.span.start) ||
				compareNumbers(left.ref.span.end, right.ref.span.end),
		)
		.map((candidate) => candidate.ref);
}

function isBoundary(text: string, start: number, end: number): boolean {
	return (
		!isWordChar(codePointBeforeOffset(text, start)) &&
		!isWordChar(codePointAtOffset(text, end))
	);
}

function isWordChar(char: string | undefined): boolean {
	return char !== undefined && /^[\p{L}\p{N}_]$/u.test(char);
}

function ensureLayer(
	doc: TextDocument,
	layerId: string,
	type: string,
	viewId: string | undefined,
): TextDocument {
	if (doc.layers[layerId] !== undefined) return doc;
	const resolvedViewId =
		viewId ?? Object.keys(doc.views).sort(compareStrings)[0];
	const layer: AnnotationLayer = {
		id: layerId,
		type,
		...(resolvedViewId !== undefined ? { viewId: resolvedViewId } : {}),
		annotations: {},
		metadata: { packageName },
	};
	return addLayer(doc, layer);
}

function addAnnotationIfMissing<T>(
	doc: TextDocument,
	annotation: Annotation<T>,
): TextDocument {
	if (
		Object.values(doc.layers).some((layer) =>
			Object.hasOwn(layer.annotations, annotation.id),
		)
	) {
		return doc;
	}
	return addAnnotation(doc, annotation);
}

function makeAnnotation<T extends JsonObject>(
	doc: TextDocument,
	kb: KnowledgeBase,
	layerId: string,
	type: string,
	spans: readonly SpanRef[],
	value: T,
	alternatives: readonly AnnotationAlternative<T>[],
	optionsHashValue: string,
): Annotation<T> {
	const inputViewIds = uniqueSorted(spans.map((span) => span.viewId));
	const id = stableId("textkb-ann", {
		docId: doc.id,
		layerId,
		type,
		kbId: kb.id,
		spans: spans.map((ref) => [ref.viewId, ref.span.start, ref.span.end]),
		value,
		optionsHash: optionsHashValue,
	});
	return Object.freeze({
		id,
		layer: layerId,
		type,
		spans: freezeArray(spans.map((ref) => assertUtf16SpanRef(doc, ref))),
		value,
		features: {
			kbId: kb.id,
			score:
				typeof value.score === "number"
					? finiteNumber(value.score, "score")
					: 1,
		},
		evidence: kbEvidence(kb, inputViewIds, optionsHashValue),
		...(alternatives.length > 0
			? { alternatives: freezeArray(alternatives) }
			: {}),
	});
}

function kbEvidence(
	kb: KnowledgeBase,
	inputViewIds: readonly string[],
	optionsHashValue: string,
): Evidence {
	return {
		mode: "kb",
		exactness: "E1",
		producer: packageName,
		packageName,
		packageVersion,
		kbIds: [kb.id],
		inputViewIds,
		optionsHash: optionsHashValue,
	};
}

function optionsHash(value: JsonValue): string {
	return stableHash64(stableStringify(value));
}

export interface EntityLinkValue extends JsonObject {
	readonly kind: "entity-link";
	readonly kbId: string;
	readonly entityId: string;
	readonly label: string;
	readonly entityTypes: readonly JsonValue[];
	readonly matchedAlias: string;
	readonly aliasMatchKind: AliasEntry["matchKind"];
	readonly matchKind: "exact" | "normalized" | "fuzzy";
	readonly score: number;
	readonly rank: number;
	readonly sourceEntityId?: string;
	readonly sourceAnnotationId?: string;
}

function entityLinkValue(
	kb: KnowledgeBase,
	candidate: EntityCandidate,
	mention: Mention,
): EntityLinkValue {
	const sourceEntityId =
		kb.entities.records[candidate.entityId]?.metadata?.sourceEntityId;
	return stableJsonClone({
		kind: "entity-link",
		kbId: kb.id,
		entityId: candidate.entityId,
		label: candidate.label,
		entityTypes: candidate.types,
		matchedAlias: candidate.matchedAlias,
		aliasMatchKind: candidate.aliasMatchKind,
		matchKind: candidate.matchKind,
		score: candidate.score,
		rank: candidate.rank,
		...(typeof sourceEntityId === "string" ? { sourceEntityId } : {}),
		...(mention.sourceAnnotationId !== undefined
			? { sourceAnnotationId: mention.sourceAnnotationId }
			: {}),
	});
}

export interface TermLinkValue extends JsonObject {
	readonly kind: "term-link";
	readonly kbId: string;
	readonly conceptId: string;
	readonly label: string;
	readonly domains: readonly JsonValue[];
	readonly matchedAlias: string;
	readonly score: number;
	readonly rank: number;
	readonly sourceAnnotationId?: string;
}

function conceptLinkValue(
	kb: KnowledgeBase,
	candidate: ConceptCandidate,
	mention: Mention,
): TermLinkValue {
	return stableJsonClone({
		kind: "term-link",
		kbId: kb.id,
		conceptId: candidate.conceptId,
		label: candidate.label,
		domains: candidate.domains,
		matchedAlias: candidate.matchedAlias,
		score: candidate.score,
		rank: candidate.rank,
		...(mention.sourceAnnotationId !== undefined
			? { sourceAnnotationId: mention.sourceAnnotationId }
			: {}),
	});
}

export interface SenseLinkValue extends JsonObject {
	readonly kind: "sense-link";
	readonly kbId: string;
	readonly senseId: string;
	readonly lemma: string;
	readonly pos?: string;
	readonly language?: string;
	readonly matchedAlias: string;
	readonly score: number;
	readonly rank: number;
	readonly sourceAnnotationId?: string;
}

function senseLinkValue(
	kb: KnowledgeBase,
	candidate: SenseCandidate,
	mention: Mention,
): SenseLinkValue {
	return stableJsonClone({
		kind: "sense-link",
		kbId: kb.id,
		senseId: candidate.senseId,
		lemma: candidate.lemma,
		...(candidate.pos !== undefined ? { pos: candidate.pos } : {}),
		...(candidate.language !== undefined
			? { language: candidate.language }
			: {}),
		matchedAlias: candidate.matchedAlias,
		score: candidate.score,
		rank: candidate.rank,
		...(mention.sourceAnnotationId !== undefined
			? { sourceAnnotationId: mention.sourceAnnotationId }
			: {}),
	});
}

function candidateAlternative<T extends Candidate>(
	kb: KnowledgeBase,
	type: string,
	candidate: T,
	ref: SpanRef,
): AnnotationAlternative<JsonObject> {
	const value = candidateValue(kb, candidate);
	return {
		value,
		evidence: kbEvidence(kb, [ref.viewId], optionsHash({ type, value })),
		score: {
			kind: "weight",
			value: candidate.score,
			scale: "textkb.disambiguation",
		},
	};
}

function candidateValue(kb: KnowledgeBase, candidate: Candidate): JsonObject {
	if (candidate.kind === "entity") {
		return stableJsonClone({
			kind: "entity-link",
			kbId: kb.id,
			entityId: candidate.entityId,
			label: candidate.label,
			entityTypes: candidate.types,
			matchedAlias: candidate.matchedAlias,
			aliasMatchKind: candidate.aliasMatchKind,
			matchKind: candidate.matchKind,
			score: candidate.score,
			rank: candidate.rank,
		});
	}
	if (candidate.kind === "concept") {
		return stableJsonClone({
			kind: "term-link",
			kbId: kb.id,
			conceptId: candidate.conceptId,
			label: candidate.label,
			domains: candidate.domains,
			matchedAlias: candidate.matchedAlias,
			score: candidate.score,
			rank: candidate.rank,
		});
	}
	return stableJsonClone({
		kind: "sense-link",
		kbId: kb.id,
		senseId: candidate.senseId,
		lemma: candidate.lemma,
		...(candidate.pos !== undefined ? { pos: candidate.pos } : {}),
		...(candidate.language !== undefined
			? { language: candidate.language }
			: {}),
		matchedAlias: candidate.matchedAlias,
		score: candidate.score,
		rank: candidate.rank,
	});
}

export interface LexicalChain {
	readonly id: string;
	readonly members: readonly string[];
	readonly relationTypes: readonly string[];
	readonly score: number;
}

export interface LexicalChainOptions {
	readonly relationTypes?: readonly string[];
	readonly includeSingletons?: boolean;
}

export function lexicalChains(
	kb: KnowledgeBase,
	memberIds: readonly string[],
	options: LexicalChainOptions = {},
): LexicalChain[] {
	const relationTypes = new Set(
		options.relationTypes ?? [
			"synonymy",
			"hypernymy",
			"hyponymy",
			"broader-term",
			"narrower-term",
			"related-term",
			"equivalent-concept",
		],
	);
	const remaining = new Set(uniqueSorted(memberIds));
	const chains: LexicalChain[] = [];
	while (remaining.size > 0) {
		const start = [...remaining].sort(compareStrings)[0] as string;
		const stack = [start];
		const members = new Set<string>();
		const usedTypes = new Set<string>();
		remaining.delete(start);
		while (stack.length > 0) {
			const current = stack.pop() as string;
			members.add(current);
			for (const relation of querySemanticRelations(kb, {
				sourceId: current,
				direction: "any",
			})) {
				if (!relationTypes.has(relation.type)) continue;
				const next =
					relation.sourceId === current ? relation.targetId : relation.sourceId;
				if (!remaining.has(next)) continue;
				remaining.delete(next);
				stack.push(next);
				usedTypes.add(relation.type);
			}
		}
		if (members.size > 1 || options.includeSingletons === true) {
			const sortedMembers = uniqueSorted(members);
			chains.push(
				Object.freeze({
					id: stableId("lexical-chain", {
						kbId: kb.id,
						members: sortedMembers,
					}),
					members: sortedMembers,
					relationTypes: uniqueSorted(usedTypes),
					score:
						Math.round(
							(members.size / Math.max(1, memberIds.length)) * 1_000_000,
						) / 1_000_000,
				}),
			);
		}
	}
	return chains.sort(
		(left, right) =>
			compareNumbers(right.members.length, left.members.length) ||
			compareStrings(left.id, right.id),
	);
}

export interface CohesionFeatures extends JsonObject {
	readonly chainCount: number;
	readonly memberCount: number;
	readonly maxChainLength: number;
	readonly meanChainLength: number;
	readonly cohesionScore: number;
}

export function cohesionFeatures(
	chains: readonly LexicalChain[],
): CohesionFeatures {
	const chainCount = chains.length;
	const memberCount = chains.reduce(
		(sum, chain) => sum + chain.members.length,
		0,
	);
	const maxChainLength = Math.max(
		0,
		...chains.map((chain) => chain.members.length),
	);
	const meanChainLength =
		chainCount === 0
			? 0
			: Math.round((memberCount / chainCount) * 1_000_000) / 1_000_000;
	const cohesionScore =
		memberCount === 0
			? 0
			: Math.round((maxChainLength / memberCount) * 1_000_000) / 1_000_000;
	return stableJsonClone({
		chainCount,
		memberCount,
		maxChainLength,
		meanChainLength,
		cohesionScore,
	});
}

export function thesaurusRelations(
	kb: KnowledgeBase,
	id: string,
	options: { readonly relationTypes?: readonly string[] } = {},
): SemanticRelation[] {
	return querySemanticRelations(kb, {
		sourceId: id,
		direction: "any",
		type: options.relationTypes ?? [
			"synonymy",
			"antonymy",
			"broader-term",
			"narrower-term",
			"related-term",
			"equivalent-concept",
		],
	});
}

export function explainCandidate(candidate: Candidate): JsonObject {
	return stableJsonClone({
		kind: candidate.kind,
		targetId: candidateTargetId(candidate),
		score: candidate.score,
		rank: candidate.rank,
		matchKind: candidate.matchKind,
		matchedAlias: candidate.matchedAlias,
		features: jsonValueClone(candidate.features, "candidate.features"),
	});
}

export function explainRelationPath(path: SemanticRelationPath): JsonObject {
	return stableJsonClone({
		startId: path.startId,
		endId: path.endId,
		relationIds: path.relationIds,
		relationTypes: path.relationTypes,
		depth: path.depth,
	});
}

export function scoreValue(score: number): Score {
	return {
		kind: "weight",
		value: finiteNumber(score, "score"),
		scale: "textkb.disambiguation",
	};
}
