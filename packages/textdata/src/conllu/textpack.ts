import {
	isFileBackedResource,
	openResourceText,
	type TextPackResourceReader,
} from "@ismail-elkorchi/textpack";
import { createDataset, type DatasetReadOptions } from "../dataset/mod.js";

export interface TextPackResourceLike {
	readonly id: string;
	readonly kind: string;
	readonly schemaId?: string;
}

export interface TextPackLike {
	readonly manifest: {
		readonly resources: readonly TextPackResourceLike[];
	};
	readonly resources: Readonly<Record<string, unknown>>;
}

export interface UdAnnotationRecord {
	readonly split: string;
	readonly sentenceIndex: number;
	readonly tokenId: string;
	readonly upos: string;
	readonly xpos: string;
	readonly features: string;
	readonly head: string;
	readonly deprel: string;
	readonly deps: string;
	readonly misc: string;
}

export interface UdAnnotationToken {
	readonly tokenId: string;
	readonly upos: string;
	readonly xpos: string;
	readonly features: string;
	readonly head: string;
	readonly deprel: string;
	readonly deps: string;
	readonly misc: string;
}

export interface UdPosProfileRecord {
	readonly upos: string;
	readonly xpos: string;
	readonly count: number;
}

export interface UdFeatureProfileRecord {
	readonly feature: string;
	readonly value: string;
	readonly count: number;
}

export interface UdDependencyProfileRecord {
	readonly split: string;
	readonly deprel: string;
	readonly count: number;
}

export interface UdSentenceProfileRecord {
	readonly split: string;
	readonly sentenceCount: number;
	readonly tokenCount: number;
	readonly averageTokenCount: number;
	readonly maxTokenCount: number;
}

export interface UdSyntaxPackResources {
	readonly upos: readonly UdPosProfileRecord[];
	readonly features: readonly UdFeatureProfileRecord[];
	readonly dependencies: readonly UdDependencyProfileRecord[];
	readonly sentenceProfiles: readonly UdSentenceProfileRecord[];
	readonly annotations: readonly UdAnnotationRecord[];
	readonly quality: Readonly<Record<string, unknown>>;
}

export interface UdSyntaxResourceIds {
	readonly upos: string;
	readonly features: string;
	readonly dependencies: string;
	readonly sentenceProfile: string;
	readonly annotations: string;
	readonly quality: string;
}

export interface UdSyntaxPackOptions {
	readonly syntaxResourceId?: string;
	readonly resourceIds?: Partial<UdSyntaxResourceIds>;
	readonly reader?: TextPackResourceReader;
}

export interface UdAnnotationPackOptions {
	readonly resourceId?: string;
	readonly syntaxResourceId?: string;
	readonly reader?: TextPackResourceReader;
}

interface CanonicalSyntaxResourceRef {
	readonly resourceId: string;
	readonly role:
		| "tagset"
		| "feature-inventory"
		| "dependency-labels"
		| "sentence-profile"
		| "annotation-table"
		| "grammar"
		| "model";
}

interface CanonicalSyntaxResource {
	readonly schemaVersion: "1";
	readonly kind: "syntax";
	readonly resourceRefs?: readonly CanonicalSyntaxResourceRef[];
}

const SYNTAX_SCHEMA_ID = "textdata.syntax.v1";
const QUALITY_EVIDENCE_SCHEMA_ID = "textquality.evidence.v1";

function resourceText(pack: TextPackLike, resourceId: string): string {
	const value = pack.resources[resourceId];
	if (typeof value !== "string") {
		throw new TypeError(`textpack resource ${resourceId} must be loaded text.`);
	}
	return value;
}

function canonicalSyntaxResource(
	value: unknown,
	resourceId: string,
): CanonicalSyntaxResource {
	const parsed = typeof value === "string" ? JSON.parse(value) : value;
	if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
		throw new TypeError(`${resourceId} must be a canonical syntax object.`);
	}
	const record = parsed as Readonly<Record<string, unknown>>;
	if (record.schemaVersion !== "1" || record.kind !== "syntax") {
		throw new TypeError(`${resourceId} must use ${SYNTAX_SCHEMA_ID}.`);
	}
	return record as unknown as CanonicalSyntaxResource;
}

async function materializedResourceText(
	pack: TextPackLike,
	resourceId: string,
	reader: TextPackResourceReader | undefined,
): Promise<string> {
	const value = pack.resources[resourceId];
	if (typeof value === "string") return value;
	if (isFileBackedResource(value)) {
		return openResourceText(pack as never, resourceId, reader);
	}
	throw new TypeError(`textpack resource ${resourceId} must be loaded text.`);
}

async function materializedCanonicalSyntaxResource(
	pack: TextPackLike,
	resourceId: string,
	reader: TextPackResourceReader | undefined,
): Promise<CanonicalSyntaxResource> {
	return canonicalSyntaxResource(
		await materializedResourceText(pack, resourceId, reader),
		resourceId,
	);
}

function nonEmptyRows(text: string): readonly string[][] {
	const [, ...rows] = text
		.split(/\r?\n/u)
		.filter((line) => line.trim().length > 0)
		.map((line) => line.split("\t"));
	return rows;
}

function numberCell(value: string | undefined): number {
	return Number(value ?? "0");
}

function singleResourceBySchemaId(
	pack: TextPackLike,
	schemaId: string,
): TextPackResourceLike {
	const matches = pack.manifest.resources
		.filter((resource) => resource.schemaId === schemaId)
		.sort((left, right) => left.id.localeCompare(right.id));
	if (matches.length === 1) return matches[0] as TextPackResourceLike;
	if (matches.length === 0) {
		throw new TypeError(`No ${schemaId} textpack resource is present.`);
	}
	throw new TypeError(
		`Multiple ${schemaId} textpack resources are present: ${matches
			.map((resource) => resource.id)
			.join(", ")}.`,
	);
}

function syntaxResourceId(
	pack: TextPackLike,
	explicit: string | undefined,
): string {
	if (explicit !== undefined) return explicit;
	return singleResourceBySchemaId(pack, SYNTAX_SCHEMA_ID).id;
}

function refByRole(
	syntax: CanonicalSyntaxResource,
	role: CanonicalSyntaxResourceRef["role"],
): string {
	const matches = (syntax.resourceRefs ?? [])
		.filter((ref) => ref.role === role)
		.map((ref) => ref.resourceId)
		.sort((left, right) => left.localeCompare(right));
	if (matches.length === 1) return matches[0] ?? "";
	if (matches.length === 0) {
		throw new TypeError(`${SYNTAX_SCHEMA_ID} is missing ${role} resource ref.`);
	}
	throw new TypeError(
		`${SYNTAX_SCHEMA_ID} has ambiguous ${role} resource refs: ${matches.join(
			", ",
		)}.`,
	);
}

function qualityResourceId(
	pack: TextPackLike,
	explicit: string | undefined,
): string {
	if (explicit !== undefined) return explicit;
	return singleResourceBySchemaId(pack, QUALITY_EVIDENCE_SCHEMA_ID).id;
}

function resolveUdSyntaxResourceIds(
	pack: TextPackLike,
	options: Pick<UdSyntaxPackOptions, "resourceIds" | "syntaxResourceId"> = {},
): UdSyntaxResourceIds {
	const syntaxId = syntaxResourceId(pack, options.syntaxResourceId);
	const syntax = canonicalSyntaxResource(
		resourceText(pack, syntaxId),
		syntaxId,
	);
	const overrides = options.resourceIds ?? {};
	return Object.freeze({
		upos: overrides.upos ?? refByRole(syntax, "tagset"),
		features: overrides.features ?? refByRole(syntax, "feature-inventory"),
		dependencies:
			overrides.dependencies ?? refByRole(syntax, "dependency-labels"),
		sentenceProfile:
			overrides.sentenceProfile ?? refByRole(syntax, "sentence-profile"),
		annotations: overrides.annotations ?? refByRole(syntax, "annotation-table"),
		quality: qualityResourceId(pack, overrides.quality),
	});
}

async function resolveUdSyntaxResourceIdsAsync(
	pack: TextPackLike,
	options: UdSyntaxPackOptions = {},
): Promise<UdSyntaxResourceIds> {
	const syntaxId = syntaxResourceId(pack, options.syntaxResourceId);
	const syntax = await materializedCanonicalSyntaxResource(
		pack,
		syntaxId,
		options.reader,
	);
	const overrides = options.resourceIds ?? {};
	return Object.freeze({
		upos: overrides.upos ?? refByRole(syntax, "tagset"),
		features: overrides.features ?? refByRole(syntax, "feature-inventory"),
		dependencies:
			overrides.dependencies ?? refByRole(syntax, "dependency-labels"),
		sentenceProfile:
			overrides.sentenceProfile ?? refByRole(syntax, "sentence-profile"),
		annotations: overrides.annotations ?? refByRole(syntax, "annotation-table"),
		quality: qualityResourceId(pack, overrides.quality),
	});
}

function annotationResourceId(
	pack: TextPackLike,
	options: Pick<UdAnnotationPackOptions, "resourceId" | "syntaxResourceId">,
): string {
	if (options.resourceId !== undefined) return options.resourceId;
	return resolveUdSyntaxResourceIds(
		pack,
		options.syntaxResourceId === undefined
			? {}
			: { syntaxResourceId: options.syntaxResourceId },
	).annotations;
}

async function annotationResourceIdAsync(
	pack: TextPackLike,
	options: UdAnnotationPackOptions,
): Promise<string> {
	if (options.resourceId !== undefined) return options.resourceId;
	const syntaxOptions: UdSyntaxPackOptions = {
		...(options.syntaxResourceId === undefined
			? {}
			: { syntaxResourceId: options.syntaxResourceId }),
		...(options.reader === undefined ? {} : { reader: options.reader }),
	};
	return (await resolveUdSyntaxResourceIdsAsync(pack, syntaxOptions))
		.annotations;
}

function conlluTokenIdParts(tokenId: string): {
	readonly primary: number;
	readonly secondary: number;
	readonly rank: number;
} {
	const rangeMatch = /^(\d+)-(\d+)$/u.exec(tokenId);
	if (rangeMatch !== null) {
		return {
			primary: Number(rangeMatch[1]),
			secondary: Number(rangeMatch[2]),
			rank: -1,
		};
	}
	const emptyNodeMatch = /^(\d+)\.(\d+)$/u.exec(tokenId);
	if (emptyNodeMatch !== null) {
		return {
			primary: Number(emptyNodeMatch[1]),
			secondary: Number(emptyNodeMatch[2]),
			rank: 1,
		};
	}
	const integerMatch = /^(\d+)$/u.exec(tokenId);
	if (integerMatch !== null) {
		return {
			primary: Number(integerMatch[1]),
			secondary: 0,
			rank: 0,
		};
	}
	return { primary: Number.POSITIVE_INFINITY, secondary: 0, rank: 0 };
}

function compareConlluTokenIds(left: string, right: string): number {
	const leftParts = conlluTokenIdParts(left);
	const rightParts = conlluTokenIdParts(right);
	return (
		leftParts.primary - rightParts.primary ||
		leftParts.rank - rightParts.rank ||
		leftParts.secondary - rightParts.secondary ||
		left.localeCompare(right)
	);
}

function compareUdRows(
	left: UdAnnotationRecord,
	right: UdAnnotationRecord,
): number {
	return (
		left.split.localeCompare(right.split) ||
		left.sentenceIndex - right.sentenceIndex ||
		compareConlluTokenIds(left.tokenId, right.tokenId)
	);
}

function tokenFromRecord(record: UdAnnotationRecord): UdAnnotationToken {
	return Object.freeze({
		tokenId: record.tokenId,
		upos: record.upos,
		xpos: record.xpos,
		features: record.features,
		head: record.head,
		deprel: record.deprel,
		deps: record.deps,
		misc: record.misc,
	});
}

export function udAnnotationRecordsFromPack(
	pack: TextPackLike,
	options: Pick<
		UdAnnotationPackOptions,
		"resourceId" | "syntaxResourceId"
	> = {},
): readonly UdAnnotationRecord[] {
	const resourceId = annotationResourceId(pack, options);
	return Object.freeze(
		nonEmptyRows(resourceText(pack, resourceId))
			.map(
				([
					split = "",
					sentenceIndex = "0",
					tokenId = "",
					upos = "",
					xpos = "",
					features = "",
					head = "",
					deprel = "",
					deps = "",
					misc = "",
				]) =>
					Object.freeze({
						split,
						sentenceIndex: Number(sentenceIndex),
						tokenId,
						upos,
						xpos,
						features,
						head,
						deprel,
						deps,
						misc,
					}),
			)
			.sort(compareUdRows),
	);
}

function parseUdAnnotationRecords(text: string): readonly UdAnnotationRecord[] {
	return Object.freeze(
		nonEmptyRows(text)
			.map(
				([
					split = "",
					sentenceIndex = "0",
					tokenId = "",
					upos = "",
					xpos = "",
					features = "",
					head = "",
					deprel = "",
					deps = "",
					misc = "",
				]) =>
					Object.freeze({
						split,
						sentenceIndex: Number(sentenceIndex),
						tokenId,
						upos,
						xpos,
						features,
						head,
						deprel,
						deps,
						misc,
					}),
			)
			.sort(compareUdRows),
	);
}

export async function udAnnotationRecordsFromPackAsync(
	pack: TextPackLike,
	options: UdAnnotationPackOptions = {},
): Promise<readonly UdAnnotationRecord[]> {
	const resourceId = await annotationResourceIdAsync(pack, options);
	return parseUdAnnotationRecords(
		await materializedResourceText(pack, resourceId, options.reader),
	);
}

export function udSyntaxResourcesFromPack(
	pack: TextPackLike,
	options: UdSyntaxPackOptions = {},
): UdSyntaxPackResources {
	const ids = resolveUdSyntaxResourceIds(pack, options);
	const upos = nonEmptyRows(resourceText(pack, ids.upos)).map(
		([upos = "", xpos = "", count = "0"]) =>
			Object.freeze({ upos, xpos, count: numberCell(count) }),
	);
	const features = nonEmptyRows(resourceText(pack, ids.features)).map(
		([feature = "", value = "", count = "0"]) =>
			Object.freeze({ feature, value, count: numberCell(count) }),
	);
	const dependencies = nonEmptyRows(resourceText(pack, ids.dependencies)).map(
		([split = "", deprel = "", count = "0"]) =>
			Object.freeze({ split, deprel, count: numberCell(count) }),
	);
	const sentenceProfiles = nonEmptyRows(
		resourceText(pack, ids.sentenceProfile),
	).map(
		([
			split = "",
			sentenceCount = "0",
			tokenCount = "0",
			averageTokenCount = "0",
			maxTokenCount = "0",
		]) =>
			Object.freeze({
				split,
				sentenceCount: numberCell(sentenceCount),
				tokenCount: numberCell(tokenCount),
				averageTokenCount: numberCell(averageTokenCount),
				maxTokenCount: numberCell(maxTokenCount),
			}),
	);
	return Object.freeze({
		upos: Object.freeze(upos),
		features: Object.freeze(features),
		dependencies: Object.freeze(dependencies),
		sentenceProfiles: Object.freeze(sentenceProfiles),
		annotations: udAnnotationRecordsFromPack(pack, {
			resourceId: ids.annotations,
		}),
		quality: Object.freeze(
			JSON.parse(resourceText(pack, ids.quality)) as Record<string, unknown>,
		),
	});
}

export async function udSyntaxResourcesFromPackAsync(
	pack: TextPackLike,
	options: UdSyntaxPackOptions = {},
): Promise<UdSyntaxPackResources> {
	const ids = await resolveUdSyntaxResourceIdsAsync(pack, options);
	const [
		uposText,
		featuresText,
		dependenciesText,
		sentenceProfileText,
		annotations,
		qualityText,
	] = await Promise.all([
		materializedResourceText(pack, ids.upos, options.reader),
		materializedResourceText(pack, ids.features, options.reader),
		materializedResourceText(pack, ids.dependencies, options.reader),
		materializedResourceText(pack, ids.sentenceProfile, options.reader),
		udAnnotationRecordsFromPackAsync(pack, {
			resourceId: ids.annotations,
			...(options.reader === undefined ? {} : { reader: options.reader }),
		}),
		materializedResourceText(pack, ids.quality, options.reader),
	]);
	const upos = nonEmptyRows(uposText).map(
		([upos = "", xpos = "", count = "0"]) =>
			Object.freeze({ upos, xpos, count: numberCell(count) }),
	);
	const features = nonEmptyRows(featuresText).map(
		([feature = "", value = "", count = "0"]) =>
			Object.freeze({ feature, value, count: numberCell(count) }),
	);
	const dependencies = nonEmptyRows(dependenciesText).map(
		([split = "", deprel = "", count = "0"]) =>
			Object.freeze({ split, deprel, count: numberCell(count) }),
	);
	const sentenceProfiles = nonEmptyRows(sentenceProfileText).map(
		([
			split = "",
			sentenceCount = "0",
			tokenCount = "0",
			averageTokenCount = "0",
			maxTokenCount = "0",
		]) =>
			Object.freeze({
				split,
				sentenceCount: numberCell(sentenceCount),
				tokenCount: numberCell(tokenCount),
				averageTokenCount: numberCell(averageTokenCount),
				maxTokenCount: numberCell(maxTokenCount),
			}),
	);
	return Object.freeze({
		upos: Object.freeze(upos),
		features: Object.freeze(features),
		dependencies: Object.freeze(dependencies),
		sentenceProfiles: Object.freeze(sentenceProfiles),
		annotations,
		quality: Object.freeze(JSON.parse(qualityText) as Record<string, unknown>),
	});
}

export function readUdAnnotationDatasetFromPack(
	pack: TextPackLike,
	options: DatasetReadOptions &
		Pick<UdAnnotationPackOptions, "resourceId" | "syntaxResourceId"> = {},
) {
	const resourceId = annotationResourceId(pack, options);
	const grouped = new Map<string, UdAnnotationRecord[]>();
	for (const record of udAnnotationRecordsFromPack(pack, { resourceId })) {
		const key = `${record.split}\t${record.sentenceIndex}`;
		const existing = grouped.get(key);
		if (existing === undefined) {
			grouped.set(key, [record]);
			continue;
		}
		existing.push(record);
	}
	const records = [...grouped.entries()]
		.sort(([, leftRows], [, rightRows]) => {
			const left = leftRows[0];
			const right = rightRows[0];
			if (left === undefined || right === undefined) return 0;
			return (
				left.split.localeCompare(right.split) ||
				left.sentenceIndex - right.sentenceIndex
			);
		})
		.map(([key, rows]) => {
			const [split = "", sentenceIndex = "0"] = key.split("\t");
			return Object.freeze({
				id: `ud:${split}:${sentenceIndex}`,
				split,
				fields: {
					format: "ud-annotation-table",
					tokens: Object.freeze(rows.map(tokenFromRecord)),
				},
				metadata: {
					sourceResourceId: resourceId,
					annotationOnly: true,
					rawTextIncluded: false,
				},
			});
		});
	return createDataset(records, {
		id: options.id ?? "ud-annotation-table",
		metadata: {
			...options.metadata,
			format: "ud-annotation-table",
			resourceId,
			rawTextIncluded: false,
		},
	});
}

export async function readUdAnnotationDatasetFromPackAsync(
	pack: TextPackLike,
	options: DatasetReadOptions & {
		readonly resourceId?: string;
		readonly syntaxResourceId?: string;
		readonly reader?: TextPackResourceReader;
	} = {},
) {
	const resourceId = await annotationResourceIdAsync(pack, options);
	const grouped = new Map<string, UdAnnotationRecord[]>();
	for (const record of await udAnnotationRecordsFromPackAsync(pack, {
		resourceId,
		...(options.reader === undefined ? {} : { reader: options.reader }),
	})) {
		const key = `${record.split}\t${record.sentenceIndex}`;
		const existing = grouped.get(key);
		if (existing === undefined) {
			grouped.set(key, [record]);
			continue;
		}
		existing.push(record);
	}
	const records = [...grouped.entries()]
		.sort(([, leftRows], [, rightRows]) => {
			const left = leftRows[0];
			const right = rightRows[0];
			if (left === undefined || right === undefined) return 0;
			return (
				left.split.localeCompare(right.split) ||
				left.sentenceIndex - right.sentenceIndex
			);
		})
		.map(([key, rows]) => {
			const [split = "", sentenceIndex = "0"] = key.split("\t");
			return Object.freeze({
				id: `ud:${split}:${sentenceIndex}`,
				split,
				fields: {
					format: "ud-annotation-table",
					tokens: Object.freeze(rows.map(tokenFromRecord)),
				},
				metadata: {
					sourceResourceId: resourceId,
					annotationOnly: true,
					rawTextIncluded: false,
				},
			});
		});
	return createDataset(records, {
		id: options.id ?? "ud-annotation-table",
		metadata: {
			...options.metadata,
			format: "ud-annotation-table",
			resourceId,
			rawTextIncluded: false,
		},
	});
}
