import { deepFreeze, orderedRecord } from "../internal/freeze.js";
import { assertJsonRecord } from "../internal/json.js";
import { keyForText } from "../internal/normalize.js";
import {
	optionalString,
	optionalStringArray,
	requireNonEmptyString,
} from "../internal/records.js";
import { buildTokenPhraseIndex } from "../phrase/index.js";
import {
	buildDawg,
	buildDoubleArrayTrie,
	buildMinimalPerfectHashMap,
	buildTrie,
} from "../trie/mod.js";
import type {
	LexicalEntry,
	Lexicon,
	LexiconFormRef,
	LexiconIndex,
	LexiconOptions,
} from "./types.js";

function assertForms(
	forms: readonly string[],
	path: string,
): readonly string[] {
	if (!Array.isArray(forms) || forms.length === 0) {
		throw new TypeError(`${path} must contain at least one form.`);
	}
	for (let index = 0; index < forms.length; index += 1) {
		requireNonEmptyString(forms[index], `${path}[${index}]`);
	}
	return Object.freeze([...forms]);
}

function normalizeEntry<TEntry extends LexicalEntry>(
	entry: TEntry,
	index: number,
	options: LexiconOptions,
): TEntry {
	requireNonEmptyString(entry.id, `entries[${index}].id`);
	const forms = assertForms(entry.forms, `entries[${index}].forms`);
	const labels = optionalStringArray(entry.labels, `entries[${index}].labels`);
	const aliases = optionalStringArray(
		entry.aliases,
		`entries[${index}].aliases`,
	);
	const variants = optionalStringArray(
		entry.variants,
		`entries[${index}].variants`,
	);
	const inflectedForms = optionalStringArray(
		entry.inflectedForms,
		`entries[${index}].inflectedForms`,
	);
	if (entry.features !== undefined) {
		assertJsonRecord(entry.features, `entries[${index}].features`);
	}
	const normalized = {
		...entry,
		forms,
		...(entry.canonical !== undefined
			? {
					canonical: optionalString(
						entry.canonical,
						`entries[${index}].canonical`,
					),
				}
			: {}),
		...(labels !== undefined ? { labels } : {}),
		...(entry.features !== undefined ? { features: entry.features } : {}),
		language: entry.language ?? options.language,
		script: entry.script ?? options.script,
		source: entry.source ?? options.source,
		...(aliases !== undefined ? { aliases } : {}),
		...(variants !== undefined ? { variants } : {}),
		...(inflectedForms !== undefined ? { inflectedForms } : {}),
	};
	return deepFreeze(normalized) as TEntry;
}

function entryForms(entry: LexicalEntry): readonly {
	form: string;
	sourceKind: LexiconFormRef["sourceKind"];
}[] {
	const output: { form: string; sourceKind: LexiconFormRef["sourceKind"] }[] =
		[];
	for (const form of entry.forms) output.push({ form, sourceKind: "form" });
	for (const form of entry.aliases ?? [])
		output.push({ form, sourceKind: "alias" });
	for (const form of entry.variants ?? [])
		output.push({ form, sourceKind: "variant" });
	for (const form of entry.inflectedForms ?? []) {
		output.push({ form, sourceKind: "inflected" });
	}
	const seen = new Set<string>();
	return Object.freeze(
		output.filter((item) => {
			const key = `${item.sourceKind}\u0000${item.form}`;
			if (seen.has(key)) return false;
			seen.add(key);
			return true;
		}),
	);
}

function pushIndexValue(
	index: Record<string, LexiconFormRef[]>,
	key: string,
	value: LexiconFormRef,
): void {
	const values = Object.hasOwn(index, key) ? (index[key] ?? []) : [];
	values.push(value);
	index[key] = values;
}

function freezeIndexRecord(
	record: Record<string, LexiconFormRef[]>,
): Readonly<Record<string, readonly LexiconFormRef[]>> {
	const frozen: Record<string, readonly LexiconFormRef[]> = {};
	for (const [key, values] of Object.entries(record)) {
		frozen[key] = Object.freeze([...values]);
	}
	return orderedRecord(frozen);
}

function buildIndex(
	entries: readonly LexicalEntry[],
	options: LexiconOptions,
): LexiconIndex {
	const exact: Record<string, LexiconFormRef[]> = Object.create(null);
	const normalized: Record<string, LexiconFormRef[]> = Object.create(null);
	const casefolded: Record<string, LexiconFormRef[]> = Object.create(null);
	const duplicateFormKeys = new Set<string>();
	for (let entryIndex = 0; entryIndex < entries.length; entryIndex += 1) {
		const entry = entries[entryIndex];
		if (entry === undefined) continue;
		const forms = entryForms(entry);
		for (let formIndex = 0; formIndex < forms.length; formIndex += 1) {
			const item = forms[formIndex];
			if (item === undefined) continue;
			const ref: LexiconFormRef = deepFreeze({
				entryId: entry.id,
				form: item.form,
				key: item.form,
				sourceKind: item.sourceKind,
				entryIndex,
				formIndex,
			});
			if (options.duplicateFormPolicy === "reject") {
				const duplicateKey = item.form;
				if (duplicateFormKeys.has(duplicateKey)) {
					throw new TypeError(`duplicate lexical form: ${duplicateKey}`);
				}
				duplicateFormKeys.add(duplicateKey);
			}
			pushIndexValue(exact, item.form, ref);
			pushIndexValue(
				normalized,
				keyForText(item.form, {
					normalization: options.normalization ?? "NFC",
				}),
				ref,
			);
			pushIndexValue(
				casefolded,
				keyForText(item.form, {
					normalization: options.normalization ?? "NFC",
					casefold: true,
				}),
				ref,
			);
		}
	}
	const keys = Object.freeze(
		Object.keys(exact).sort((left, right) => left.localeCompare(right)),
	);
	return deepFreeze({
		exact: freezeIndexRecord(exact),
		normalized: freezeIndexRecord(normalized),
		casefold: freezeIndexRecord(casefolded),
		keys,
		trie: buildTrie(keys),
		doubleArrayTrie: buildDoubleArrayTrie(keys),
		dawg: buildDawg(keys),
		minimalPerfectHash: buildMinimalPerfectHashMap(keys),
		phrase: buildTokenPhraseIndex(entries),
	});
}

export function buildLexicon<TEntry extends LexicalEntry>(
	entries: Iterable<TEntry>,
	options: LexiconOptions = {},
): Lexicon<TEntry> {
	const duplicateIdPolicy = options.duplicateIdPolicy ?? "reject";
	const normalizedEntries = [...entries].map((entry, index) =>
		normalizeEntry(entry, index, options),
	);
	const ids = new Set<string>();
	for (const entry of normalizedEntries) {
		if (ids.has(entry.id) && duplicateIdPolicy === "reject") {
			throw new TypeError(`duplicate lexical entry id: ${entry.id}`);
		}
		ids.add(entry.id);
	}
	const sorted = Object.freeze(
		[...normalizedEntries].sort((left, right) =>
			left.id.localeCompare(right.id),
		),
	);
	return deepFreeze({
		id: options.id ?? "lexicon",
		entries: sorted,
		index: buildIndex(sorted, options),
	});
}

export function buildDictionary(
	entries: Iterable<LexicalEntry>,
	options: LexiconOptions = {},
): Lexicon<LexicalEntry> {
	return buildLexicon(entries, { id: options.id ?? "dictionary", ...options });
}
