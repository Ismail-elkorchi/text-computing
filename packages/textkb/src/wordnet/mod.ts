import {
	isFileBackedResource,
	openResourceText,
	type TextPackResourceReader,
} from "@ismail-elkorchi/textpack";
import {
	type AliasEntryInput,
	type ConceptRecord,
	createKnowledgeBase,
	type JsonObject,
	type KnowledgeBase,
	type SemanticRelation,
	type SenseRecord,
} from "../internal/core.js";

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

export interface WordNetLexicalEntryRecord {
	readonly entryId: string;
	readonly lemma: string;
	readonly partOfSpeech: string;
}

export interface WordNetSenseRecord {
	readonly senseId: string;
	readonly entryId: string;
	readonly lemma: string;
	readonly partOfSpeech: string;
	readonly synsetId: string;
	readonly subcat?: string;
}

export interface WordNetSynsetRecord {
	readonly synsetId: string;
	readonly ili?: string;
	readonly partOfSpeech: string;
	readonly lexfile?: string;
	readonly members: readonly string[];
	readonly definition?: string;
	readonly exampleCount: number;
}

export interface WordNetRelationRecord {
	readonly scope: "sense" | "synset";
	readonly sourceId: string;
	readonly relType: string;
	readonly targetId: string;
}

export interface WordNetPackResources {
	readonly lexicalEntries: readonly WordNetLexicalEntryRecord[];
	readonly senses: readonly WordNetSenseRecord[];
	readonly synsets: readonly WordNetSynsetRecord[];
	readonly relations: readonly WordNetRelationRecord[];
	readonly quality: Readonly<Record<string, unknown>>;
}

export interface WordNetResourceIds {
	readonly lexicalEntries: string;
	readonly senses: string;
	readonly synsets: string;
	readonly relations: string;
	readonly quality: string;
}

export interface WordNetPackOptions {
	readonly resourceIds?: Partial<WordNetResourceIds>;
	readonly reader?: TextPackResourceReader;
}

const RESOURCE_SUFFIXES = {
	lexicalEntries: "-lexical-entries",
	senses: "-senses",
	synsets: "-synsets",
	relations: "-relations",
	quality: "-quality",
} as const;

function resourceText(pack: TextPackLike, resourceId: string): string {
	const value = pack.resources[resourceId];
	if (typeof value !== "string") {
		throw new TypeError(`textpack resource ${resourceId} must be loaded text.`);
	}
	return value;
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

function rows(text: string): readonly string[][] {
	const [, ...body] = text
		.split(/\r?\n/u)
		.filter((line) => line.trim().length > 0)
		.map((line) => line.split("\t"));
	return body;
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
		throw new TypeError(`textpack WordNet resource is missing: *${suffix}`);
	throw new TypeError(
		`textpack WordNet resource suffix *${suffix} is ambiguous: ${matches.join(", ")}`,
	);
}

function inferResourcePrefix(
	resourceIds: Partial<WordNetResourceIds>,
): string | undefined {
	for (const [key, suffix] of Object.entries(RESOURCE_SUFFIXES) as readonly [
		keyof WordNetResourceIds,
		string,
	][]) {
		const id = resourceIds[key];
		if (id?.endsWith(suffix)) {
			return id.slice(0, -suffix.length);
		}
	}
	return undefined;
}

function resolveWordNetResourceIds(
	pack: TextPackLike,
	overrides: Partial<WordNetResourceIds> = {},
): WordNetResourceIds {
	const prefix = inferResourcePrefix(overrides);
	if (prefix !== undefined) {
		return Object.freeze({
			lexicalEntries:
				overrides.lexicalEntries ??
				`${prefix}${RESOURCE_SUFFIXES.lexicalEntries}`,
			senses: overrides.senses ?? `${prefix}${RESOURCE_SUFFIXES.senses}`,
			synsets: overrides.synsets ?? `${prefix}${RESOURCE_SUFFIXES.synsets}`,
			relations:
				overrides.relations ?? `${prefix}${RESOURCE_SUFFIXES.relations}`,
			quality: overrides.quality ?? `${prefix}${RESOURCE_SUFFIXES.quality}`,
		});
	}
	return Object.freeze({
		lexicalEntries: requiredResourceId(
			pack,
			RESOURCE_SUFFIXES.lexicalEntries,
			overrides.lexicalEntries,
		),
		senses: requiredResourceId(
			pack,
			RESOURCE_SUFFIXES.senses,
			overrides.senses,
		),
		synsets: requiredResourceId(
			pack,
			RESOURCE_SUFFIXES.synsets,
			overrides.synsets,
		),
		relations: requiredResourceId(
			pack,
			RESOURCE_SUFFIXES.relations,
			overrides.relations,
		),
		quality: requiredResourceId(
			pack,
			RESOURCE_SUFFIXES.quality,
			overrides.quality,
		),
	});
}

function optional(value: string | undefined): string | undefined {
	if (value === undefined || value.length === 0) return undefined;
	return value;
}

function metadata(record: Readonly<Record<string, unknown>>): JsonObject {
	return Object.fromEntries(
		Object.entries(record).filter(([, value]) => value !== undefined),
	) as JsonObject;
}

export function wordNetResourcesFromPack(
	pack: TextPackLike,
	options: WordNetPackOptions = {},
): WordNetPackResources {
	const ids = resolveWordNetResourceIds(pack, options.resourceIds);
	return wordNetResourcesFromTexts({
		lexicalEntries: resourceText(pack, ids.lexicalEntries),
		senses: resourceText(pack, ids.senses),
		synsets: resourceText(pack, ids.synsets),
		relations: resourceText(pack, ids.relations),
		quality: resourceText(pack, ids.quality),
	});
}

function wordNetResourcesFromTexts(texts: {
	readonly lexicalEntries: string;
	readonly senses: string;
	readonly synsets: string;
	readonly relations: string;
	readonly quality: string;
}): WordNetPackResources {
	const lexicalEntries = rows(texts.lexicalEntries).map(
		([entryId = "", lemma = "", partOfSpeech = ""]) =>
			Object.freeze({ entryId, lemma, partOfSpeech }),
	);
	const senses = rows(texts.senses).map(
		([
			senseId = "",
			entryId = "",
			lemma = "",
			partOfSpeech = "",
			synsetId = "",
			subcat = "",
		]) =>
			Object.freeze({
				senseId,
				entryId,
				lemma,
				partOfSpeech,
				synsetId,
				...(optional(subcat) === undefined ? {} : { subcat }),
			}),
	);
	const synsets = rows(texts.synsets).map(
		([
			synsetId = "",
			ili = "",
			partOfSpeech = "",
			lexfile = "",
			members = "",
			definition = "",
			exampleCount = "0",
		]) =>
			Object.freeze({
				synsetId,
				...(optional(ili) === undefined ? {} : { ili }),
				partOfSpeech,
				...(optional(lexfile) === undefined ? {} : { lexfile }),
				members: Object.freeze(
					members.split(/\s+/u).filter((member) => member.length > 0),
				),
				...(optional(definition) === undefined ? {} : { definition }),
				exampleCount: Number(exampleCount),
			}),
	);
	const relations = rows(texts.relations).map(
		([scope = "synset", sourceId = "", relType = "", targetId = ""]) =>
			Object.freeze({
				scope: scope as WordNetRelationRecord["scope"],
				sourceId,
				relType,
				targetId,
			}),
	);
	return Object.freeze({
		lexicalEntries: Object.freeze(lexicalEntries),
		senses: Object.freeze(senses),
		synsets: Object.freeze(synsets),
		relations: Object.freeze(relations),
		quality: Object.freeze(
			JSON.parse(texts.quality) as Record<string, unknown>,
		),
	});
}

export async function wordNetResourcesFromPackAsync(
	pack: TextPackLike,
	options: WordNetPackOptions = {},
): Promise<WordNetPackResources> {
	const ids = resolveWordNetResourceIds(pack, options.resourceIds);
	const [lexicalEntries, senses, synsets, relations, quality] =
		await Promise.all([
			materializedResourceText(pack, ids.lexicalEntries, options.reader),
			materializedResourceText(pack, ids.senses, options.reader),
			materializedResourceText(pack, ids.synsets, options.reader),
			materializedResourceText(pack, ids.relations, options.reader),
			materializedResourceText(pack, ids.quality, options.reader),
		]);
	return wordNetResourcesFromTexts({
		lexicalEntries,
		senses,
		synsets,
		relations,
		quality,
	});
}

function openEnglishWordNet(resources: WordNetPackResources): KnowledgeBase {
	const entryById = new Map(
		resources.lexicalEntries.map((entry) => [entry.entryId, entry]),
	);
	const concepts: ConceptRecord[] = resources.synsets.map((synset) => {
		const labels = synset.members
			.map((member) => entryById.get(member)?.lemma)
			.filter(
				(lemma): lemma is string => lemma !== undefined && lemma.length > 0,
			);
		return {
			id: synset.synsetId,
			labels: { en: labels.length > 0 ? labels : [synset.synsetId] },
			...(synset.definition === undefined
				? {}
				: { definitions: { en: synset.definition } }),
			...(synset.lexfile === undefined ? {} : { domains: [synset.lexfile] }),
			metadata: metadata({
				ili: synset.ili,
				partOfSpeech: synset.partOfSpeech,
				exampleCount: synset.exampleCount,
				members: synset.members,
			}),
		};
	});
	const senses: SenseRecord[] = resources.senses.map((sense) => ({
		id: sense.senseId,
		lemma: sense.lemma,
		pos: sense.partOfSpeech,
		language: "en",
		metadata: metadata({
			entryId: sense.entryId,
			synsetId: sense.synsetId,
			subcat: sense.subcat,
		}),
	}));
	const aliases: AliasEntryInput[] = senses.map((sense) => ({
		alias: sense.lemma,
		targetKind: "sense",
		targetId: sense.id,
		matchKind: "lemma",
		language: "en",
		source: "open-english-wordnet",
	}));
	const relations: SemanticRelation[] = resources.relations.map((relation) => ({
		sourceId: relation.sourceId,
		targetId: relation.targetId,
		type: relation.relType,
		sourceKind: relation.scope === "sense" ? "sense" : "concept",
		targetKind: relation.scope === "sense" ? "sense" : "concept",
		metadata: { scope: relation.scope },
	}));
	return createKnowledgeBase({
		id: "open-english-wordnet",
		concepts,
		senses,
		relations,
		aliases,
		metadata: {
			source: "source:wordnet:open-english-2025",
			quality: resources.quality as JsonObject,
		},
		allowExternalRelationEndpoints: true,
	});
}

export function openEnglishWordNetFromPack(pack: TextPackLike): KnowledgeBase {
	return openEnglishWordNet(wordNetResourcesFromPack(pack));
}

export async function openEnglishWordNetFromPackAsync(
	pack: TextPackLike,
	options: WordNetPackOptions = {},
): Promise<KnowledgeBase> {
	return openEnglishWordNet(await wordNetResourcesFromPackAsync(pack, options));
}
