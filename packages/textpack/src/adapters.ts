import { getResource } from "./pack.js";
import type { ResourceKind, TextPack, TextPackResource } from "./types.js";

export type TextPackResourceFamilyName =
	| "lexicon"
	| "segmentation"
	| "normalization"
	| "morphology"
	| "syntax"
	| "search"
	| "knowledge-base"
	| "corpus"
	| "parallel"
	| "quality";

export type TextPackTableRow = Readonly<Record<string, string>>;

export interface TextPackTablePayload {
	readonly type: "table";
	readonly columns: readonly string[];
	readonly rows: readonly TextPackTableRow[];
}

export interface TextPackJsonPayload {
	readonly type: "json";
	readonly value: unknown;
}

export interface TextPackRawPayload {
	readonly type: "raw";
	readonly value: unknown;
}

export type TextPackResourcePayload =
	| TextPackTablePayload
	| TextPackJsonPayload
	| TextPackRawPayload;

export interface TextPackLoadedResource {
	readonly id: string;
	readonly kind: ResourceKind;
	readonly format?: string;
	readonly descriptor: TextPackResource;
	readonly payload: TextPackResourcePayload;
}

export interface TextPackResourceFamily {
	readonly family: TextPackResourceFamilyName;
	readonly packId: string;
	readonly packageName: string;
	readonly resources: readonly TextPackLoadedResource[];
}

export interface TextPackResourceFamilyLoadOptions {
	readonly resourceIds?: readonly string[];
	readonly slots?: readonly string[];
	readonly includeKinds?: readonly ResourceKind[];
	readonly excludeKinds?: readonly ResourceKind[];
}

interface FamilySpec {
	readonly family: TextPackResourceFamilyName;
	readonly slots: readonly string[];
	readonly kinds: readonly ResourceKind[];
}

const familySpecs = {
	lexicon: {
		family: "lexicon",
		slots: ["lexicon", "terminology", "extraction"],
		kinds: [
			"lexicon",
			"gazetteer",
			"termbase",
			"abbreviation-table",
			"stoplist",
			"phrase-list",
		],
	},
	segmentation: {
		family: "segmentation",
		slots: ["segmentation"],
		kinds: ["segmentation-profile", "fst", "rule-set"],
	},
	normalization: {
		family: "normalization",
		slots: ["normalization"],
		kinds: ["normalization-profile", "fst", "rule-set"],
	},
	morphology: {
		family: "morphology",
		slots: ["morphology"],
		kinds: ["morphology", "fst"],
	},
	syntax: {
		family: "syntax",
		slots: ["syntax", "tagging"],
		kinds: ["grammar", "rule-set", "statistical-model"],
	},
	search: {
		family: "search",
		slots: ["search"],
		kinds: ["search-profile"],
	},
	knowledgeBase: {
		family: "knowledge-base",
		slots: ["knowledge-base", "kb", "lexical-semantics", "terminology"],
		kinds: ["knowledge-base", "ontology", "termbase"],
	},
	corpus: {
		family: "corpus",
		slots: ["corpus"],
		kinds: ["corpus"],
	},
	parallel: {
		family: "parallel",
		slots: ["parallel"],
		kinds: ["translation-memory", "alignment-table"],
	},
	quality: {
		family: "quality",
		slots: ["quality"],
		kinds: ["quality-profile"],
	},
} as const satisfies Record<string, FamilySpec>;

function optionSet(values: readonly string[] | undefined): ReadonlySet<string> {
	return new Set(values ?? []);
}

function kindSet(
	values: readonly ResourceKind[] | undefined,
): ReadonlySet<ResourceKind> {
	return new Set(values ?? []);
}

function resourceIdsForSlots(
	pack: TextPack,
	slots: readonly string[],
): ReadonlySet<string> {
	const slotSet = optionSet(slots);
	const ids = new Set<string>();
	for (const slot of pack.manifest.capabilitySlots) {
		if (!slotSet.has(slot.slot)) continue;
		for (const id of slot.resourceIds ?? []) {
			ids.add(id);
		}
	}
	return ids;
}

function resourceMatchesFamily(
	resource: TextPackResource,
	slotResourceIds: ReadonlySet<string>,
	kinds: ReadonlySet<ResourceKind>,
): boolean {
	return slotResourceIds.has(resource.id) || kinds.has(resource.kind);
}

function selectedResources(
	pack: TextPack,
	spec: FamilySpec,
	options: TextPackResourceFamilyLoadOptions,
): readonly TextPackResource[] {
	const explicitIds = optionSet(options.resourceIds);
	const slots = options.slots ?? spec.slots;
	const slotResourceIds = resourceIdsForSlots(pack, slots);
	const includeKinds = kindSet(options.includeKinds ?? spec.kinds);
	const excludeKinds = kindSet(options.excludeKinds);
	const output: TextPackResource[] = [];

	for (const resource of pack.manifest.resources) {
		if (explicitIds.size > 0 && !explicitIds.has(resource.id)) continue;
		if (excludeKinds.has(resource.kind)) continue;
		if (
			explicitIds.size === 0 &&
			!resourceMatchesFamily(resource, slotResourceIds, includeKinds)
		) {
			continue;
		}
		output.push(resource);
	}

	return Object.freeze(output);
}

function normalizeLines(text: string): string[] {
	const lines = text.replace(/\r\n/gu, "\n").replace(/\r/gu, "\n").split("\n");
	while (lines.length > 0 && lines[lines.length - 1] === "") {
		lines.pop();
	}
	return lines;
}

function parseTablePayload(
	resource: TextPackResource,
	value: unknown,
): TextPackTablePayload {
	if (typeof value !== "string") {
		throw new TypeError(`${resource.id} must be a string TSV resource.`);
	}
	const lines = normalizeLines(value);
	if (lines.length === 0) {
		throw new TypeError(`${resource.id} must contain a TSV header row.`);
	}
	const header = lines[0];
	if (header === undefined || header.length === 0) {
		throw new TypeError(`${resource.id} must contain a non-empty TSV header.`);
	}
	const columns = Object.freeze(header.split("\t"));
	if (new Set(columns).size !== columns.length) {
		throw new TypeError(
			`${resource.id} TSV header must not duplicate columns.`,
		);
	}
	const rows: TextPackTableRow[] = [];
	for (let index = 1; index < lines.length; index += 1) {
		const line = lines[index];
		if (line === undefined || line.length === 0) continue;
		const cells = line.split("\t");
		if (cells.length > columns.length) {
			throw new TypeError(
				`${resource.id} row ${index + 1} has more TSV cells than the header.`,
			);
		}
		const row: Record<string, string> = {};
		for (let columnIndex = 0; columnIndex < columns.length; columnIndex += 1) {
			const column = columns[columnIndex];
			if (column === undefined || column.length === 0) {
				throw new TypeError(
					`${resource.id} TSV header contains an empty column.`,
				);
			}
			row[column] = cells[columnIndex] ?? "";
		}
		rows.push(Object.freeze(row));
	}
	return Object.freeze({
		type: "table",
		columns,
		rows: Object.freeze(rows),
	});
}

function parseJsonPayload(value: unknown): TextPackJsonPayload {
	if (typeof value === "string") {
		return Object.freeze({
			type: "json",
			value: JSON.parse(value),
		});
	}
	return Object.freeze({
		type: "json",
		value,
	});
}

function resourcePayload(
	resource: TextPackResource,
	value: unknown,
): TextPackResourcePayload {
	const format = resource.format ?? "";
	if (format.includes("tsv")) return parseTablePayload(resource, value);
	if (format === "json" || format.endsWith("+json")) {
		return parseJsonPayload(value);
	}
	return Object.freeze({
		type: "raw",
		value,
	});
}

function loadedResource(
	pack: TextPack,
	resource: TextPackResource,
): TextPackLoadedResource {
	const format = resource.format;
	return Object.freeze({
		id: resource.id,
		kind: resource.kind,
		...(format === undefined ? {} : { format }),
		descriptor: resource,
		payload: resourcePayload(resource, getResource(pack, resource.id)),
	});
}

function loadResourceFamily(
	pack: TextPack,
	spec: FamilySpec,
	options: TextPackResourceFamilyLoadOptions = {},
): TextPackResourceFamily {
	const resources = selectedResources(pack, spec, options).map((resource) =>
		loadedResource(pack, resource),
	);
	return Object.freeze({
		family: spec.family,
		packId: pack.manifest.id,
		packageName: pack.manifest.packageName,
		resources: Object.freeze(resources),
	});
}

export function loadLexicon(
	pack: TextPack,
	options: TextPackResourceFamilyLoadOptions = {},
): TextPackResourceFamily {
	return loadResourceFamily(pack, familySpecs.lexicon, options);
}

export function loadSegmenter(
	pack: TextPack,
	options: TextPackResourceFamilyLoadOptions = {},
): TextPackResourceFamily {
	return loadResourceFamily(pack, familySpecs.segmentation, options);
}

export function loadNormalizer(
	pack: TextPack,
	options: TextPackResourceFamilyLoadOptions = {},
): TextPackResourceFamily {
	return loadResourceFamily(pack, familySpecs.normalization, options);
}

export function loadMorphology(
	pack: TextPack,
	options: TextPackResourceFamilyLoadOptions = {},
): TextPackResourceFamily {
	return loadResourceFamily(pack, familySpecs.morphology, options);
}

export function loadSyntaxResources(
	pack: TextPack,
	options: TextPackResourceFamilyLoadOptions = {},
): TextPackResourceFamily {
	return loadResourceFamily(pack, familySpecs.syntax, options);
}

export function loadSearchAnalyzer(
	pack: TextPack,
	options: TextPackResourceFamilyLoadOptions = {},
): TextPackResourceFamily {
	return loadResourceFamily(pack, familySpecs.search, options);
}

export function loadKnowledgeBase(
	pack: TextPack,
	options: TextPackResourceFamilyLoadOptions = {},
): TextPackResourceFamily {
	return loadResourceFamily(pack, familySpecs.knowledgeBase, options);
}

export function loadCorpus(
	pack: TextPack,
	options: TextPackResourceFamilyLoadOptions = {},
): TextPackResourceFamily {
	return loadResourceFamily(pack, familySpecs.corpus, options);
}

export function loadParallelResources(
	pack: TextPack,
	options: TextPackResourceFamilyLoadOptions = {},
): TextPackResourceFamily {
	return loadResourceFamily(pack, familySpecs.parallel, options);
}

export function loadQualityProfile(
	pack: TextPack,
	options: TextPackResourceFamilyLoadOptions = {},
): TextPackResourceFamily {
	return loadResourceFamily(pack, familySpecs.quality, options);
}
