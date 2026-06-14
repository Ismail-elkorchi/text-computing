import {
	isFileBackedResource,
	openResourceText,
	type TextPackResourceReader,
} from "@ismail-elkorchi/textpack";
import { buildAbbreviationTable } from "../abbreviation/build.js";
import { buildAffixTable } from "../affix/build.js";
import { buildGazetteer } from "../gazetteer/build.js";
import { buildLexicon } from "../lexicon/build.js";
import type {
	LexicalEntry,
	Lexicon,
	LexiconOptions,
} from "../lexicon/types.js";
import { buildPronunciationLexicon } from "../pronunciation/build.js";
import { buildTermbase } from "../term/build.js";
import { buildStoplist, buildWordlist } from "../wordlist/build.js";
import {
	parseAbbreviationResource,
	parseAffixTableResource,
	parseGazetteerResource,
	parseLexiconResource,
	parsePhraseListResource,
	parsePronunciationResource,
	parseStoplistResource,
	parseTermbaseResource,
	parseWordlistResource,
} from "./parse.js";
import type {
	PackResourceQueryLike,
	ResourceMaterializationOptions,
	ResourceParseOptions,
	TextPackLike,
	TextPackResourceLike,
} from "./types.js";

function kindMatches(
	resource: TextPackResourceLike,
	kind: PackResourceQueryLike["kind"],
): boolean {
	if (kind === undefined) return true;
	return Array.isArray(kind)
		? kind.includes(resource.kind)
		: resource.kind === kind;
}

function schemaMatches(
	resource: TextPackResourceLike,
	schemaId: PackResourceQueryLike["schemaId"],
): boolean {
	if (schemaId === undefined) return true;
	return Array.isArray(schemaId)
		? schemaId.includes(resource.schemaId ?? "")
		: resource.schemaId === schemaId;
}

function findResource(
	pack: TextPackLike,
	queryOrResourceId: string | PackResourceQueryLike,
): TextPackResourceLike {
	if (typeof queryOrResourceId === "string") {
		const found = pack.manifest.resources.find(
			(resource) => resource.id === queryOrResourceId,
		);
		if (found === undefined)
			throw new TypeError(`textpack resource is missing: ${queryOrResourceId}`);
		return found;
	}
	const found = pack.manifest.resources
		.filter(
			(resource) =>
				(queryOrResourceId.id === undefined ||
					resource.id === queryOrResourceId.id) &&
				kindMatches(resource, queryOrResourceId.kind) &&
				schemaMatches(resource, queryOrResourceId.schemaId),
		)
		.sort((left, right) => left.id.localeCompare(right.id))[0];
	if (found === undefined)
		throw new TypeError("no textpack resource matches query.");
	return found;
}

function resourceValue(
	pack: TextPackLike,
	descriptor: TextPackResourceLike,
): unknown {
	if (!Object.hasOwn(pack.resources, descriptor.id)) {
		throw new TypeError(`textpack resource value is missing: ${descriptor.id}`);
	}
	return pack.resources[descriptor.id];
}

async function materializedResourceValue(
	pack: TextPackLike,
	descriptor: TextPackResourceLike,
	reader: TextPackResourceReader | undefined,
): Promise<unknown> {
	const value = resourceValue(pack, descriptor);
	if (isFileBackedResource(value)) {
		return openResourceText(pack as never, descriptor.id, reader);
	}
	return value;
}

function parseTable(text: string): readonly Readonly<Record<string, string>>[] {
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
		rows.push(Object.freeze(row));
	}
	return Object.freeze(rows);
}

function canonicalLexiconRows(
	text: string,
	options: ResourceParseOptions,
): readonly LexicalEntry[] {
	return parseTable(text).flatMap((row) => {
		const id = row.entryId;
		const form =
			row.form !== undefined && row.form !== "-" ? row.form : row.lemma;
		if (
			id === undefined ||
			id.length === 0 ||
			form === undefined ||
			form.length === 0 ||
			form === "-"
		) {
			return [];
		}
		const features: Record<string, unknown> = {};
		for (const [key, value] of Object.entries(row)) {
			if (
				value.length > 0 &&
				![
					"entryId",
					"form",
					"lemma",
					"languageTag",
					"script",
					"partOfSpeech",
				].includes(key)
			) {
				features[key] = value;
			}
		}
		return {
			id,
			forms: [form],
			...(row.lemma !== undefined && row.lemma.length > 0 && row.lemma !== "-"
				? { canonical: row.lemma }
				: {}),
			...(row.partOfSpeech !== undefined && row.partOfSpeech.length > 0
				? {
						labels: [row.partOfSpeech],
						features: { ...features, partOfSpeech: row.partOfSpeech },
					}
				: Object.keys(features).length > 0
					? { features }
					: {}),
			...(row.languageTag !== undefined && row.languageTag.length > 0
				? { language: row.languageTag }
				: options.language !== undefined
					? { language: options.language }
					: {}),
			...(row.script !== undefined && row.script.length > 0
				? { script: row.script }
				: options.script !== undefined
					? { script: options.script }
					: {}),
			...(options.source !== undefined ? { source: options.source } : {}),
		};
	});
}

function canonicalLexiconResource(value: unknown):
	| {
			readonly entries?: readonly unknown[];
			readonly resourceRefs?: readonly { readonly resourceId?: unknown }[];
			readonly languageTag?: string;
			readonly script?: string;
	  }
	| undefined {
	if (typeof value === "string")
		return canonicalLexiconResource(JSON.parse(value));
	if (value === null || typeof value !== "object" || Array.isArray(value)) {
		return undefined;
	}
	const record = value as Readonly<Record<string, unknown>>;
	if (record.kind !== "lexicon" || record.schemaVersion !== "1")
		return undefined;
	return record as ReturnType<typeof canonicalLexiconResource>;
}

export function lexiconFromPack(
	pack: TextPackLike,
	queryOrResourceId: string | PackResourceQueryLike,
	options: LexiconOptions = {},
): Lexicon {
	const descriptor = findResource(pack, queryOrResourceId);
	const value = resourceValue(pack, descriptor);
	if (descriptor.kind === "gazetteer") {
		return buildGazetteer(
			parseGazetteerResource(value, { source: descriptor.id }),
			options,
		);
	}
	if (descriptor.kind === "termbase") {
		return buildTermbase(
			parseTermbaseResource(value, { source: descriptor.id }),
			options,
		);
	}
	if (descriptor.kind === "phrase-list") {
		return buildLexicon(
			parsePhraseListResource(value, { source: descriptor.id }),
			options,
		);
	}
	if (descriptor.kind === "stoplist") {
		const stoplist = buildStoplist(
			parseStoplistResource(value, { source: descriptor.id }),
		);
		const entries: LexicalEntry[] = stoplist.forms.map((form) => ({
			id: `stop:${form}`,
			forms: [form],
			source: descriptor.id,
		}));
		return buildLexicon(entries, options);
	}
	if (descriptor.kind === "abbreviation-table") {
		const table = buildAbbreviationTable(
			parseAbbreviationResource(value, { source: descriptor.id }),
		);
		const entries: LexicalEntry[] = table.entries.map((entry) => ({
			id: `abbr:${entry.form}`,
			forms: [entry.form],
			source: descriptor.id,
			...(entry.expansions[0] !== undefined
				? { canonical: entry.expansions[0] }
				: {}),
		}));
		return buildLexicon(entries, options);
	}
	if (descriptor.kind !== "lexicon") {
		throw new TypeError(
			`resource kind ${descriptor.kind} cannot be loaded as a lexicon.`,
		);
	}
	return buildLexicon(
		parseLexiconResource(value, { source: descriptor.id }),
		options,
	);
}

export async function lexiconFromPackAsync(
	pack: TextPackLike,
	queryOrResourceId: string | PackResourceQueryLike,
	options: LexiconOptions & ResourceMaterializationOptions = {},
): Promise<Lexicon> {
	const descriptor = findResource(pack, queryOrResourceId);
	const value = await materializedResourceValue(
		pack,
		descriptor,
		options.reader,
	);
	if (descriptor.schemaId === "textlex.lexicon.v1") {
		const canonical = canonicalLexiconResource(value);
		if (canonical === undefined) {
			throw new TypeError(
				`${descriptor.id} is not a canonical lexicon resource.`,
			);
		}
		const parseOptions: ResourceParseOptions = {
			source: descriptor.id,
			...((canonical.languageTag ?? options.language)
				? { language: canonical.languageTag ?? options.language }
				: {}),
			...((canonical.script ?? options.script)
				? { script: canonical.script ?? options.script }
				: {}),
		};
		const inlineEntries =
			canonical.entries === undefined
				? []
				: parseLexiconResource(canonical.entries, parseOptions);
		const referencedEntries: LexicalEntry[] = [];
		for (const ref of canonical.resourceRefs ?? []) {
			if (typeof ref.resourceId !== "string") continue;
			const referenced = findResource(pack, ref.resourceId);
			const referencedValue = await materializedResourceValue(
				pack,
				referenced,
				options.reader,
			);
			if (typeof referencedValue !== "string") {
				throw new TypeError(
					`${referenced.id} must be text-backed for canonical lexicon refs.`,
				);
			}
			referencedEntries.push(
				...canonicalLexiconRows(referencedValue, {
					...parseOptions,
					source: referenced.id,
				}),
			);
		}
		return buildLexicon([...inlineEntries, ...referencedEntries], options);
	}
	if (descriptor.kind === "gazetteer") {
		return buildGazetteer(
			parseGazetteerResource(value, { source: descriptor.id }),
			options,
		);
	}
	if (descriptor.kind === "termbase") {
		return buildTermbase(
			parseTermbaseResource(value, { source: descriptor.id }),
			options,
		);
	}
	if (descriptor.kind === "phrase-list") {
		return buildLexicon(
			parsePhraseListResource(value, { source: descriptor.id }),
			options,
		);
	}
	if (descriptor.kind === "stoplist") {
		const stoplist = buildStoplist(
			parseStoplistResource(value, { source: descriptor.id }),
		);
		const entries: LexicalEntry[] = stoplist.forms.map((form) => ({
			id: `stop:${form}`,
			forms: [form],
			source: descriptor.id,
		}));
		return buildLexicon(entries, options);
	}
	if (descriptor.kind === "abbreviation-table") {
		const table = buildAbbreviationTable(
			parseAbbreviationResource(value, { source: descriptor.id }),
		);
		const entries: LexicalEntry[] = table.entries.map((entry) => ({
			id: `abbr:${entry.form}`,
			forms: [entry.form],
			source: descriptor.id,
			...(entry.expansions[0] !== undefined
				? { canonical: entry.expansions[0] }
				: {}),
		}));
		return buildLexicon(entries, options);
	}
	if (descriptor.kind !== "lexicon") {
		throw new TypeError(
			`resource kind ${descriptor.kind} cannot be loaded as a lexicon.`,
		);
	}
	return buildLexicon(
		parseLexiconResource(value, { source: descriptor.id }),
		options,
	);
}

export function wordlistFromPack(
	pack: TextPackLike,
	queryOrResourceId: string | PackResourceQueryLike,
) {
	const descriptor = findResource(pack, queryOrResourceId);
	const value = resourceValue(pack, descriptor);
	if (descriptor.kind === "stoplist")
		return buildStoplist(
			parseStoplistResource(value, { source: descriptor.id }),
		);
	return buildWordlist(parseWordlistResource(value, { source: descriptor.id }));
}

export async function wordlistFromPackAsync(
	pack: TextPackLike,
	queryOrResourceId: string | PackResourceQueryLike,
	options: ResourceMaterializationOptions = {},
) {
	const descriptor = findResource(pack, queryOrResourceId);
	const value = await materializedResourceValue(
		pack,
		descriptor,
		options.reader,
	);
	if (descriptor.kind === "stoplist")
		return buildStoplist(
			parseStoplistResource(value, { source: descriptor.id }),
		);
	return buildWordlist(parseWordlistResource(value, { source: descriptor.id }));
}

export function affixTableFromPack(
	pack: TextPackLike,
	queryOrResourceId: string | PackResourceQueryLike,
) {
	const descriptor = findResource(pack, queryOrResourceId);
	return buildAffixTable(
		parseAffixTableResource(resourceValue(pack, descriptor), {
			source: descriptor.id,
		}),
	);
}

export async function affixTableFromPackAsync(
	pack: TextPackLike,
	queryOrResourceId: string | PackResourceQueryLike,
	options: ResourceMaterializationOptions = {},
) {
	const descriptor = findResource(pack, queryOrResourceId);
	return buildAffixTable(
		parseAffixTableResource(
			await materializedResourceValue(pack, descriptor, options.reader),
			{
				source: descriptor.id,
			},
		),
	);
}

export function pronunciationLexiconFromPack(
	pack: TextPackLike,
	queryOrResourceId: string | PackResourceQueryLike,
) {
	const descriptor = findResource(pack, queryOrResourceId);
	return buildPronunciationLexicon(
		parsePronunciationResource(resourceValue(pack, descriptor), {
			source: descriptor.id,
		}),
	);
}

export async function pronunciationLexiconFromPackAsync(
	pack: TextPackLike,
	queryOrResourceId: string | PackResourceQueryLike,
	options: ResourceMaterializationOptions = {},
) {
	const descriptor = findResource(pack, queryOrResourceId);
	return buildPronunciationLexicon(
		parsePronunciationResource(
			await materializedResourceValue(pack, descriptor, options.reader),
			{
				source: descriptor.id,
			},
		),
	);
}
