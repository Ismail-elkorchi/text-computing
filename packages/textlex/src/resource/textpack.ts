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
				kindMatches(resource, queryOrResourceId.kind),
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
