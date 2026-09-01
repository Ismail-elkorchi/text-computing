import {
	segmentGraphemes,
	segmentSentences,
	segmentWords,
} from "@ismail-elkorchi/textfacts/segment";
import {
	capabilityResourceIdsFromBindings,
	openResourceJson,
	openResourceTable,
	type TextPack,
	type TextPackMaterializedTable,
	type TextPackResource,
	type TextPackResourceReader,
	type TextPackTaskResourceBindingRole,
	taskResourceIdsFromBindings,
} from "@ismail-elkorchi/textpack";

export interface TextDataRowsFromPackOptions {
	readonly reader?: TextPackResourceReader;
	readonly resourceIds?: readonly string[];
	readonly schemaIds?: readonly string[];
	readonly slot?: string;
	readonly role?: TextPackTaskResourceBindingRole;
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
	readonly graphemes: (text: string) => readonly TextDataSegment[];
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
	const resourceIds = capabilityResourceIdsFromBindings(pack, {
		slot: options.slot ?? "corpus",
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

function profileStringSet(
	resources: TextDataSegmentationResources,
	key: string,
	languageTag: string,
): ReadonlySet<string> {
	const values = new Set<string>();
	for (const resource of resources.profiles) {
		const entries = resource.profile[key];
		if (!Array.isArray(entries)) continue;
		for (const entry of entries) {
			if (typeof entry === "string" && entry.length > 0) {
				values.add(entry.toLocaleLowerCase(languageTag));
			}
		}
	}
	return values;
}

function pinnedSegments(
	text: string,
	granularity: "word" | "sentence" | "grapheme",
): readonly TextDataSegment[] {
	const spans =
		granularity === "word"
			? segmentWords(text)
			: granularity === "sentence"
				? segmentSentences(text)
				: segmentGraphemes(text);
	return Object.freeze(
		[...spans].map((span) => {
			const value = text.slice(span.startCU, span.endCU);
			return Object.freeze({
				text: value,
				startCU: span.startCU,
				endCU: span.endCU,
				granularity,
				...(granularity === "word"
					? { isWordLike: /[\p{Letter}\p{Mark}\p{Number}]/u.test(value) }
					: {}),
				source: "textfacts.uax29.unicode-17",
			});
		}),
	);
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
	const wordSegments = pinnedSegments(text, "word")
		.filter((segment) => segment.text.trim().length > 0)
		.map((segment) =>
			Object.freeze({
				...segment,
				granularity: "lexical-unit" as const,
			}),
		);
	return languageTag === "fr"
		? splitFrenchElisions(
				wordSegments,
				profileStringSet(resources, "elisionPrefixes", languageTag),
			)
		: Object.freeze(wordSegments);
}

function tailoredSentenceSegments(
	text: string,
	languageTag: string,
	resources: TextDataSegmentationResources,
): readonly TextDataSegment[] {
	const base = pinnedSegments(text, "sentence").filter(
		(segment) => segment.text.trim().length > 0,
	);
	const exceptions = profileStringSet(
		resources,
		"sentenceBoundaryExceptions",
		languageTag,
	);
	if (exceptions.size === 0) return base;
	const merged: TextDataSegment[] = [];
	for (const segment of base) {
		const previous = merged.at(-1);
		const match = /([\p{Letter}][\p{Letter}.]*\.)[\p{White_Space}]*$/u.exec(
			previous?.text ?? "",
		);
		if (
			previous === undefined ||
			match?.[1] === undefined ||
			!exceptions.has(match[1].toLocaleLowerCase(languageTag))
		) {
			merged.push(segment);
			continue;
		}
		merged[merged.length - 1] = Object.freeze({
			text: text.slice(previous.startCU, segment.endCU),
			startCU: previous.startCU,
			endCU: segment.endCU,
			granularity: "sentence",
			source: "textdata.segmentation-profile",
		});
	}
	return Object.freeze(merged);
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
			return tailoredSentenceSegments(text, languageTag, resources);
		},
		graphemes(text: string) {
			return pinnedSegments(text, "grapheme");
		},
	});
}
