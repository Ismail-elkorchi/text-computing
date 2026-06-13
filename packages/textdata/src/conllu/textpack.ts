import { createDataset, type DatasetReadOptions } from "../dataset/mod.js";

export interface TextPackResourceLike {
	readonly id: string;
	readonly kind: string;
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
	readonly resourceIds?: Partial<UdSyntaxResourceIds>;
}

const RESOURCE_SUFFIXES = {
	upos: "-upos",
	features: "-features",
	dependencies: "-dependencies",
	sentenceProfile: "-sentence-profile",
	annotations: "-annotations",
	quality: "-quality",
} as const;

function resourceText(pack: TextPackLike, resourceId: string): string {
	const value = pack.resources[resourceId];
	if (typeof value !== "string") {
		throw new TypeError(`textpack resource ${resourceId} must be loaded text.`);
	}
	return value;
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

function resourceIds(pack: TextPackLike): readonly string[] {
	return Object.freeze(
		[
			...new Set([
				...pack.manifest.resources.map((resource) => resource.id),
				...Object.keys(pack.resources),
			]),
		].sort((left, right) => left.localeCompare(right)),
	);
}

function requiredResourceId(
	pack: TextPackLike,
	suffix: string,
	explicit: string | undefined,
): string {
	if (explicit !== undefined) return explicit;
	const matches = resourceIds(pack).filter((id) => id.endsWith(suffix));
	if (matches.length === 1) return matches[0] ?? "";
	if (matches.length === 0)
		throw new TypeError(`textpack UD resource is missing: *${suffix}`);
	throw new TypeError(
		`textpack UD resource suffix *${suffix} is ambiguous: ${matches.join(", ")}`,
	);
}

function inferResourcePrefix(
	resourceIds: Partial<UdSyntaxResourceIds>,
): string | undefined {
	for (const [key, suffix] of Object.entries(RESOURCE_SUFFIXES) as readonly [
		keyof UdSyntaxResourceIds,
		string,
	][]) {
		const id = resourceIds[key];
		if (id?.endsWith(suffix)) {
			return id.slice(0, -suffix.length);
		}
	}
	return undefined;
}

function resolveUdSyntaxResourceIds(
	pack: TextPackLike,
	overrides: Partial<UdSyntaxResourceIds> = {},
): UdSyntaxResourceIds {
	const prefix = inferResourcePrefix(overrides);
	if (prefix !== undefined) {
		return Object.freeze({
			upos: overrides.upos ?? `${prefix}${RESOURCE_SUFFIXES.upos}`,
			features: overrides.features ?? `${prefix}${RESOURCE_SUFFIXES.features}`,
			dependencies:
				overrides.dependencies ?? `${prefix}${RESOURCE_SUFFIXES.dependencies}`,
			sentenceProfile:
				overrides.sentenceProfile ??
				`${prefix}${RESOURCE_SUFFIXES.sentenceProfile}`,
			annotations:
				overrides.annotations ?? `${prefix}${RESOURCE_SUFFIXES.annotations}`,
			quality: overrides.quality ?? `${prefix}${RESOURCE_SUFFIXES.quality}`,
		});
	}
	return Object.freeze({
		upos: requiredResourceId(pack, RESOURCE_SUFFIXES.upos, overrides.upos),
		features: requiredResourceId(
			pack,
			RESOURCE_SUFFIXES.features,
			overrides.features,
		),
		dependencies: requiredResourceId(
			pack,
			RESOURCE_SUFFIXES.dependencies,
			overrides.dependencies,
		),
		sentenceProfile: requiredResourceId(
			pack,
			RESOURCE_SUFFIXES.sentenceProfile,
			overrides.sentenceProfile,
		),
		annotations: requiredResourceId(
			pack,
			RESOURCE_SUFFIXES.annotations,
			overrides.annotations,
		),
		quality: requiredResourceId(
			pack,
			RESOURCE_SUFFIXES.quality,
			overrides.quality,
		),
	});
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
	resourceId: string = requiredResourceId(
		pack,
		RESOURCE_SUFFIXES.annotations,
		undefined,
	),
): readonly UdAnnotationRecord[] {
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

export function udSyntaxResourcesFromPack(
	pack: TextPackLike,
	options: UdSyntaxPackOptions = {},
): UdSyntaxPackResources {
	const ids = resolveUdSyntaxResourceIds(pack, options.resourceIds);
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
		annotations: udAnnotationRecordsFromPack(pack, ids.annotations),
		quality: Object.freeze(
			JSON.parse(resourceText(pack, ids.quality)) as Record<string, unknown>,
		),
	});
}

export function readUdAnnotationDatasetFromPack(
	pack: TextPackLike,
	options: DatasetReadOptions & { readonly resourceId?: string } = {},
) {
	const resourceId =
		options.resourceId ??
		requiredResourceId(pack, RESOURCE_SUFFIXES.annotations, undefined);
	const grouped = new Map<string, UdAnnotationRecord[]>();
	for (const record of udAnnotationRecordsFromPack(pack, resourceId)) {
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
