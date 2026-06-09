import type { TextPackLike } from "./types.js";

export interface CamelMorphFeature {
	readonly feature: string;
	readonly values: readonly string[];
}

export interface CamelMorphDefaultFeature {
	readonly pos: string;
	readonly feature: string;
	readonly value: string;
}

export interface CamelMorphTokenizationField {
	readonly order: number;
	readonly field: string;
}

export interface CamelMorphMorpheme {
	readonly section: "PREFIXES" | "STEMS" | "SUFFIXES";
	readonly surface: string;
	readonly category: string;
	readonly pos?: string;
	readonly lex?: string;
	readonly diac?: string;
	readonly bw?: string;
	readonly gloss?: string;
	readonly root?: string;
	readonly pattern?: string;
	readonly stem?: string;
	readonly stemcat?: string;
	readonly source?: string;
	readonly d3seg?: string;
	readonly atbseg?: string;
	readonly d3tok?: string;
	readonly atbtok?: string;
	readonly features: Readonly<Record<string, string>>;
}

export interface CamelMorphCompatibility {
	readonly table: "AB" | "AC" | "BC";
	readonly leftCategory: string;
	readonly rightCategory: string;
}

export interface CamelMorphology {
	readonly kind: "camel-morphology";
	readonly features: readonly CamelMorphFeature[];
	readonly defaults: readonly CamelMorphDefaultFeature[];
	readonly tokenizations: readonly CamelMorphTokenizationField[];
	readonly morphemes: readonly CamelMorphMorpheme[];
	readonly compatibility: readonly CamelMorphCompatibility[];
	readonly quality: Readonly<Record<string, unknown>>;
	lookupSurface(surface: string): readonly CamelMorphMorpheme[];
	lookupCategory(category: string): readonly CamelMorphMorpheme[];
}

const RESOURCE_IDS = {
	features: "ar-msa-camel-morph-features",
	defaults: "ar-msa-camel-morph-defaults",
	tokenizations: "ar-msa-camel-morph-tokenizations",
	morphemes: "ar-msa-camel-morph-morphemes",
	compatibility: "ar-msa-camel-morph-compatibility",
	quality: "ar-msa-camel-morph-quality",
} as const;

function resourceText(pack: TextPackLike, resourceId: string): string {
	const value = pack.resources[resourceId];
	if (typeof value !== "string") {
		throw new TypeError(`textpack resource ${resourceId} must be loaded text.`);
	}
	return value;
}

function nonEmptyRows(text: string): readonly string[][] {
	const [header, ...rows] = text
		.split(/\r?\n/u)
		.filter((line) => line.trim().length > 0)
		.map((line) => line.split("\t"));
	if (header === undefined || header.length === 0) return [];
	return rows;
}

function optional(value: string | undefined): string | undefined {
	if (value === undefined || value.length === 0) return undefined;
	return value;
}

function parseFeaturesCell(value: string): Readonly<Record<string, string>> {
	const output: Record<string, string> = {};
	for (const token of value.trim().split(/\s+/u)) {
		const index = token.indexOf(":");
		if (index <= 0) continue;
		output[token.slice(0, index)] = token.slice(index + 1);
	}
	return Object.freeze(output);
}

function appendIndex<K extends string>(
	index: Map<K, CamelMorphMorpheme[]>,
	key: K,
	morpheme: CamelMorphMorpheme,
): void {
	const existing = index.get(key);
	if (existing === undefined) {
		index.set(key, [morpheme]);
		return;
	}
	existing.push(morpheme);
}

function freezeIndex<K extends string>(
	index: Map<K, CamelMorphMorpheme[]>,
): ReadonlyMap<K, readonly CamelMorphMorpheme[]> {
	const output = new Map<K, readonly CamelMorphMorpheme[]>();
	for (const [key, values] of index)
		output.set(key, Object.freeze([...values]));
	return output;
}

export function camelMorphologyFromPack(pack: TextPackLike): CamelMorphology {
	const features = nonEmptyRows(resourceText(pack, RESOURCE_IDS.features)).map(
		([feature = "", , values = ""]) =>
			Object.freeze({
				feature,
				values: Object.freeze(
					values.split(/\s+/u).filter((value) => value.length > 0),
				),
			}),
	);
	const defaults = nonEmptyRows(resourceText(pack, RESOURCE_IDS.defaults)).map(
		([pos = "", feature = "", value = ""]) =>
			Object.freeze({ pos, feature, value }),
	);
	const tokenizations = nonEmptyRows(
		resourceText(pack, RESOURCE_IDS.tokenizations),
	).map(([order = "0", field = ""]) =>
		Object.freeze({ order: Number(order), field }),
	);
	const bySurface = new Map<string, CamelMorphMorpheme[]>();
	const byCategory = new Map<string, CamelMorphMorpheme[]>();
	const morphemes = nonEmptyRows(
		resourceText(pack, RESOURCE_IDS.morphemes),
	).map((row) => {
		const pos = optional(row[3]);
		const lex = optional(row[4]);
		const diac = optional(row[5]);
		const bw = optional(row[6]);
		const gloss = optional(row[7]);
		const root = optional(row[8]);
		const pattern = optional(row[9]);
		const stem = optional(row[10]);
		const stemcat = optional(row[11]);
		const source = optional(row[12]);
		const d3seg = optional(row[13]);
		const atbseg = optional(row[14]);
		const d3tok = optional(row[15]);
		const atbtok = optional(row[16]);
		const morpheme: CamelMorphMorpheme = Object.freeze({
			section: (row[0] ?? "STEMS") as CamelMorphMorpheme["section"],
			surface: row[1] ?? "",
			category: row[2] ?? "",
			...(pos === undefined ? {} : { pos }),
			...(lex === undefined ? {} : { lex }),
			...(diac === undefined ? {} : { diac }),
			...(bw === undefined ? {} : { bw }),
			...(gloss === undefined ? {} : { gloss }),
			...(root === undefined ? {} : { root }),
			...(pattern === undefined ? {} : { pattern }),
			...(stem === undefined ? {} : { stem }),
			...(stemcat === undefined ? {} : { stemcat }),
			...(source === undefined ? {} : { source }),
			...(d3seg === undefined ? {} : { d3seg }),
			...(atbseg === undefined ? {} : { atbseg }),
			...(d3tok === undefined ? {} : { d3tok }),
			...(atbtok === undefined ? {} : { atbtok }),
			features: parseFeaturesCell(row[17] ?? ""),
		});
		appendIndex(bySurface, morpheme.surface, morpheme);
		appendIndex(byCategory, morpheme.category, morpheme);
		return morpheme;
	});
	const compatibility = nonEmptyRows(
		resourceText(pack, RESOURCE_IDS.compatibility),
	).map(([table = "AB", leftCategory = "", rightCategory = ""]) =>
		Object.freeze({
			table: table as CamelMorphCompatibility["table"],
			leftCategory,
			rightCategory,
		}),
	);
	const quality = JSON.parse(
		resourceText(pack, RESOURCE_IDS.quality),
	) as Record<string, unknown>;
	const surfaceIndex = freezeIndex(bySurface);
	const categoryIndex = freezeIndex(byCategory);
	return Object.freeze({
		kind: "camel-morphology" as const,
		features: Object.freeze(features),
		defaults: Object.freeze(defaults),
		tokenizations: Object.freeze(tokenizations),
		morphemes: Object.freeze(morphemes),
		compatibility: Object.freeze(compatibility),
		quality: Object.freeze(quality),
		lookupSurface(surface: string) {
			return surfaceIndex.get(surface) ?? [];
		},
		lookupCategory(category: string) {
			return categoryIndex.get(category) ?? [];
		},
	});
}
