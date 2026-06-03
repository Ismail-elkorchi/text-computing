import type { AbbreviationEntry } from "../abbreviation/types.js";
import type { AffixEntry, AffixKind } from "../affix/types.js";
import type { GazetteerEntry } from "../gazetteer/types.js";
import { generatedId } from "../internal/ids.js";
import { isPlainRecord } from "../internal/json.js";
import type { LexicalEntry } from "../lexicon/types.js";
import type { PronunciationEntry } from "../pronunciation/types.js";
import type { TermEntry } from "../term/types.js";
import type { WordlistEntry } from "../wordlist/types.js";
import type { ResourceParseOptions } from "./types.js";

function lines(value: string): readonly string[] {
	return Object.freeze(
		value
			.split(/\r?\n/)
			.map((line) => line.trim())
			.filter((line) => line.length > 0 && !line.startsWith("#")),
	);
}

function maybeJson(value: string): unknown | undefined {
	const trimmed = value.trim();
	if (!trimmed.startsWith("[") && !trimmed.startsWith("{")) return undefined;
	return JSON.parse(trimmed) as unknown;
}

function fields(line: string): readonly string[] {
	return Object.freeze(line.split("\t").map((field) => field.trim()));
}

function parseFeatureFields(
	raw: readonly string[],
): Record<string, unknown> | undefined {
	const features: Record<string, unknown> = {};
	for (const field of raw) {
		if (field.length === 0) continue;
		const [key, ...rest] = field.split("=");
		if (key === undefined || key.length === 0 || rest.length === 0) continue;
		features[key] = rest.join("=");
	}
	return Object.keys(features).length === 0 ? undefined : features;
}

function lexicalEntryFromRecord(
	value: Record<string, unknown>,
	fallbackId: string,
): LexicalEntry {
	const forms = value.forms;
	if (!Array.isArray(forms) || forms.some((form) => typeof form !== "string")) {
		throw new TypeError("lexical record forms must be a string array.");
	}
	return {
		...(value as unknown as LexicalEntry),
		id: typeof value.id === "string" ? value.id : fallbackId,
		forms,
	};
}

export function parseLexiconResource(
	value: unknown,
	options: ResourceParseOptions = {},
): LexicalEntry[] {
	if (typeof value === "string") {
		const parsed = maybeJson(value);
		if (parsed !== undefined) return parseLexiconResource(parsed, options);
		return lines(value).map((line) => {
			const [first, second, ...rest] = fields(line);
			const form = first ?? "";
			const id =
				second?.includes("=") || second === undefined
					? generatedId(options.idPrefix ?? "lex", form)
					: second;
			const features = parseFeatureFields(
				second?.includes("=") ? [second, ...rest] : rest,
			);
			return {
				id,
				forms: [form],
				...(options.language !== undefined
					? { language: options.language }
					: {}),
				...(options.script !== undefined ? { script: options.script } : {}),
				...(options.source !== undefined ? { source: options.source } : {}),
				...(features !== undefined ? { features } : {}),
			};
		});
	}
	if (Array.isArray(value)) {
		return value.map((entry, index) => {
			if (typeof entry === "string") {
				return {
					id: generatedId(options.idPrefix ?? "lex", entry),
					forms: [entry],
					...(options.language !== undefined
						? { language: options.language }
						: {}),
					...(options.script !== undefined ? { script: options.script } : {}),
					...(options.source !== undefined ? { source: options.source } : {}),
				};
			}
			if (isPlainRecord(entry)) {
				return lexicalEntryFromRecord(
					entry,
					`${options.idPrefix ?? "lex"}:${index}`,
				);
			}
			throw new TypeError(`lexicon resource row ${index} is invalid.`);
		});
	}
	if (isPlainRecord(value)) {
		return Object.entries(value).map(([id, raw]) => ({
			id,
			forms: Array.isArray(raw) ? raw.map(String) : [String(raw)],
		}));
	}
	throw new TypeError("lexicon resource must be a string, array, or object.");
}

export function parseGazetteerResource(
	value: unknown,
	options: ResourceParseOptions = {},
): GazetteerEntry[] {
	if (typeof value === "string") {
		const parsed = maybeJson(value);
		if (parsed !== undefined) return parseGazetteerResource(parsed, options);
		return lines(value).map((line) => {
			const [form, entityType, kbId] = fields(line);
			const surface = form ?? "";
			return {
				id: generatedId(
					options.idPrefix ?? "gaz",
					`${surface}:${entityType ?? ""}`,
				),
				forms: [surface],
				...(entityType !== undefined ? { entityType } : {}),
				...(kbId !== undefined ? { kbId } : {}),
				...(options.language !== undefined
					? { language: options.language }
					: {}),
				...(options.script !== undefined ? { script: options.script } : {}),
				...(options.source !== undefined ? { source: options.source } : {}),
			};
		});
	}
	return parseLexiconResource(value, options) as GazetteerEntry[];
}

export function parseTermbaseResource(
	value: unknown,
	options: ResourceParseOptions = {},
): TermEntry[] {
	return parseLexiconResource(value, {
		idPrefix: options.idPrefix ?? "term",
		...options,
	}) as TermEntry[];
}

export function parsePhraseListResource(
	value: unknown,
	options: ResourceParseOptions = {},
): LexicalEntry[] {
	return parseLexiconResource(value, {
		idPrefix: options.idPrefix ?? "phrase",
		...options,
	});
}

export function parseWordlistResource(
	value: unknown,
	options: ResourceParseOptions = {},
): WordlistEntry[] {
	if (typeof value === "string") {
		const parsed = maybeJson(value);
		if (parsed !== undefined) return parseWordlistResource(parsed, options);
		return lines(value).map((form) => ({
			form,
			...(options.language !== undefined ? { language: options.language } : {}),
			...(options.script !== undefined ? { script: options.script } : {}),
			...(options.source !== undefined ? { source: options.source } : {}),
		}));
	}
	if (Array.isArray(value)) {
		return value.map((entry, index) => {
			if (typeof entry === "string") return { form: entry };
			if (isPlainRecord(entry) && typeof entry.form === "string") {
				return entry as unknown as WordlistEntry;
			}
			throw new TypeError(`wordlist row ${index} is invalid.`);
		});
	}
	throw new TypeError("wordlist resource must be a string or array.");
}

export function parseStoplistResource(
	value: unknown,
	options: ResourceParseOptions = {},
): WordlistEntry[] {
	return parseWordlistResource(value, options);
}

export function parseAbbreviationResource(
	value: unknown,
	options: ResourceParseOptions = {},
): AbbreviationEntry[] {
	if (typeof value === "string") {
		const parsed = maybeJson(value);
		if (parsed !== undefined) return parseAbbreviationResource(parsed, options);
		return lines(value).map((line) => {
			const [form, expansions = ""] = fields(line);
			const surface = form ?? "";
			return {
				form: surface,
				expansions: expansions.split("|").filter((entry) => entry.length > 0),
				...(options.language !== undefined
					? { language: options.language }
					: {}),
				...(options.script !== undefined ? { script: options.script } : {}),
				...(options.source !== undefined ? { source: options.source } : {}),
			};
		});
	}
	if (Array.isArray(value)) return value as AbbreviationEntry[];
	throw new TypeError("abbreviation resource must be a string or array.");
}

export function parseAffixTableResource(
	value: unknown,
	options: ResourceParseOptions = {},
): AffixEntry[] {
	if (typeof value === "string") {
		const parsed = maybeJson(value);
		if (parsed !== undefined) return parseAffixTableResource(parsed, options);
		return lines(value).map((line) => {
			const [kind = "prefix", form = "", suffixForm] = fields(line);
			return {
				id: generatedId(
					options.idPrefix ?? "affix",
					`${kind}:${form}:${suffixForm ?? ""}`,
				),
				kind: kind as AffixKind,
				form,
				...(suffixForm !== undefined ? { suffixForm } : {}),
				...(options.language !== undefined
					? { language: options.language }
					: {}),
				...(options.script !== undefined ? { script: options.script } : {}),
				...(options.source !== undefined ? { source: options.source } : {}),
			};
		});
	}
	if (Array.isArray(value)) return value as AffixEntry[];
	throw new TypeError("affix table resource must be a string or array.");
}

export function parsePronunciationResource(
	value: unknown,
	options: ResourceParseOptions = {},
): PronunciationEntry[] {
	if (typeof value === "string") {
		const parsed = maybeJson(value);
		if (parsed !== undefined)
			return parsePronunciationResource(parsed, options);
		return lines(value).map((line) => {
			const [form = "", pronunciation = "", notation = "ipa"] = fields(line);
			return {
				id: generatedId(options.idPrefix ?? "pron", `${form}:${notation}`),
				form,
				pronunciations: pronunciation
					.split("|")
					.filter((entry) => entry.length > 0),
				notation,
				...(options.language !== undefined
					? { language: options.language }
					: {}),
				...(options.script !== undefined ? { script: options.script } : {}),
				...(options.source !== undefined ? { source: options.source } : {}),
			};
		});
	}
	if (Array.isArray(value)) return value as PronunciationEntry[];
	throw new TypeError("pronunciation resource must be a string or array.");
}

export function parsePronunciationLexiconResource(
	value: unknown,
	options: ResourceParseOptions = {},
): PronunciationEntry[] {
	return parsePronunciationResource(value, options);
}
