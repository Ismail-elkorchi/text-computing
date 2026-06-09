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

const RESOURCE_IDS = {
	upos: "en-ud-gumreddit-upos",
	features: "en-ud-gumreddit-features",
	dependencies: "en-ud-gumreddit-dependencies",
	sentenceProfile: "en-ud-gumreddit-sentence-profile",
	annotations: "en-ud-gumreddit-annotations",
	quality: "en-ud-gumreddit-quality",
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

function compareUdRows(
	left: UdAnnotationRecord,
	right: UdAnnotationRecord,
): number {
	return (
		left.split.localeCompare(right.split) ||
		left.sentenceIndex - right.sentenceIndex ||
		left.tokenId.localeCompare(right.tokenId)
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
	resourceId: string = RESOURCE_IDS.annotations,
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
): UdSyntaxPackResources {
	const upos = nonEmptyRows(resourceText(pack, RESOURCE_IDS.upos)).map(
		([upos = "", xpos = "", count = "0"]) =>
			Object.freeze({ upos, xpos, count: numberCell(count) }),
	);
	const features = nonEmptyRows(resourceText(pack, RESOURCE_IDS.features)).map(
		([feature = "", value = "", count = "0"]) =>
			Object.freeze({ feature, value, count: numberCell(count) }),
	);
	const dependencies = nonEmptyRows(
		resourceText(pack, RESOURCE_IDS.dependencies),
	).map(([split = "", deprel = "", count = "0"]) =>
		Object.freeze({ split, deprel, count: numberCell(count) }),
	);
	const sentenceProfiles = nonEmptyRows(
		resourceText(pack, RESOURCE_IDS.sentenceProfile),
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
		annotations: udAnnotationRecordsFromPack(pack, RESOURCE_IDS.annotations),
		quality: Object.freeze(
			JSON.parse(resourceText(pack, RESOURCE_IDS.quality)) as Record<
				string,
				unknown
			>,
		),
	});
}

export function readUdAnnotationDatasetFromPack(
	pack: TextPackLike,
	options: DatasetReadOptions & { readonly resourceId?: string } = {},
) {
	const resourceId = options.resourceId ?? RESOURCE_IDS.annotations;
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
		.sort(([left], [right]) => left.localeCompare(right))
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
