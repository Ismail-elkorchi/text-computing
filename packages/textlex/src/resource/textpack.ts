import { nfkcCaseFold } from "@ismail-elkorchi/textfacts/casefold";
import {
	isFileBackedResource,
	openResourceLookupIndex,
	openResourceText,
	requireSingleTaskResourceBinding,
	type TextPackLookupIndex,
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

function compareStrings(left: string, right: string): number {
	return left < right ? -1 : left > right ? 1 : 0;
}

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
		.sort((left, right) => compareStrings(left.id, right.id))[0];
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

type TableIndexKind = "generation" | "lexicon" | "morphology";

interface CamelCompatibilityIndex {
	readonly camelCompatibilityPairs: ReadonlySet<string>;
}

interface PackCompatibilityIndexes {
	readonly defaultReader: Map<string, CamelCompatibilityIndex>;
	readonly readers: WeakMap<
		TextPackResourceReader,
		Map<string, CamelCompatibilityIndex>
	>;
}

const compatibilityIndexes = new WeakMap<object, PackCompatibilityIndexes>();

function compatibilityIndexesForReader(
	pack: TextPackLike,
	reader: TextPackResourceReader | undefined,
): Map<string, CamelCompatibilityIndex> {
	let packIndexes = compatibilityIndexes.get(pack);
	if (packIndexes === undefined) {
		packIndexes = { defaultReader: new Map(), readers: new WeakMap() };
		compatibilityIndexes.set(pack, packIndexes);
	}
	let resourceIndexes: Map<string, CamelCompatibilityIndex>;
	if (reader === undefined) {
		resourceIndexes = packIndexes.defaultReader;
	} else {
		resourceIndexes = packIndexes.readers.get(reader) ?? new Map();
		if (!packIndexes.readers.has(reader)) {
			packIndexes.readers.set(reader, resourceIndexes);
		}
	}
	return resourceIndexes;
}

function prioritizedIndexColumns(
	index: TextPackLookupIndex,
	kind: TableIndexKind,
): readonly string[] {
	const tiers =
		kind === "lexicon"
			? [
					["form", "forms", "surface", "word"],
					["lemma", "lexicalForm"],
				]
			: kind === "morphology"
				? [
						["form", "surface", "diacritizedForm"],
						["stem", "lexicalForm"],
					]
				: [
						["lemma", "lexicalForm"],
						["stem", "root"],
					];
	for (const tier of tiers) {
		const available = tier.filter((column) =>
			index.keyColumns.includes(column),
		);
		if (available.length > 0) return Object.freeze(available);
	}
	return Object.freeze([]);
}

function isLexiconRowRole(role: unknown): boolean {
	return (
		role === undefined ||
		role === "entries" ||
		role === "forms" ||
		role === "lemmas"
	);
}

function buildCamelCompatibilityIndex(text: string): CamelCompatibilityIndex {
	const rows = parseTable(text);
	const camelCompatibilityPairs = new Set<string>();
	for (const row of rows) {
		const table = row.table;
		const leftCategory = row.leftCategory ?? "";
		const rightCategory = row.rightCategory ?? "";
		if (
			(table === "AB" || table === "BC" || table === "AC") &&
			leftCategory.length > 0 &&
			rightCategory.length > 0
		) {
			camelCompatibilityPairs.add(
				camelCompatibilityKey(table, leftCategory, rightCategory),
			);
		}
	}
	return Object.freeze({ camelCompatibilityPairs });
}

function camelCompatibilityIndex(
	pack: TextPackLike,
	reader: TextPackResourceReader | undefined,
	resourceId: string,
	text: string,
): CamelCompatibilityIndex {
	const indexes = compatibilityIndexesForReader(pack, reader);
	const cached = indexes.get(resourceId);
	if (cached !== undefined) return cached;
	const index = buildCamelCompatibilityIndex(text);
	indexes.set(resourceId, index);
	return index;
}

type CamelMorphemeSection = "PREFIXES" | "STEMS" | "SUFFIXES";
type CamelCompatibilityTable = "AB" | "BC" | "AC";

function camelMorphemeKey(
	section: CamelMorphemeSection,
	surface: string,
): string {
	return `${section}\u0000${normalizedLookupKey(surface)}`;
}

function camelSectionSurfaceLookupKey(
	section: CamelMorphemeSection,
	surface: string,
): string {
	return normalizedLookupKey(`${section}:${surface}`);
}

function camelCompatibilityKey(
	table: CamelCompatibilityTable,
	leftCategory: string,
	rightCategory: string,
): string {
	return `${table}\u0000${leftCategory}\u0000${rightCategory}`;
}

function camelCategoriesAreCompatible(
	index: CamelCompatibilityIndex,
	prefixCategory: string,
	stemCategory: string,
	suffixCategory: string,
): boolean {
	return (
		index.camelCompatibilityPairs.has(
			camelCompatibilityKey("AB", prefixCategory, stemCategory),
		) &&
		index.camelCompatibilityPairs.has(
			camelCompatibilityKey("BC", stemCategory, suffixCategory),
		) &&
		index.camelCompatibilityPairs.has(
			camelCompatibilityKey("AC", prefixCategory, suffixCategory),
		)
	);
}

async function generatedIndexRows(
	index: TextPackLookupIndex,
	textsByKey: ReadonlyMap<string, readonly string[]>,
	maxRows: number | undefined,
	kind: TableIndexKind,
	lookupOptions?: LookupOptions,
): Promise<readonly Readonly<Record<string, string>>[]> {
	const rowsByOrder = new Map<number, Readonly<Record<string, string>>>();
	const keyColumns = prioritizedIndexColumns(index, kind);
	if (keyColumns.length === 0) {
		throw new TypeError(
			`Lookup index ${index.indexResourceId} has no ${kind} query columns.`,
		);
	}
	const addRows = (
		rows: readonly {
			readonly rowOrder: number;
			readonly values: Readonly<Record<string, string>>;
		}[],
	) => {
		for (const row of rows) {
			if (!rowsByOrder.has(row.rowOrder)) {
				rowsByOrder.set(row.rowOrder, row.values);
			}
		}
	};
	if (kind === "lexicon") {
		const configuredModes = lookupOptions?.mode ?? "casefold";
		const modes = Array.isArray(configuredModes)
			? configuredModes
			: [configuredModes];
		const texts = [...new Set([...textsByKey.values()].flat())];
		for (const text of texts) {
			for (const column of keyColumns) {
				for (const mode of modes) {
					if (mode === "prefix" || mode === "suffix" || mode === "fuzzy") {
						addRows(
							await index.rowsForKeyPattern(
								column,
								text,
								mode,
								lookupOptions?.maxDistance ?? 1,
							),
						);
					} else {
						addRows(
							await index.rowsForNormalizedKey(
								column,
								normalizedLookupKey(text),
							),
						);
					}
				}
			}
		}
	} else {
		for (const key of textsByKey.keys()) {
			for (const column of keyColumns) {
				addRows(await index.rowsForNormalizedKey(column, key));
			}
		}
	}
	const selected = [...rowsByOrder.entries()].sort(
		([leftOrder], [rightOrder]) => leftOrder - rightOrder,
	);
	return Object.freeze(
		maxRows === undefined
			? selected.map(([, row]) => row)
			: selected.slice(0, maxRows).map(([, row]) => row),
	);
}

async function indexedMatchingTableRows(
	pack: TextPackLike,
	reader: TextPackResourceReader | undefined,
	resourceId: string,
	textsByKey: ReadonlyMap<string, readonly string[]>,
	maxRows: number | undefined,
	kind: TableIndexKind,
	lookupIndexResourceId: string,
	lookupOptions?: LookupOptions,
): Promise<readonly Readonly<Record<string, string>>[]> {
	const index = await openResourceLookupIndex(
		pack as never,
		resourceId,
		lookupIndexResourceId,
		reader,
	);
	return generatedIndexRows(index, textsByKey, maxRows, kind, lookupOptions);
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
	return nfkcCaseFold(value);
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

function matchingLexiconQueryTexts(
	entries: readonly LexicalEntry[],
	texts: readonly string[],
	options: LookupOptions,
): readonly string[] {
	if (entries.length === 0) return Object.freeze([]);
	const lexicon = buildLexicon(entries, {
		id: "targeted-row-match",
		duplicateIdPolicy: "allow",
		duplicateFormPolicy: "allow",
	});
	return Object.freeze(
		texts.filter(
			(text) =>
				lookup(lexicon, text, {
					...options,
					mode: options.mode ?? "casefold",
				}).length > 0,
		),
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
			readonly resourceRefs?: readonly {
				readonly resourceId?: unknown;
				readonly role?: unknown;
			}[];
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

function requiredLookupIndexForSource(
	pack: TextPackLike,
	refs: readonly CanonicalResourceRef[] | undefined,
	sourceResourceId: string,
): string {
	for (const ref of refs ?? []) {
		if (ref.role !== "lookup-index" || typeof ref.resourceId !== "string") {
			continue;
		}
		const descriptor = findResource(pack, ref.resourceId);
		const metadata =
			descriptor.metadata !== null &&
			typeof descriptor.metadata === "object" &&
			!Array.isArray(descriptor.metadata)
				? (descriptor.metadata as Readonly<Record<string, unknown>>)
				: undefined;
		if (
			descriptor.schemaId !== "textpack.lookup-index.v1" ||
			typeof metadata?.indexedResourceId !== "string"
		) {
			throw new TypeError(
				`Canonical lookup-index ref ${descriptor.id} has invalid metadata.`,
			);
		}
		if (metadata?.indexedResourceId === sourceResourceId) return descriptor.id;
	}
	throw new TypeError(
		`Canonical resource ${sourceResourceId} requires a textpack.lookup-index.v1 reference for targeted lookup.`,
	);
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
	readonly maxResultsPerForm?: number;
}

export interface MorphologyGenerationsFromPackOptions
	extends ResourceMaterializationOptions {
	readonly resourceIds?: readonly string[];
	readonly maxRowsPerResource?: number;
	readonly maxResults?: number;
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

function featureBundleRecord(
	bundle: string | undefined,
): Record<string, string> {
	const features: Record<string, string> = {};
	if (bundle === undefined || bundle.length === 0) return features;
	const items = bundle.includes(":")
		? bundle.split(/\s+/u)
		: bundle.split(/[; ]/u);
	for (const item of items) {
		if (item.length === 0) continue;
		const colon = item.indexOf(":");
		if (colon > 0) features[item.slice(0, colon)] = item.slice(colon + 1);
		else features[item] = "true";
	}
	return features;
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
				"sectionSurface",
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
		Object.assign(features, featureBundleRecord(bundle));
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

function camelBundleFeatures(
	row: Readonly<Record<string, string>>,
): Readonly<Record<string, string>> {
	return featureBundleRecord(row.featureBundle);
}

function morphologyAnalysisProbability(analysis: MorphologyAnalysis): number {
	for (const name of ["lex_logprob", "pos_lex_logprob"] as const) {
		const value = Number(analysis.features[name]);
		if (Number.isFinite(value)) return value;
	}
	return Number.NEGATIVE_INFINITY;
}

function rankMorphologyAnalyses(
	analyses: readonly MorphologyAnalysis[],
): readonly MorphologyAnalysis[] {
	return Object.freeze(
		analyses
			.map((analysis, index) => ({ analysis, index }))
			.sort(
				(left, right) =>
					morphologyAnalysisProbability(right.analysis) -
						morphologyAnalysisProbability(left.analysis) ||
					left.index - right.index,
			)
			.map(({ analysis }) => analysis),
	);
}

function camelCompositionAnalysis(
	form: string,
	prefix: Readonly<Record<string, string>>,
	stem: Readonly<Record<string, string>>,
	suffix: Readonly<Record<string, string>>,
	sourceResourceId: string,
): MorphologyAnalysis | undefined {
	const stemAnalysis = morphologyAnalysisFromRow(stem, sourceResourceId);
	if (stemAnalysis === undefined) return undefined;
	const prefixCategory = prefix.category ?? "";
	const stemCategory = stem.category ?? "";
	const suffixCategory = suffix.category ?? "";
	return Object.freeze({
		form,
		...(stemAnalysis.lemma === undefined ? {} : { lemma: stemAnalysis.lemma }),
		...(stemAnalysis.partOfSpeech === undefined
			? {}
			: { partOfSpeech: stemAnalysis.partOfSpeech }),
		features: Object.freeze({
			...stemAnalysis.features,
			...camelBundleFeatures(stem),
			...camelBundleFeatures(prefix),
			...camelBundleFeatures(suffix),
			prefixSurface: prefix.surface ?? "",
			stemSurface: stem.surface ?? "",
			suffixSurface: suffix.surface ?? "",
			prefixCategory,
			stemCategory,
			suffixCategory,
			composition: "CAMeL-AB-BC-AC",
		}),
		...(stemAnalysis.entryId === undefined
			? {}
			: { entryId: stemAnalysis.entryId }),
		sourceResourceId,
	});
}

async function camelMorphemeRowsForForm(
	index: TextPackLookupIndex,
	form: string,
): Promise<CamelMorphemeRows> {
	const characters = [...form];
	const queries = new Map<
		string,
		{ readonly section: CamelMorphemeSection; readonly surface: string }
	>();
	const addQuery = (section: CamelMorphemeSection, surface: string) => {
		queries.set(camelMorphemeKey(section, surface), { section, surface });
	};
	for (let end = 0; end < characters.length; end += 1) {
		addQuery("PREFIXES", characters.slice(0, end).join(""));
	}
	for (let start = 0; start < characters.length; start += 1) {
		for (let end = start + 1; end <= characters.length; end += 1) {
			addQuery("STEMS", characters.slice(start, end).join(""));
		}
	}
	for (let start = 1; start <= characters.length; start += 1) {
		addQuery("SUFFIXES", characters.slice(start).join(""));
	}
	const rowsBySectionSurface = new Map<
		string,
		readonly Readonly<Record<string, string>>[]
	>();
	const queryList = [...queries.values()];
	const surfaceLookupConcurrency = 4;
	for (
		let start = 0;
		start < queryList.length;
		start += surfaceLookupConcurrency
	) {
		const entries = await Promise.all(
			queryList
				.slice(start, start + surfaceLookupConcurrency)
				.map(async ({ section, surface }) => {
					const normalizedSurface = normalizedLookupKey(surface);
					const rows = (
						await index.rowsForNormalizedKey(
							"sectionSurface",
							camelSectionSurfaceLookupKey(section, surface),
						)
					)
						.map((row) => row.values)
						.filter(
							(row) =>
								row.section === section &&
								normalizedLookupKey(row.surface ?? "") === normalizedSurface,
						);
					return [
						camelMorphemeKey(section, surface),
						Object.freeze(rows),
					] as const;
				}),
		);
		for (const [key, rows] of entries) rowsBySectionSurface.set(key, rows);
	}
	return (section, surface) =>
		rowsBySectionSurface.get(camelMorphemeKey(section, surface)) ??
		Object.freeze([]);
}

type CamelMorphemeRows = (
	section: CamelMorphemeSection,
	surface: string,
) => readonly Readonly<Record<string, string>>[];

function camelAnalysisProbability(analysis: MorphologyAnalysis): number {
	const value = Number(analysis.features.lex_logprob);
	return Number.isFinite(value) ? value : Number.NEGATIVE_INFINITY;
}

interface RankedCamelAnalysis {
	readonly analysis: MorphologyAnalysis;
	readonly identity: string;
	readonly probability: number;
	readonly lemma: string;
	readonly features: string;
}

function compareRankedCamelAnalyses(
	left: RankedCamelAnalysis,
	right: RankedCamelAnalysis,
): number {
	return (
		right.probability - left.probability ||
		compareStrings(left.lemma, right.lemma) ||
		compareStrings(left.features, right.features)
	);
}

function camelComposedAnalyses(
	form: string,
	morphemeRows: CamelMorphemeRows,
	compatibilityIndex: CamelCompatibilityIndex,
	sourceResourceId: string,
	maxResults: number | undefined,
): readonly MorphologyAnalysis[] {
	if (maxResults === 0) return Object.freeze([]);
	const characters = [...form];
	const rowCache = new Map<
		string,
		readonly Readonly<Record<string, string>>[]
	>();
	const rows = (section: CamelMorphemeSection, surface: string) => {
		const key = camelMorphemeKey(section, surface);
		const cached = rowCache.get(key);
		if (cached !== undefined) return cached;
		const indexed = morphemeRows(section, surface);
		rowCache.set(key, indexed);
		return indexed;
	};
	const selected: RankedCamelAnalysis[] = [];
	const selectedKeys = new Set<string>();
	const retain = (analysis: MorphologyAnalysis) => {
		const identity = JSON.stringify(analysis);
		if (selectedKeys.has(identity)) return;
		selectedKeys.add(identity);
		selected.push({
			analysis,
			identity,
			probability: camelAnalysisProbability(analysis),
			lemma: analysis.lemma ?? "",
			features: JSON.stringify(analysis.features),
		});
		selected.sort(compareRankedCamelAnalyses);
		if (maxResults !== undefined && selected.length > maxResults) {
			const removed = selected.pop();
			if (removed !== undefined) selectedKeys.delete(removed.identity);
		}
	};
	const stemRanks = new WeakMap<
		Readonly<Record<string, string>>,
		{ readonly probability: number; readonly lemma: string }
	>();
	const bundles = new WeakMap<
		Readonly<Record<string, string>>,
		Readonly<Record<string, string>>
	>();
	const bundle = (row: Readonly<Record<string, string>>) => {
		const cached = bundles.get(row);
		if (cached !== undefined) return cached;
		const parsed = camelBundleFeatures(row);
		bundles.set(row, parsed);
		return parsed;
	};
	const stemRank = (stem: Readonly<Record<string, string>>) => {
		const cached = stemRanks.get(stem);
		if (cached !== undefined) return cached;
		const value = Number(bundle(stem).lex_logprob);
		const rank = {
			probability: Number.isFinite(value) ? value : Number.NEGATIVE_INFINITY,
			lemma:
				firstNonEmpty(stem.lemma, stem.lexicalForm, stem.stem, stem.root) ?? "",
		};
		stemRanks.set(stem, rank);
		return rank;
	};
	for (let prefixEnd = 0; prefixEnd < characters.length; prefixEnd += 1) {
		const prefixRows = rows(
			"PREFIXES",
			characters.slice(0, prefixEnd).join(""),
		);
		if (prefixRows.length === 0) continue;
		for (
			let suffixStart = prefixEnd + 1;
			suffixStart <= characters.length;
			suffixStart += 1
		) {
			const stemRows = rows(
				"STEMS",
				characters.slice(prefixEnd, suffixStart).join(""),
			);
			if (stemRows.length === 0) continue;
			const suffixRows = rows(
				"SUFFIXES",
				characters.slice(suffixStart).join(""),
			);
			if (suffixRows.length === 0) continue;
			const suffixOverridesProbability = suffixRows.some(
				(suffix) => bundle(suffix).lex_logprob !== undefined,
			);
			for (const prefix of prefixRows) {
				const prefixCategory = prefix.category ?? "";
				const stemOwnsProbability =
					bundle(prefix).lex_logprob === undefined &&
					!suffixOverridesProbability;
				for (const stem of stemRows) {
					const worst =
						maxResults !== undefined && selected.length === maxResults
							? selected.at(-1)
							: undefined;
					if (worst !== undefined && stemOwnsProbability) {
						const rank = stemRank(stem);
						if (
							rank.probability < worst.probability ||
							(rank.probability === worst.probability &&
								compareStrings(rank.lemma, worst.lemma) > 0)
						) {
							continue;
						}
					}
					const stemCategory = stem.category ?? "";
					for (const suffix of suffixRows) {
						const suffixCategory = suffix.category ?? "";
						if (
							!camelCategoriesAreCompatible(
								compatibilityIndex,
								prefixCategory,
								stemCategory,
								suffixCategory,
							)
						) {
							continue;
						}
						const analysis = camelCompositionAnalysis(
							form,
							prefix,
							stem,
							suffix,
							sourceResourceId,
						);
						if (analysis === undefined) continue;
						retain(analysis);
					}
				}
			}
		}
	}
	return Object.freeze(
		selected.sort(compareRankedCamelAnalyses).map((entry) => entry.analysis),
	);
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
		if (featureBundleRecord(entry.featureBundle)[key] === expected) {
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
		if (
			lemma !== undefined &&
			normalizedLookupKey(generation.lemma) !== normalizedLookupKey(lemma)
		) {
			continue;
		}
		byLemma.set(generation.lemma, [
			...(byLemma.get(generation.lemma) ?? []),
			generation,
		]);
	}
	return Object.freeze(
		[...byLemma.entries()]
			.sort(([left], [right]) => compareStrings(left, right))
			.map(([entryLemma, entries]) =>
				Object.freeze({
					lemma: entryLemma,
					entries: Object.freeze(
						entries.sort(
							(left, right) =>
								compareStrings(left.form, right.form) ||
								compareStrings(left.entryId ?? "", right.entryId ?? ""),
						),
					),
				}),
			),
	);
}

function isAnalysisMorphologyRowRole(role: string): boolean {
	return (
		role.length === 0 ||
		role === "analyzer" ||
		role === "generator" ||
		role === "paradigm-table"
	);
}

function isGenerationMorphologyRowRole(role: string): boolean {
	return role === "generator" || role === "paradigm-table";
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
				for (const text of matchingLexiconQueryTexts(
					[entry],
					uniqueTexts,
					options,
				)) {
					entriesByText.get(text)?.push(entry);
				}
			}
		}
		for (const ref of canonical.resourceRefs ?? []) {
			if (typeof ref.resourceId !== "string") continue;
			if (!isLexiconRowRole(ref.role)) continue;
			const referenced = findResource(pack, ref.resourceId);
			const matchingRows = await indexedMatchingTableRows(
				pack,
				options.reader,
				referenced.id,
				textsByKey,
				options.maxRowsPerResource,
				"lexicon",
				requiredLookupIndexForSource(
					pack,
					canonical.resourceRefs,
					referenced.id,
				),
				options,
			);
			for (const row of matchingRows) {
				const rowEntries = canonicalLexiconRows(tableTextFromRows([row]), {
					...parseOptions,
					source: referenced.id,
				});
				for (const text of matchingLexiconQueryTexts(
					rowEntries,
					uniqueTexts,
					options,
				)) {
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
		output.set(
			text,
			Object.freeze(
				lookup(lexicon, text, {
					...options,
					mode: options.mode ?? "casefold",
				}),
			),
		);
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
			if (!isLexiconRowRole(ref.role)) continue;
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
						schemaId: "textlex.morphology.v1",
						role: options.role ?? "primary",
					}).resourceId,
				)
			: findResource(
					pack,
					requireSingleTaskResourceBinding(pack, {
						slot: options.slot ?? "morphology",
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
		const role = typeof ref.role === "string" ? ref.role : "";
		if (!isAnalysisMorphologyRowRole(role) && role !== "morpheme-inventory") {
			continue;
		}
		const referenced = findResource(pack, ref.resourceId);
		const referencedValue = await materializedResourceValue(
			pack,
			referenced,
			options.reader,
		);
		if (typeof referencedValue !== "string") continue;
		const rows = parseTable(referencedValue).slice(0, options.maxRows);
		if (role === "morpheme-inventory") {
			for (const row of rows) {
				if (row.section !== "STEMS") continue;
				const generation = morphologyGenerationFromRow(row, referenced.id);
				if (generation !== undefined) generations.push(generation);
			}
			continue;
		}
		if (isGenerationMorphologyRowRole(role)) {
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
	for (const [form, formAnalyses] of analysesByForm) {
		analysesByForm.set(form, [...rankMorphologyAnalyses(formAnalyses)]);
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
	if (
		options.maxResultsPerForm !== undefined &&
		(!Number.isSafeInteger(options.maxResultsPerForm) ||
			options.maxResultsPerForm < 0)
	) {
		throw new TypeError(
			"maxResultsPerForm must be a non-negative safe integer.",
		);
	}
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
		let camelMorphemeResource:
			| {
					readonly descriptor: TextPackResourceLike;
					readonly lookupIndexResourceId: string;
			  }
			| undefined;
		let camelCompatibilityResource:
			| {
					readonly descriptor: TextPackResourceLike;
					readonly text: string;
			  }
			| undefined;
		for (const ref of canonical.resourceRefs ?? []) {
			if (typeof ref.resourceId !== "string") continue;
			const role = typeof ref.role === "string" ? ref.role : "";
			if (
				!isAnalysisMorphologyRowRole(role) &&
				role !== "morpheme-inventory" &&
				role !== "compatibility-table"
			) {
				continue;
			}
			const referenced = findResource(pack, ref.resourceId);
			if (role === "compatibility-table") {
				const referencedValue = await materializedResourceValue(
					pack,
					referenced,
					options.reader,
				);
				if (typeof referencedValue !== "string") {
					throw new TypeError(
						`${referenced.id} compatibility table must be text-backed.`,
					);
				}
				camelCompatibilityResource ??= {
					descriptor: referenced,
					text: referencedValue,
				};
				continue;
			}
			const lookupIndexResourceId = requiredLookupIndexForSource(
				pack,
				canonical.resourceRefs,
				referenced.id,
			);
			if (role === "morpheme-inventory") {
				camelMorphemeResource ??= {
					descriptor: referenced,
					lookupIndexResourceId,
				};
				continue;
			}
			const matchingRows = await indexedMatchingTableRows(
				pack,
				options.reader,
				referenced.id,
				formsByKey,
				undefined,
				"morphology",
				lookupIndexResourceId,
			);
			const matchingAnalyses = matchingRows
				.flatMap((row) => {
					const analysis = morphologyAnalysisFromRow(row, referenced.id);
					return analysis === undefined ||
						!formsByKey.has(normalizedLookupKey(analysis.form))
						? []
						: [analysis];
				})
				.slice(0, options.maxRowsPerResource);
			for (const analysis of matchingAnalyses) {
				for (const form of formsByKey.get(normalizedLookupKey(analysis.form)) ??
					[]) {
					analysesByForm.get(form)?.push(analysis);
				}
			}
		}
		if (
			camelMorphemeResource !== undefined &&
			camelCompatibilityResource !== undefined
		) {
			const generatedIndex = await openResourceLookupIndex(
				pack as never,
				camelMorphemeResource.descriptor.id,
				camelMorphemeResource.lookupIndexResourceId,
				options.reader,
			);
			const compatibilityIndex = camelCompatibilityIndex(
				pack,
				options.reader,
				camelCompatibilityResource.descriptor.id,
				camelCompatibilityResource.text,
			);
			for (const form of uniqueForms) {
				const analyses = analysesByForm.get(form);
				if (analyses === undefined || analyses.length > 0) continue;
				const morphemeRows = await camelMorphemeRowsForForm(
					generatedIndex,
					form,
				);
				analyses.push(
					...camelComposedAnalyses(
						form,
						morphemeRows,
						compatibilityIndex,
						camelMorphemeResource.descriptor.id,
						options.maxResultsPerForm ?? options.maxRowsPerResource,
					),
				);
			}
		}
	}
	return new Map(
		[...analysesByForm.entries()].map(([form, analyses]) => [
			form,
			Object.freeze(
				options.maxResultsPerForm === undefined
					? rankMorphologyAnalyses(analyses)
					: rankMorphologyAnalyses(analyses).slice(
							0,
							options.maxResultsPerForm,
						),
			),
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

export async function morphologyGenerationsFromPackAsync(
	pack: TextPackLike,
	lemma: string,
	features?: Readonly<Record<string, string>>,
	options: MorphologyGenerationsFromPackOptions = {},
): Promise<readonly MorphologyGeneration[]> {
	if (lemma.length === 0) return Object.freeze([]);
	if (
		options.maxResults !== undefined &&
		(!Number.isSafeInteger(options.maxResults) || options.maxResults < 0)
	) {
		throw new TypeError("maxResults must be a non-negative safe integer.");
	}
	const lemmasByKey = queryTextsByKey([lemma]);
	const resources = boundResources(pack, {
		...options,
		defaultSlot: "morphology",
		defaultRole: "primary",
		schemaIds: "textlex.morphology.v1",
	});
	const generations: MorphologyGeneration[] = [];
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
			if (
				!isGenerationMorphologyRowRole(role) &&
				role !== "morpheme-inventory"
			) {
				continue;
			}
			const referenced = findResource(pack, ref.resourceId);
			const rows = await indexedMatchingTableRows(
				pack,
				options.reader,
				referenced.id,
				lemmasByKey,
				undefined,
				"generation",
				requiredLookupIndexForSource(
					pack,
					canonical.resourceRefs,
					referenced.id,
				),
			);
			const matchingGenerations = rows
				.flatMap((row) => {
					if (role === "morpheme-inventory" && row.section !== "STEMS") {
						return [];
					}
					const generation = morphologyGenerationFromRow(row, referenced.id);
					return generation === undefined ||
						normalizedLookupKey(generation.lemma) !==
							normalizedLookupKey(lemma) ||
						!featuresMatch(generation.features, features)
						? []
						: [generation];
				})
				.slice(0, options.maxRowsPerResource);
			for (const generation of matchingGenerations) {
				generations.push(generation);
			}
		}
	}
	const unique = new Map<string, MorphologyGeneration>();
	for (const generation of generations) {
		const key = JSON.stringify(generation);
		if (!unique.has(key)) unique.set(key, generation);
	}
	const output = [...unique.values()];
	return Object.freeze(
		options.maxResults === undefined
			? output
			: output.slice(0, options.maxResults),
	);
}

export async function morphologyParadigmsFromPackAsync(
	pack: TextPackLike,
	lemma: string,
	options: MorphologyGenerationsFromPackOptions = {},
): Promise<readonly MorphologyParadigm[]> {
	return morphologyParadigms(
		await morphologyGenerationsFromPackAsync(pack, lemma, undefined, options),
		lemma,
	);
}
