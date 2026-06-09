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

const RESOURCE_IDS = {
	lexicalEntries: "wordnet-en-lexical-entries",
	senses: "wordnet-en-senses",
	synsets: "wordnet-en-synsets",
	relations: "wordnet-en-relations",
	quality: "wordnet-en-quality",
} as const;

function resourceText(pack: TextPackLike, resourceId: string): string {
	const value = pack.resources[resourceId];
	if (typeof value !== "string") {
		throw new TypeError(`textpack resource ${resourceId} must be loaded text.`);
	}
	return value;
}

function rows(text: string): readonly string[][] {
	const [, ...body] = text
		.split(/\r?\n/u)
		.filter((line) => line.trim().length > 0)
		.map((line) => line.split("\t"));
	return body;
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
): WordNetPackResources {
	const lexicalEntries = rows(
		resourceText(pack, RESOURCE_IDS.lexicalEntries),
	).map(([entryId = "", lemma = "", partOfSpeech = ""]) =>
		Object.freeze({ entryId, lemma, partOfSpeech }),
	);
	const senses = rows(resourceText(pack, RESOURCE_IDS.senses)).map(
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
	const synsets = rows(resourceText(pack, RESOURCE_IDS.synsets)).map(
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
	const relations = rows(resourceText(pack, RESOURCE_IDS.relations)).map(
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
			JSON.parse(resourceText(pack, RESOURCE_IDS.quality)) as Record<
				string,
				unknown
			>,
		),
	});
}

export function openEnglishWordNetFromPack(pack: TextPackLike): KnowledgeBase {
	const resources = wordNetResourcesFromPack(pack);
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
