import {
	isFileBackedResource,
	openResourceText,
	requireSingleTaskResourceBinding,
	type TextPackResourceReader,
	taskResourceIdsFromBindings,
} from "@ismail-elkorchi/textpack";
import { buildAbbreviationTable } from "../abbreviation/build.js";
import { buildAffixTable } from "../affix/build.js";
import { buildGazetteer } from "../gazetteer/build.js";
import { buildLexicon } from "../lexicon/build.js";
import { lookup } from "../lexicon/lookup.js";
import type {
	LexicalEntry,
	LexicalMatch,
	Lexicon,
	LexiconOptions,
	LookupOptions,
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

function boundResources(
	pack: TextPackLike,
	options: ResourceMaterializationOptions & {
		readonly resourceIds?: readonly string[];
		readonly schemaIds?: string | readonly string[];
		readonly defaultSlot: string;
		readonly defaultRole?: ResourceMaterializationOptions["role"];
	},
): readonly TextPackResourceLike[] {
	const role = options.role ?? options.defaultRole;
	const resourceIds = taskResourceIdsFromBindings(pack, {
		slot: options.slot ?? options.defaultSlot,
		ownerPackage: "@ismail-elkorchi/textlex",
		...(options.schemaIds === undefined ? {} : { schemaId: options.schemaIds }),
		...(role === undefined ? {} : { role }),
		...(options.resourceIds === undefined
			? {}
			: { resourceIds: options.resourceIds }),
	});
	return Object.freeze(
		resourceIds.map((resourceId) => findResource(pack, resourceId)),
	);
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

function parseMatchingTableRows(
	text: string,
	matches: (row: Readonly<Record<string, string>>) => boolean,
	maxRows: number | undefined,
): readonly Readonly<Record<string, string>>[] {
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
		const frozen = Object.freeze(row);
		if (!matches(frozen)) continue;
		rows.push(frozen);
		if (maxRows !== undefined && rows.length >= maxRows) break;
	}
	return Object.freeze(rows);
}

function tableTextFromRows(
	rows: readonly Readonly<Record<string, string>>[],
): string {
	const columns = Object.keys(rows[0] ?? {});
	if (columns.length === 0) return "";
	return [
		columns.join("\t"),
		...rows.map((row) => columns.map((column) => row[column] ?? "").join("\t")),
	].join("\n");
}

function normalizedLookupKey(value: string): string {
	return value.normalize("NFC").toLocaleLowerCase();
}

function rowTextValues(
	row: Readonly<Record<string, string>>,
): readonly string[] {
	const values = [
		row.form,
		row.word,
		row.lemma,
		row.surface,
		row.lexicalForm,
		row.stem,
		row.root,
		row.diacritizedForm,
	];
	const splitForms =
		row.forms === undefined || row.forms.length === 0
			? []
			: row.forms.split(/[|, ]/u);
	return Object.freeze(
		[...values, ...splitForms].filter(
			(value): value is string => value !== undefined && value.length > 0,
		),
	);
}

function queryTextsByKey(
	texts: readonly string[],
): ReadonlyMap<string, string[]> {
	const output = new Map<string, string[]>();
	for (const text of texts) {
		const key = normalizedLookupKey(text);
		output.set(key, [...(output.get(key) ?? []), text]);
	}
	return output;
}

function matchingQueryTexts(
	row: Readonly<Record<string, string>>,
	textsByKey: ReadonlyMap<string, readonly string[]>,
): readonly string[] {
	const output = new Set<string>();
	for (const value of rowTextValues(row)) {
		for (const text of textsByKey.get(normalizedLookupKey(value)) ?? []) {
			output.add(text);
		}
	}
	return Object.freeze(
		[...output].sort((left, right) => left.localeCompare(right)),
	);
}

function stableRowId(
	row: Readonly<Record<string, string>>,
	source: string | undefined,
	index: number,
): string {
	return (
		row.entryId ??
		row.id ??
		row.word ??
		row.form ??
		row.lemma ??
		`${source ?? "row"}:${String(index + 1).padStart(8, "0")}`
	);
}

function canonicalLexiconRows(
	text: string,
	options: ResourceParseOptions,
): readonly LexicalEntry[] {
	return parseTable(text).flatMap((row, index) => {
		const id = stableRowId(row, options.source, index);
		const form =
			row.form !== undefined && row.form !== "-"
				? row.form
				: firstNonEmpty(row.word, row.surface, row.lemma);
		if (
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
					"id",
					"form",
					"word",
					"surface",
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

interface CanonicalResourceRef {
	readonly resourceId?: unknown;
	readonly role?: unknown;
}

interface CanonicalMorphologyResource {
	readonly schemaVersion: "1";
	readonly kind: "morphology";
	readonly morphologyId?: string;
	readonly languageTag?: string;
	readonly script?: string;
	readonly resourceRefs?: readonly CanonicalResourceRef[];
}

export interface MorphologyAnalysis {
	readonly form: string;
	readonly lemma?: string;
	readonly partOfSpeech?: string;
	readonly features: Readonly<Record<string, string>>;
	readonly entryId?: string;
	readonly sourceResourceId: string;
}

export interface MorphologyGeneration {
	readonly lemma: string;
	readonly form: string;
	readonly partOfSpeech?: string;
	readonly features: Readonly<Record<string, string>>;
	readonly entryId?: string;
	readonly sourceResourceId: string;
}

export interface MorphologyParadigm {
	readonly lemma: string;
	readonly entries: readonly MorphologyGeneration[];
}

export interface MorphologyIndex {
	readonly id: string;
	readonly language?: string;
	readonly script?: string;
	readonly analyses: readonly MorphologyAnalysis[];
	readonly generations: readonly MorphologyGeneration[];
	readonly analyze: (
		form: string,
		options?: { readonly maxResults?: number },
	) => readonly MorphologyAnalysis[];
	readonly generate: (
		lemma: string,
		features?: Readonly<Record<string, string>>,
		options?: { readonly maxResults?: number },
	) => readonly MorphologyGeneration[];
	readonly paradigms: (lemma?: string) => readonly MorphologyParadigm[];
}

export interface MorphologyIndexFromPackOptions
	extends ResourceMaterializationOptions {
	readonly resourceId?: string;
	readonly maxRows?: number;
}

export interface MorphologyAnalysesFromPackOptions
	extends ResourceMaterializationOptions {
	readonly resourceIds?: readonly string[];
	readonly maxRowsPerResource?: number;
}

export type MorphologyAnalysesManyFromPackResult = ReadonlyMap<
	string,
	readonly MorphologyAnalysis[]
>;

export interface MergedLexiconFromPackOptions
	extends LexiconOptions,
		ResourceMaterializationOptions {
	readonly resourceIds?: readonly string[];
	readonly schemaIds?: readonly string[];
}

export interface LookupFromPackOptions
	extends LookupOptions,
		ResourceMaterializationOptions {
	readonly resourceIds?: readonly string[];
	readonly schemaIds?: readonly string[];
	readonly maxRowsPerResource?: number;
}

export type LookupManyFromPackResult = ReadonlyMap<
	string,
	readonly LexicalMatch[]
>;

function canonicalMorphologyResource(
	value: unknown,
): CanonicalMorphologyResource | undefined {
	if (typeof value === "string")
		return canonicalMorphologyResource(JSON.parse(value));
	if (value === null || typeof value !== "object" || Array.isArray(value)) {
		return undefined;
	}
	const record = value as Readonly<Record<string, unknown>>;
	if (record.kind !== "morphology" || record.schemaVersion !== "1") {
		return undefined;
	}
	return record as unknown as CanonicalMorphologyResource;
}

function featureRecord(
	row: Readonly<Record<string, string>>,
): Record<string, string> {
	const features: Record<string, string> = {};
	for (const [key, value] of Object.entries(row)) {
		if (
			value.length === 0 ||
			[
				"form",
				"surface",
				"lemma",
				"lexicalForm",
				"stem",
				"root",
				"partOfSpeech",
				"entryId",
				"senseId",
			].includes(key)
		) {
			continue;
		}
		features[key] = value;
	}
	const bundle = row.featureBundle;
	if (bundle !== undefined && bundle.length > 0) {
		features.featureBundle = bundle;
		for (const item of bundle.split(/[; ]/u)) {
			if (item.length === 0 || item.includes(":")) continue;
			features[item] = "true";
		}
	}
	return features;
}

function firstNonEmpty(
	...values: readonly (string | undefined)[]
): string | undefined {
	return values.find((value) => value !== undefined && value.length > 0);
}

function morphologyAnalysisFromRow(
	row: Readonly<Record<string, string>>,
	sourceResourceId: string,
): MorphologyAnalysis | undefined {
	const form = firstNonEmpty(row.form, row.surface, row.diacritizedForm);
	if (form === undefined || form === "-") return undefined;
	const lemma = firstNonEmpty(row.lemma, row.lexicalForm, row.stem, row.root);
	return Object.freeze({
		form,
		...(lemma !== undefined && lemma !== "-" ? { lemma } : {}),
		...(row.partOfSpeech !== undefined && row.partOfSpeech.length > 0
			? { partOfSpeech: row.partOfSpeech }
			: {}),
		features: Object.freeze(featureRecord(row)),
		...(row.entryId !== undefined && row.entryId.length > 0
			? { entryId: row.entryId }
			: {}),
		sourceResourceId,
	});
}

function morphologyGenerationFromRow(
	row: Readonly<Record<string, string>>,
	sourceResourceId: string,
): MorphologyGeneration | undefined {
	const lemma = firstNonEmpty(row.lemma, row.lexicalForm, row.stem, row.root);
	const form = firstNonEmpty(row.form, row.surface, row.diacritizedForm);
	if (
		lemma === undefined ||
		form === undefined ||
		lemma === "-" ||
		form === "-"
	) {
		return undefined;
	}
	return Object.freeze({
		lemma,
		form,
		...(row.partOfSpeech !== undefined && row.partOfSpeech.length > 0
			? { partOfSpeech: row.partOfSpeech }
			: {}),
		features: Object.freeze(featureRecord(row)),
		...(row.entryId !== undefined && row.entryId.length > 0
			? { entryId: row.entryId }
			: {}),
		sourceResourceId,
	});
}

function featuresMatch(
	entry: Readonly<Record<string, string>>,
	query: Readonly<Record<string, string>> | undefined,
): boolean {
	if (query === undefined) return true;
	for (const [key, expected] of Object.entries(query)) {
		if (entry[key] === expected) continue;
		const bundle = entry.featureBundle;
		if (bundle?.split(/[; ]/u).includes(expected)) {
			continue;
		}
		return false;
	}
	return true;
}

function morphologyParadigms(
	generations: readonly MorphologyGeneration[],
	lemma: string | undefined,
): readonly MorphologyParadigm[] {
	const byLemma = new Map<string, MorphologyGeneration[]>();
	for (const generation of generations) {
		if (lemma !== undefined && generation.lemma !== lemma) continue;
		byLemma.set(generation.lemma, [
			...(byLemma.get(generation.lemma) ?? []),
			generation,
		]);
	}
	return Object.freeze(
		[...byLemma.entries()]
			.sort(([left], [right]) => left.localeCompare(right))
			.map(([entryLemma, entries]) =>
				Object.freeze({
					lemma: entryLemma,
					entries: Object.freeze(
						entries.sort(
							(left, right) =>
								left.form.localeCompare(right.form) ||
								(left.entryId ?? "").localeCompare(right.entryId ?? ""),
						),
					),
				}),
			),
	);
}

function isMorphologyRowRole(role: string): boolean {
	return (
		role.length === 0 ||
		role === "analyzer" ||
		role === "generator" ||
		role === "paradigm-table" ||
		role === "morpheme-inventory"
	);
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

export async function mergedLexiconFromPackAsync(
	pack: TextPackLike,
	options: MergedLexiconFromPackOptions = {},
): Promise<Lexicon> {
	const resources = boundResources(pack, {
		...options,
		defaultSlot: "lexicon",
		schemaIds: options.schemaIds ?? [
			"textlex.lexicon.v1",
			"textlex.abbreviation-table.v1",
			"textlex.stoplist.v1",
		],
	});
	const entries: LexicalEntry[] = [];
	for (const resource of resources) {
		const lexicon = await lexiconFromPackAsync(pack, resource.id, options);
		for (const entry of lexicon.entries) entries.push(entry);
	}
	return buildLexicon(entries, {
		...options,
		id: options.id ?? `${pack.manifest.resources.length}:merged-lexicon`,
		duplicateIdPolicy: "allow",
		duplicateFormPolicy: options.duplicateFormPolicy ?? "allow",
	});
}

export async function lookupManyFromPackAsync(
	pack: TextPackLike,
	texts: readonly string[],
	options: LookupFromPackOptions = {},
): Promise<LookupManyFromPackResult> {
	const uniqueTexts = Object.freeze(
		[...new Set(texts)].filter((text) => text.length > 0),
	);
	const textsByKey = queryTextsByKey(uniqueTexts);
	const resources = boundResources(pack, {
		...options,
		defaultSlot: "lexicon",
		schemaIds: options.schemaIds ?? [
			"textlex.lexicon.v1",
			"textlex.abbreviation-table.v1",
			"textlex.stoplist.v1",
		],
	});
	const entriesByText = new Map<string, LexicalEntry[]>();
	for (const text of uniqueTexts) entriesByText.set(text, []);
	for (const resource of resources) {
		const value = await materializedResourceValue(
			pack,
			resource,
			options.reader,
		);
		if (resource.schemaId !== "textlex.lexicon.v1") {
			const lexicon = await lexiconFromPackAsync(pack, resource.id, {
				...options,
				duplicateIdPolicy: "allow",
				duplicateFormPolicy: "allow",
			});
			for (const text of uniqueTexts) {
				for (const match of lookup(lexicon, text, options)) {
					entriesByText.get(text)?.push(match.entry);
				}
			}
			continue;
		}
		const canonical = canonicalLexiconResource(value);
		if (canonical === undefined) {
			throw new TypeError(
				`${resource.id} is not a canonical lexicon resource.`,
			);
		}
		const parseOptions: ResourceParseOptions = {
			source: resource.id,
			...((canonical.languageTag ?? options.language)
				? { language: canonical.languageTag ?? options.language }
				: {}),
			...((canonical.script ?? options.script)
				? { script: canonical.script ?? options.script }
				: {}),
		};
		if (canonical.entries !== undefined) {
			for (const entry of parseLexiconResource(
				canonical.entries,
				parseOptions,
			)) {
				const matching = new Set<string>();
				for (const form of entry.forms) {
					for (const text of matchingQueryTexts({ form }, textsByKey)) {
						matching.add(text);
					}
				}
				if (entry.canonical !== undefined) {
					for (const text of matchingQueryTexts(
						{ lemma: entry.canonical },
						textsByKey,
					)) {
						matching.add(text);
					}
				}
				for (const text of matching) entriesByText.get(text)?.push(entry);
			}
		}
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
			const matchingRows = parseMatchingTableRows(
				referencedValue,
				(row) => matchingQueryTexts(row, textsByKey).length > 0,
				options.maxRowsPerResource,
			);
			for (const row of matchingRows) {
				const rowEntries = canonicalLexiconRows(tableTextFromRows([row]), {
					...parseOptions,
					source: referenced.id,
				});
				for (const text of matchingQueryTexts(row, textsByKey)) {
					entriesByText.get(text)?.push(...rowEntries);
				}
			}
		}
	}
	const output = new Map<string, readonly LexicalMatch[]>();
	for (const text of uniqueTexts) {
		const entries = entriesByText.get(text) ?? [];
		if (entries.length === 0) {
			output.set(text, Object.freeze([]));
			continue;
		}
		const lexicon = buildLexicon(entries, {
			...options,
			id: `${pack.manifest.resources.length}:${text}:targeted-lookup`,
			duplicateIdPolicy: "allow",
			duplicateFormPolicy: "allow",
		});
		output.set(text, Object.freeze(lookup(lexicon, text, options)));
	}
	return output;
}

export async function lookupFromPackAsync(
	pack: TextPackLike,
	text: string,
	options: LookupFromPackOptions = {},
): Promise<readonly LexicalMatch[]> {
	return (await lookupManyFromPackAsync(pack, [text], options)).get(text) ?? [];
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
			for (const entry of canonicalLexiconRows(referencedValue, {
				...parseOptions,
				source: referenced.id,
			})) {
				referencedEntries.push(entry);
			}
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

export async function morphologyIndexFromPackAsync(
	pack: TextPackLike,
	options: MorphologyIndexFromPackOptions = {},
): Promise<MorphologyIndex> {
	const descriptor =
		options.resourceId === undefined
			? findResource(
					pack,
					requireSingleTaskResourceBinding(pack, {
						slot: options.slot ?? "morphology",
						ownerPackage: "@ismail-elkorchi/textlex",
						schemaId: "textlex.morphology.v1",
						role: options.role ?? "primary",
					}).resourceId,
				)
			: findResource(
					pack,
					requireSingleTaskResourceBinding(pack, {
						slot: options.slot ?? "morphology",
						ownerPackage: "@ismail-elkorchi/textlex",
						schemaId: "textlex.morphology.v1",
						role: options.role ?? "primary",
						resourceId: options.resourceId,
					}).resourceId,
				);
	const value = await materializedResourceValue(
		pack,
		descriptor,
		options.reader,
	);
	const canonical = canonicalMorphologyResource(value);
	if (canonical === undefined) {
		throw new TypeError(
			`${descriptor.id} is not a canonical morphology resource.`,
		);
	}
	const analyses: MorphologyAnalysis[] = [];
	const generations: MorphologyGeneration[] = [];
	for (const ref of canonical.resourceRefs ?? []) {
		if (typeof ref.resourceId !== "string") continue;
		const referenced = findResource(pack, ref.resourceId);
		const referencedValue = await materializedResourceValue(
			pack,
			referenced,
			options.reader,
		);
		if (typeof referencedValue !== "string") continue;
		const rows = parseTable(referencedValue).slice(0, options.maxRows);
		const role = typeof ref.role === "string" ? ref.role : "";
		if (
			role === "generator" ||
			role === "paradigm-table" ||
			role === "morpheme-inventory"
		) {
			for (const row of rows) {
				const generation = morphologyGenerationFromRow(row, referenced.id);
				if (generation !== undefined) generations.push(generation);
				const analysis = morphologyAnalysisFromRow(row, referenced.id);
				if (analysis !== undefined) analyses.push(analysis);
			}
			continue;
		}
		if (role === "analyzer" || role.length === 0) {
			for (const row of rows) {
				const analysis = morphologyAnalysisFromRow(row, referenced.id);
				if (analysis !== undefined) analyses.push(analysis);
			}
		}
	}
	const analysesByForm = new Map<string, MorphologyAnalysis[]>();
	for (const analysis of analyses) {
		analysesByForm.set(analysis.form, [
			...(analysesByForm.get(analysis.form) ?? []),
			analysis,
		]);
	}
	const generationsByLemma = new Map<string, MorphologyGeneration[]>();
	for (const generation of generations) {
		generationsByLemma.set(generation.lemma, [
			...(generationsByLemma.get(generation.lemma) ?? []),
			generation,
		]);
	}
	return Object.freeze({
		id: canonical.morphologyId ?? descriptor.id,
		...(canonical.languageTag !== undefined
			? { language: canonical.languageTag }
			: {}),
		...(canonical.script !== undefined ? { script: canonical.script } : {}),
		analyses: Object.freeze(analyses),
		generations: Object.freeze(generations),
		analyze(
			form: string,
			analyzeOptions: { readonly maxResults?: number } = {},
		) {
			return Object.freeze(
				[...(analysesByForm.get(form) ?? [])].slice(
					0,
					analyzeOptions.maxResults,
				),
			);
		},
		generate(
			lemma: string,
			features?: Readonly<Record<string, string>>,
			generateOptions: { readonly maxResults?: number } = {},
		) {
			return Object.freeze(
				[...(generationsByLemma.get(lemma) ?? [])]
					.filter((entry) => featuresMatch(entry.features, features))
					.slice(0, generateOptions.maxResults),
			);
		},
		paradigms(lemma?: string) {
			return morphologyParadigms(generations, lemma);
		},
	});
}

export async function morphologyAnalysesManyFromPackAsync(
	pack: TextPackLike,
	forms: readonly string[],
	options: MorphologyAnalysesFromPackOptions = {},
): Promise<MorphologyAnalysesManyFromPackResult> {
	const uniqueForms = Object.freeze(
		[...new Set(forms)].filter((form) => form.length > 0),
	);
	const formsByKey = queryTextsByKey(uniqueForms);
	const resources = boundResources(pack, {
		...options,
		defaultSlot: "morphology",
		defaultRole: "primary",
		schemaIds: "textlex.morphology.v1",
	});
	const analysesByForm = new Map<string, MorphologyAnalysis[]>();
	for (const form of uniqueForms) analysesByForm.set(form, []);
	for (const descriptor of resources) {
		const value = await materializedResourceValue(
			pack,
			descriptor,
			options.reader,
		);
		const canonical = canonicalMorphologyResource(value);
		if (canonical === undefined) {
			throw new TypeError(
				`${descriptor.id} is not a canonical morphology resource.`,
			);
		}
		for (const ref of canonical.resourceRefs ?? []) {
			if (typeof ref.resourceId !== "string") continue;
			const role = typeof ref.role === "string" ? ref.role : "";
			if (!isMorphologyRowRole(role)) continue;
			const referenced = findResource(pack, ref.resourceId);
			const referencedValue = await materializedResourceValue(
				pack,
				referenced,
				options.reader,
			);
			if (typeof referencedValue !== "string") continue;
			const matchingRows = parseMatchingTableRows(
				referencedValue,
				(row) => matchingQueryTexts(row, formsByKey).length > 0,
				options.maxRowsPerResource,
			);
			for (const row of matchingRows) {
				const analysis = morphologyAnalysisFromRow(row, referenced.id);
				if (analysis === undefined) continue;
				for (const form of matchingQueryTexts(row, formsByKey)) {
					analysesByForm.get(form)?.push(analysis);
				}
			}
		}
	}
	return new Map(
		[...analysesByForm.entries()].map(([form, analyses]) => [
			form,
			Object.freeze(analyses),
		]),
	);
}

export async function morphologyAnalysesFromPackAsync(
	pack: TextPackLike,
	form: string,
	options: MorphologyAnalysesFromPackOptions = {},
): Promise<readonly MorphologyAnalysis[]> {
	return (
		(await morphologyAnalysesManyFromPackAsync(pack, [form], options)).get(
			form,
		) ?? []
	);
}
