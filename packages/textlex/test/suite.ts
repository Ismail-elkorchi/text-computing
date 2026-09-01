import assert from "node:assert/strict";
import {
	addAnnotation,
	addLayer,
	createDocument,
	selectAnnotations,
	validateTextDocument,
} from "@ismail-elkorchi/textdoc";
import { nfkcCaseFold } from "@ismail-elkorchi/textfacts/casefold";
import {
	annotateLexicon,
	buildAbbreviationTable,
	buildAffixTable,
	buildDawg,
	buildDictionary,
	buildDoubleArrayTrie,
	buildGazetteer,
	buildLexicon,
	buildMinimalPerfectHashMap,
	buildPronunciationLexicon,
	buildStoplist,
	buildTermbase,
	buildTokenPhraseIndex,
	buildTrie,
	buildWordlist,
	hasDawgKey,
	hasDoubleArrayTrieKey,
	hasStopword,
	hasTrieKey,
	hasWord,
	lexiconFromPack,
	lexiconFromPackAsync,
	lookup,
	lookupAbbreviation,
	lookupAffixes,
	lookupGazetteer,
	lookupManyFromPackAsync,
	lookupPronunciations,
	lookupTermbase,
	mergedLexiconFromPackAsync,
	morphologyAnalysesManyFromPackAsync,
	morphologyGenerationsFromPackAsync,
	morphologyIndexFromPackAsync,
	parseAffixTableResource,
	parseLexiconResource,
	parsePronunciationLexiconResource,
	phraseLookup,
} from "../dist/index.js";

async function sha256(text: string): Promise<string> {
	const bytes = new TextEncoder().encode(text);
	const digest = await crypto.subtle.digest("SHA-256", bytes);
	return [...new Uint8Array(digest)]
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("");
}

async function fileBackedTextResource(path: string, text: string) {
	return {
		kind: "file-backed-resource",
		packageName: "@ismail-elkorchi/textpack-lex-test",
		packageRoot: "file:///fixture/",
		path,
		encoding: "utf8",
		checksum: `sha256:${await sha256(text)}`,
		byteLength: new TextEncoder().encode(text).byteLength,
	} as const;
}

function textResourceReader(
	records: Readonly<Record<string, string>>,
	onRead?: (path: string) => void,
) {
	return {
		readText(
			{
				descriptor,
			}: {
				readonly descriptor: { readonly path: string };
			},
			range?: { readonly startByte: number; readonly endByte: number },
		): string {
			onRead?.(descriptor.path);
			const text = records[descriptor.path];
			if (text === undefined) {
				throw new Error(`missing fixture resource ${descriptor.path}`);
			}
			if (range === undefined) return text;
			return new TextDecoder("utf-8", { fatal: true }).decode(
				new TextEncoder().encode(text).slice(range.startByte, range.endByte),
			);
		},
	};
}

async function gzipBase64(text: string): Promise<string> {
	const bytes = new TextEncoder().encode(text);
	const compressed = new Uint8Array(
		await new Response(
			new Blob([bytes]).stream().pipeThrough(new CompressionStream("gzip")),
		).arrayBuffer(),
	);
	let binary = "";
	for (const byte of compressed) binary += String.fromCharCode(byte);
	return btoa(binary);
}

async function bucketedLookupIndex(
	text: string,
	keyColumns: readonly string[],
	emptyKeyColumns: readonly string[] = [],
) {
	const headerEnd = text.indexOf("\n");
	const columns = text.slice(0, headerEnd).split("\t");
	const rowsByKey = new Map<string, number[]>();
	const normalizedByRawKey = new Map<string, string>();
	const rowLines: string[] = [];
	let start = headerEnd + 1;
	let order = 0;
	while (start < text.length) {
		const newline = text.indexOf("\n", start);
		const end = newline === -1 ? text.length : newline;
		const row = text.slice(start, end);
		if (row.length > 0) {
			const cells = row.split("\t");
			rowLines.push(row);
			for (const column of keyColumns) {
				const value = cells[columns.indexOf(column)] ?? "";
				const values = column === "forms" ? value.split(/[|, ]/u) : [value];
				for (const candidate of values) {
					if (
						candidate === "-" ||
						(candidate.length === 0 && !emptyKeyColumns.includes(column))
					) {
						continue;
					}
					const key = `${column}\u0000${nfkcCaseFold(candidate)}`;
					rowsByKey.set(key, [...(rowsByKey.get(key) ?? []), order]);
					const rawKey = `${column}\u0000${candidate}`;
					normalizedByRawKey.set(rawKey, nfkcCaseFold(candidate));
				}
			}
			order += 1;
		}
		if (newline === -1) break;
		start = newline + 1;
	}
	const sortedKeyRows = [...rowsByKey].sort(([left], [right]) =>
		left < right ? -1 : left > right ? 1 : 0,
	);
	const keyText = `${sortedKeyRows
		.map(([key, rows]) => {
			let previous = 0;
			const deltas = [...new Set(rows)].map((row, index) => {
				const delta = index === 0 ? row : row - previous;
				previous = row;
				return delta.toString(36);
			});
			return `${key}\t${deltas.join(",")}`;
		})
		.join("\n")}\n`;
	const rowText = `${rowLines.join("\n")}\n`;
	const keyEncoded = await gzipBase64(keyText);
	const rowEncoded = await gzipBase64(rowText);
	const descriptor = async (offset: number, encoded: string, raw: string) => ({
		offset,
		length: encoded.length,
		textByteLength: new TextEncoder().encode(raw).byteLength,
		textChecksum: `sha256:${await sha256(raw)}`,
	});
	const patternGroups = new Map<
		string,
		{
			readonly column: string;
			readonly codePointLength: number;
			rows: string[];
		}
	>();
	for (const [scopedKey, normalized] of normalizedByRawKey) {
		const separator = scopedKey.indexOf("\u0000");
		const column = scopedKey.slice(0, separator);
		const key = scopedKey.slice(separator + 1);
		const codePointLength = Array.from(key).length;
		const groupKey = `${column}\u0000${String(codePointLength)}`;
		const group = patternGroups.get(groupKey) ?? {
			column,
			codePointLength,
			rows: [],
		};
		group.rows.push(`${key}\t${normalized === key ? "" : normalized}`);
		patternGroups.set(groupKey, group);
	}
	const patternPayloads = await Promise.all(
		[...patternGroups.values()]
			.sort(
				(left, right) =>
					left.column.localeCompare(right.column) ||
					left.codePointLength - right.codePointLength,
			)
			.map(async (group) => {
				const raw = `${group.rows.sort().join("\n")}\n`;
				return { ...group, raw, encoded: await gzipBase64(raw) };
			}),
	);
	let patternOffset = keyEncoded.length + rowEncoded.length;
	const patternBuckets = [];
	for (const payload of patternPayloads) {
		patternBuckets.push({
			column: payload.column,
			codePointLength: payload.codePointLength,
			...(await descriptor(patternOffset, payload.encoded, payload.raw)),
		});
		patternOffset += payload.encoded.length;
	}
	const directory = {
		bucketCount: 1,
		sourceRowCount: order,
		sourceColumns: columns,
		keyBuckets: [
			{
				firstKey: sortedKeyRows[0]?.[0] ?? "",
				lastKey: sortedKeyRows.at(-1)?.[0] ?? "",
				...(await descriptor(0, keyEncoded, keyText)),
			},
		],
		rowBuckets: [
			{
				firstRowOrder: 0,
				rowCount: order,
				...(await descriptor(keyEncoded.length, rowEncoded, rowText)),
			},
		],
		fuzzyBuckets: [],
		patternBuckets,
	};
	const indexHeader = `textpack.lookup-index.bucketed-rows.v1\n${JSON.stringify(directory)}\n`;
	const indexText = `${indexHeader}${keyEncoded}${rowEncoded}${patternPayloads.map((payload) => payload.encoded).join("")}`;
	const indexedResourceTextByteLength = new TextEncoder().encode(
		text,
	).byteLength;
	const lookupIndexShippedByteLength = new TextEncoder().encode(
		indexText,
	).byteLength;
	const maximumBucketByteLength = Math.max(
		keyEncoded.length,
		rowEncoded.length,
		...patternPayloads.map((payload) => payload.encoded.length),
	);
	return {
		text: indexText,
		keyColumns,
		emptyKeyColumns,
		fuzzyColumns: [] as readonly string[],
		patternColumns: keyColumns,
		bucketCount: 1,
		sourceRowCount: order,
		recordCount: rowsByKey.size,
		rowReferenceCount: [...rowsByKey.values()].reduce(
			(total, rows) => total + new Set(rows).size,
			0,
		),
		indexedResourceTextByteLength,
		lookupIndexShippedByteLength,
		lookupIndexHeaderByteLength: new TextEncoder().encode(indexHeader)
			.byteLength,
		lookupIndexHeaderChecksum: `sha256:${await sha256(indexHeader)}`,
		storageBudgetByteLength: Math.max(
			Math.ceil(indexedResourceTextByteLength * 1.3),
			indexedResourceTextByteLength + 32 * 1024,
		),
		storageSizeRatio:
			lookupIndexShippedByteLength / indexedResourceTextByteLength,
		maximumBucketByteLength,
	};
}

const baseEntries = [
	{
		id: "analysis",
		forms: ["analysis"],
		aliases: ["study"],
		variants: ["analyse"],
		inflectedForms: ["analyses"],
		canonical: "analysis",
		labels: ["noun"],
		features: { pos: "NOUN" },
		language: "en",
		script: "Latn",
		source: "test",
	},
	{
		id: "resume",
		forms: ["résumé"],
		canonical: "résumé",
		labels: ["noun"],
		language: "fr",
		script: "Latn",
	},
	{
		id: "new-york",
		forms: ["New York"],
		labels: ["place"],
		language: "en",
		script: "Latn",
	},
] as const;

await import("../dist/lexicon/mod.js");
await import("../dist/gazetteer/mod.js");
await import("../dist/term/mod.js");
await import("../dist/trie/mod.js");
await import("../dist/phrase/mod.js");
await import("../dist/fuzzy/mod.js");
await import("../dist/annotate/mod.js");

const lexicon = buildLexicon(baseEntries, { normalization: "NFC" });
assert.equal(lookup(lexicon, "analysis")[0]?.entryId, "analysis");
assert.equal(lookup(lexicon, "study")[0]?.entryId, "analysis");
assert.equal(lookup(lexicon, "resume").length, 0);
assert.equal(
	lookup(lexicon, "résumé", { mode: "normalized", normalization: "NFC" })[0]
		?.entryId,
	"resume",
);
assert.equal(
	lookup(lexicon, "ANALYSIS", {
		mode: "casefold",
		normalization: "NFC",
	})[0]?.entryId,
	"analysis",
);
assert.deepEqual(
	lookup(lexicon, "ana", { mode: "prefix" }).map((match) => match.form),
	["analyse", "analyses", "analysis"],
);
assert.deepEqual(
	lookup(lexicon, "ses", { mode: "suffix" }).map((match) => match.form),
	["analyses"],
);
assert.equal(
	lookup(lexicon, "analysos", { mode: "fuzzy", maxDistance: 1 })[0]?.entryId,
	"analysis",
);
assert.throws(
	() => buildLexicon([{ id: "bad", forms: ["x"], features: new Date() }]),
	/I-JSON/,
);
assert.throws(
	() =>
		buildLexicon([
			{ id: "dup", forms: ["x"] },
			{ id: "dup", forms: ["y"] },
		]),
	/duplicate/,
);

const dictionary = buildDictionary(baseEntries);
assert.equal(dictionary.id, "dictionary");

const phraseMatches = phraseLookup(lexicon, ["I", "visited", "New", "York"]);
assert.deepEqual(
	phraseMatches.map((match) => [
		match.entryId,
		match.tokenStart,
		match.tokenEnd,
	]),
	[["new-york", 2, 4]],
);
assert.deepEqual(phraseMatches[0]?.tokenForms, ["New", "York"]);
assert.equal(phraseMatches[0]?.matchedPhrase, "New York");
const spannedPhraseMatches = phraseLookup(lexicon, [
	"I",
	"visited",
	{
		text: "New",
		span: {
			viewId: "raw",
			span: { start: 10, end: 13, unit: "utf16-code-unit" },
		},
	},
	{
		text: "York",
		span: {
			viewId: "raw",
			span: { start: 14, end: 18, unit: "utf16-code-unit" },
		},
	},
]);
assert.deepEqual(spannedPhraseMatches[0]?.sourceSpans, [
	{
		viewId: "raw",
		span: { start: 10, end: 13, unit: "utf16-code-unit" },
	},
	{
		viewId: "raw",
		span: { start: 14, end: 18, unit: "utf16-code-unit" },
	},
]);
assert.deepEqual(
	phraseLookup(lexicon, ["new", "york"], { casefold: true }).map((match) => [
		match.entryId,
		match.tokenStart,
		match.tokenEnd,
	]),
	[["new-york", 0, 2]],
);
const phraseIndex = buildTokenPhraseIndex(baseEntries);
assert.ok(phraseIndex.maxLength >= 2);

const trie = buildTrie(["alpha", "alpine", "beta"]);
assert.equal(hasTrieKey(trie, "alpha"), true);
assert.equal(hasTrieKey(trie, "alp"), false);
const dat = buildDoubleArrayTrie(["alpha", "beta"]);
assert.equal(hasDoubleArrayTrieKey(dat, "beta"), true);
const dawg = buildDawg(["alpha", "alpine", "beta"]);
assert.equal(hasDawgKey(dawg, "alpine"), true);
const mph = buildMinimalPerfectHashMap(["alpha", "beta"]);
assert.equal(mph.assignments.alpha, 0);
assert.equal(mph.size, 2);

const gazetteer = buildGazetteer([
	{
		id: "acme",
		forms: ["Acme Corp"],
		entityType: "ORG",
		kbId: "kb:acme",
		priority: 10,
		aliases: ["Acme"],
		disambiguationHints: { country: "US" },
	},
]);
assert.equal(
	lookupGazetteer(gazetteer, "Acme", { entityType: "ORG" })[0]?.entry.kbId,
	"kb:acme",
);

const termbase = buildTermbase([
	{
		id: "force-majeure",
		forms: ["force majeure"],
		domains: ["legal"],
		termType: "doctrine",
	},
]);
assert.equal(
	lookupTermbase(termbase, "force majeure", { domain: "legal" })[0]?.entryId,
	"force-majeure",
);

const wordlist = buildWordlist(["The", "and"], { casefold: true });
assert.equal(hasWord(wordlist, "the"), true);
const stoplist = buildStoplist(["a", "an", "the"]);
assert.equal(hasStopword(stoplist, "the"), true);

const abbreviations = buildAbbreviationTable([
	{ form: "Dr.", expansions: ["Doctor"], language: "en" },
]);
assert.deepEqual(lookupAbbreviation(abbreviations, "Dr.")[0]?.expansions, [
	"Doctor",
]);

const affixes = buildAffixTable([
	{ id: "un", kind: "prefix", form: "un" },
	{ id: "ing", kind: "suffix", form: "ing" },
	{ id: "ge-t", kind: "circumfix", form: "ge", suffixForm: "t" },
]);
assert.deepEqual(
	lookupAffixes(affixes, "unhappy", { kind: "prefix" }).map(
		(match) => match.entry.id,
	),
	["un"],
);
assert.deepEqual(
	lookupAffixes(affixes, "gesagt", { kind: "circumfix" }).map(
		(match) => match.entry.id,
	),
	["ge-t"],
);

const pronunciations = buildPronunciationLexicon([
	{
		id: "read-present",
		form: "read",
		pronunciations: ["riːd"],
		notation: "ipa",
	},
	{
		id: "read-past",
		form: "read",
		pronunciations: ["rɛd"],
		notation: "ipa",
	},
]);
assert.deepEqual(
	lookupPronunciations(pronunciations, "read").map(
		(match) => match.pronunciation,
	),
	["rɛd", "riːd"],
);

assert.equal(parseLexiconResource("hello\tid:hello")[0]?.id, "id:hello");
assert.equal(parseAffixTableResource("prefix\tre")[0]?.kind, "prefix");
assert.equal(
	parsePronunciationLexiconResource("read\triːd\tipa")[0]?.pronunciations[0],
	"riːd",
);

const pack = {
	manifest: {
		resources: [
			{ id: "lexicon-en", kind: "lexicon" as const },
			{ id: "stop-en", kind: "stoplist" as const },
		],
	},
	resources: {
		"lexicon-en": "hello\tid:hello\n",
		"stop-en": "a\nthe\n",
	},
};
assert.equal(lexiconFromPack(pack, "lexicon-en").entries[0]?.id, "id:hello");
assert.equal(
	lexiconFromPack(pack, { kind: "stoplist" }).entries[0]?.forms[0],
	"a",
);

const asyncLexiconText = "bonjour\tid:bonjour\nsalut\tid:salut\n";
const asyncLexiconPack = {
	manifest: {
		resources: [{ id: "lexicon-fr", kind: "lexicon" as const }],
	},
	resources: {
		"lexicon-fr": await fileBackedTextResource(
			"resources/lexicon-fr.tsv",
			asyncLexiconText,
		),
	},
};
const asyncLexicon = await lexiconFromPackAsync(
	asyncLexiconPack,
	"lexicon-fr",
	{
		reader: textResourceReader({
			"resources/lexicon-fr.tsv": asyncLexiconText,
		}),
	},
);
assert.deepEqual(
	asyncLexicon.entries.map((entry) => entry.id),
	["id:bonjour", "id:salut"],
);

const doc = createDocument("Alice visited New York.", { id: "doc:lex" });
const existingLayer = addLayer(doc, {
	id: "tokens",
	type: "token.word",
	viewId: "raw",
	annotations: {},
});
const existing = addAnnotation(existingLayer, {
	id: "token:alice",
	layer: "tokens",
	type: "token.word",
	spans: [
		{
			viewId: "raw",
			span: { start: 0, end: 5, unit: "utf16-code-unit" },
		},
	],
	value: { text: "Alice" },
	evidence: {
		mode: "algorithm",
		exactness: "E1",
		producer: "test",
		packageName: "@ismail-elkorchi/test",
		packageVersion: "0.0.0",
		inputViewIds: ["raw"],
	},
});
const annotated = annotateLexicon(existing, lexicon, {
	resourceIds: ["lexicon-en"],
});
assert.deepEqual(
	existing.layers.tokens?.annotations["token:alice"]?.evidence,
	annotated.layers.tokens?.annotations["token:alice"]?.evidence,
);
assert.equal(validateTextDocument(annotated).ok, true);
assert.ok(selectAnnotations(annotated, { layer: "lexical" }).length > 0);

const casefoldAnnotated = annotateLexicon(
	createDocument("ANALYSIS", { id: "doc:lex:casefold" }),
	lexicon,
	{ matchOptions: { mode: "casefold", normalization: "NFC" } },
);
const casefoldAnnotations = selectAnnotations(casefoldAnnotated, {
	layer: "lexical",
});
assert.equal(casefoldAnnotations.length, 1);
assert.equal(casefoldAnnotations[0]?.spans[0]?.span.start, 0);
assert.equal(casefoldAnnotations[0]?.spans[0]?.span.end, 8);

const normalizedAnnotated = annotateLexicon(
	createDocument("résumé", { id: "doc:lex:normalized" }),
	lexicon,
	{ matchOptions: { mode: "normalized", normalization: "NFC" } },
);
const normalizedAnnotations = selectAnnotations(normalizedAnnotated, {
	layer: "lexical",
});
assert.equal(normalizedAnnotations.length, 1);
assert.equal(normalizedAnnotations[0]?.spans[0]?.span.start, 0);
assert.equal(normalizedAnnotations[0]?.spans[0]?.span.end, "résumé".length);

const canonicalLexiconRows =
	"entryId\tform\tlemma\tlanguageTag\tpartOfSpeech\nfr-1\tparle\tparler\tfr\tVERB\nfr-2\tStraße\tstrasse\tfr\tNOUN\n";
const canonicalLexiconIndex = await bucketedLookupIndex(canonicalLexiconRows, [
	"form",
	"lemma",
]);
const canonicalLexiconIndexText = canonicalLexiconIndex.text;
const canonicalLexiconText = JSON.stringify({
	schemaVersion: "1",
	kind: "lexicon",
	languageTag: "fr",
	resourceRefs: [
		{ resourceId: "fr-lexicon-rows", role: "entries" },
		{ resourceId: "fr-lexicon-rows-index", role: "lookup-index" },
	],
});
const morphologyText = JSON.stringify({
	schemaVersion: "1",
	kind: "morphology",
	morphologyId: "fr-morph",
	languageTag: "fr",
	resourceRefs: [
		{ resourceId: "fr-morph-paradigms", role: "paradigm-table" },
		{ resourceId: "fr-morph-paradigms-index", role: "lookup-index" },
	],
});
const morphologyParadigmRows =
	"form\tlemma\tpartOfSpeech\tfeatureBundle\tentryId\nparle\tparler\tVERB\tV;IND;PRS;1;SG\tm1\nparler\tparle\tVERB\tV;INF\tm-crossed\n";
const morphologyParadigmIndex = await bucketedLookupIndex(
	morphologyParadigmRows,
	["form", "lemma"],
);
const generatedPack = {
	manifest: {
		id: "pack:textlex-generated-fixture",
		packageName: "@ismail-elkorchi/textpack-textlex-generated-fixture",
		resources: [
			{
				id: "fr-lexicon",
				kind: "lexicon" as const,
				format: "json",
				schemaId: "textlex.lexicon.v1",
			},
			{
				id: "fr-lexicon-rows",
				kind: "lexicon" as const,
				path: "resources/fr-lexicon.indexed-table.v1.txt",
				format: "textpack-indexed-table-v1",
				schemaId: "textlex.morphology.rows.v1",
				metadata: { lookupIndexResourceId: "fr-lexicon-rows-index" },
			},
			{
				id: "fr-lexicon-rows-index",
				kind: "dataset" as const,
				path: "resources/fr-lexicon.indexed-table.v1.txt",
				format: "textpack-indexed-table-v1",
				schemaId: "textpack.lookup-index.v1",
				metadata: {
					indexFormat: "normalized-key-bucketed-rows-v1",
					indexedResourceId: "fr-lexicon-rows",
					indexedResourceSchemaId: "textlex.morphology.rows.v1",
					indexedResourceTextChecksum: `sha256:${await sha256(canonicalLexiconRows)}`,
					keyNormalization: "NFKC-casefold-Unicode-17",
					keyColumns: canonicalLexiconIndex.keyColumns,
					emptyKeyColumns: canonicalLexiconIndex.emptyKeyColumns,
					fuzzyColumns: canonicalLexiconIndex.fuzzyColumns,
					patternColumns: canonicalLexiconIndex.patternColumns,
					bucketCount: canonicalLexiconIndex.bucketCount,
					sourceRowCount: canonicalLexiconIndex.sourceRowCount,
					recordCount: canonicalLexiconIndex.recordCount,
					rowReferenceCount: canonicalLexiconIndex.rowReferenceCount,
					indexedResourceTextByteLength:
						canonicalLexiconIndex.indexedResourceTextByteLength,
					lookupIndexShippedByteLength:
						canonicalLexiconIndex.lookupIndexShippedByteLength,
					lookupIndexHeaderByteLength:
						canonicalLexiconIndex.lookupIndexHeaderByteLength,
					lookupIndexHeaderChecksum:
						canonicalLexiconIndex.lookupIndexHeaderChecksum,
					storageBudgetByteLength:
						canonicalLexiconIndex.storageBudgetByteLength,
					storageSizeRatio: canonicalLexiconIndex.storageSizeRatio,
					maximumBucketByteLength:
						canonicalLexiconIndex.maximumBucketByteLength,
				},
			},
			{
				id: "fr-morphology",
				kind: "morphology" as const,
				format: "json",
				schemaId: "textlex.morphology.v1",
			},
			{
				id: "fr-morph-paradigms",
				kind: "morphology" as const,
				path: "resources/fr-morph-paradigms.indexed-table.v1.txt",
				format: "textpack-indexed-table-v1",
				schemaId: "textlex.morphology.rows.v1",
				metadata: { lookupIndexResourceId: "fr-morph-paradigms-index" },
			},
			{
				id: "fr-morph-paradigms-index",
				kind: "dataset" as const,
				path: "resources/fr-morph-paradigms.indexed-table.v1.txt",
				format: "textpack-indexed-table-v1",
				schemaId: "textpack.lookup-index.v1",
				metadata: {
					indexFormat: "normalized-key-bucketed-rows-v1",
					indexedResourceId: "fr-morph-paradigms",
					indexedResourceSchemaId: "textlex.morphology.rows.v1",
					indexedResourceTextChecksum: `sha256:${await sha256(morphologyParadigmRows)}`,
					keyNormalization: "NFKC-casefold-Unicode-17",
					keyColumns: morphologyParadigmIndex.keyColumns,
					emptyKeyColumns: morphologyParadigmIndex.emptyKeyColumns,
					fuzzyColumns: morphologyParadigmIndex.fuzzyColumns,
					patternColumns: morphologyParadigmIndex.patternColumns,
					bucketCount: morphologyParadigmIndex.bucketCount,
					sourceRowCount: morphologyParadigmIndex.sourceRowCount,
					recordCount: morphologyParadigmIndex.recordCount,
					rowReferenceCount: morphologyParadigmIndex.rowReferenceCount,
					indexedResourceTextByteLength:
						morphologyParadigmIndex.indexedResourceTextByteLength,
					lookupIndexShippedByteLength:
						morphologyParadigmIndex.lookupIndexShippedByteLength,
					lookupIndexHeaderByteLength:
						morphologyParadigmIndex.lookupIndexHeaderByteLength,
					lookupIndexHeaderChecksum:
						morphologyParadigmIndex.lookupIndexHeaderChecksum,
					storageBudgetByteLength:
						morphologyParadigmIndex.storageBudgetByteLength,
					storageSizeRatio: morphologyParadigmIndex.storageSizeRatio,
					maximumBucketByteLength:
						morphologyParadigmIndex.maximumBucketByteLength,
				},
			},
		],
		capabilitySlots: [
			{
				slot: "lexicon",
				status: "task-supported" as const,
				tier: "lookup" as const,
				resourceIds: ["fr-lexicon"],
				bindings: [
					{
						role: "primary" as const,
						resourceId: "fr-lexicon",
						schemaId: "textlex.lexicon.v1",
						required: true,
					},
				],
			},
			{
				slot: "morphology",
				status: "task-supported" as const,
				tier: "lookup" as const,
				resourceIds: ["fr-morphology"],
				bindings: [
					{
						role: "primary" as const,
						resourceId: "fr-morphology",
						schemaId: "textlex.morphology.v1",
						required: true,
					},
				],
			},
		],
	},
	resources: {
		"fr-lexicon": await fileBackedTextResource(
			"resources/fr-lexicon.json",
			canonicalLexiconText,
		),
		"fr-lexicon-rows": await fileBackedTextResource(
			"resources/fr-lexicon.indexed-table.v1.txt",
			canonicalLexiconIndexText,
		),
		"fr-lexicon-rows-index": await fileBackedTextResource(
			"resources/fr-lexicon.indexed-table.v1.txt",
			canonicalLexiconIndexText,
		),
		"fr-morphology": await fileBackedTextResource(
			"resources/fr-morphology.json",
			morphologyText,
		),
		"fr-morph-paradigms": await fileBackedTextResource(
			"resources/fr-morph-paradigms.indexed-table.v1.txt",
			morphologyParadigmIndex.text,
		),
		"fr-morph-paradigms-index": await fileBackedTextResource(
			"resources/fr-morph-paradigms.indexed-table.v1.txt",
			morphologyParadigmIndex.text,
		),
	},
};
const generatedReader = textResourceReader({
	"resources/fr-lexicon.json": canonicalLexiconText,
	"resources/fr-lexicon.indexed-table.v1.txt": canonicalLexiconIndexText,
	"resources/fr-morphology.json": morphologyText,
	"resources/fr-morph-paradigms.indexed-table.v1.txt":
		morphologyParadigmIndex.text,
});
const mergedLexicon = await mergedLexiconFromPackAsync(generatedPack, {
	reader: generatedReader,
});
assert.equal(lookup(mergedLexicon, "parle")[0]?.canonical, "parler");
const staleSourceChecksumPack = {
	...generatedPack,
	manifest: {
		...generatedPack.manifest,
		resources: generatedPack.manifest.resources.map((resource) =>
			resource.id === "fr-lexicon-rows-index"
				? {
						...resource,
						metadata: {
							...resource.metadata,
							indexedResourceTextChecksum: `sha256:${"0".repeat(64)}`,
						},
					}
				: resource,
		),
	},
};
assert.equal(
	(
		await lookupManyFromPackAsync(staleSourceChecksumPack, ["parle"], {
			reader: textResourceReader({
				"resources/fr-lexicon.json": canonicalLexiconText,
				"resources/fr-lexicon.indexed-table.v1.txt": canonicalLexiconIndexText,
			}),
		})
	).get("parle")?.[0]?.canonical,
	"parler",
);
const malformedDataStart =
	canonicalLexiconIndexText.indexOf(
		"\n",
		canonicalLexiconIndexText.indexOf("\n") + 1,
	) + 1;
const malformedLexiconIndexText = `${canonicalLexiconIndexText.slice(0, malformedDataStart)}${canonicalLexiconIndexText[malformedDataStart] === "A" ? "B" : "A"}${canonicalLexiconIndexText.slice(malformedDataStart + 1)}`;
const malformedIndexPack = {
	...generatedPack,
	resources: {
		...generatedPack.resources,
		"fr-lexicon-rows-index": await fileBackedTextResource(
			"resources/fr-lexicon.indexed-table.v1.txt",
			malformedLexiconIndexText,
		),
	},
};
const malformedIndexReader = textResourceReader({
	"resources/fr-lexicon.json": canonicalLexiconText,
	"resources/fr-lexicon.indexed-table.v1.txt": malformedLexiconIndexText,
});
await assert.rejects(
	() =>
		lookupManyFromPackAsync(malformedIndexPack, ["parle"], {
			reader: malformedIndexReader,
		}),
	(error: unknown) => error instanceof TypeError,
);
const morphology = await morphologyIndexFromPackAsync(generatedPack, {
	reader: generatedReader,
});
assert.equal(morphology.analyze("parle")[0]?.lemma, "parler");
assert.equal(morphology.generate("parler", { SG: "true" })[0]?.form, "parle");
assert.deepEqual(morphology.generate("parler", { number: "SG" }), []);
const targetedReads: string[] = [];
const targetedReader = textResourceReader(
	{
		"resources/fr-lexicon.json": canonicalLexiconText,
		"resources/fr-lexicon.indexed-table.v1.txt": canonicalLexiconIndexText,
		"resources/fr-morphology.json": morphologyText,
		"resources/fr-morph-paradigms.indexed-table.v1.txt":
			morphologyParadigmIndex.text,
	},
	(path) => {
		targetedReads.push(path);
		if (path.endsWith(".tsv")) {
			throw new Error(`targeted lookup opened raw source ${path}`);
		}
	},
);
const targetedLexicon = await lookupManyFromPackAsync(
	generatedPack,
	["parle", "absent"],
	{ reader: targetedReader },
);
assert.equal(targetedLexicon.get("parle")?.[0]?.canonical, "parler");
assert.deepEqual(targetedLexicon.get("absent"), []);
const casefoldLexicon = await lookupManyFromPackAsync(
	generatedPack,
	["STRASSE"],
	{ reader: targetedReader },
);
assert.equal(casefoldLexicon.get("STRASSE")?.[0]?.canonical, "strasse");
assert.equal(
	(
		await lookupManyFromPackAsync(generatedPack, ["par"], {
			reader: targetedReader,
			mode: "prefix",
		})
	).get("par")?.[0]?.form,
	"parle",
);
assert.equal(
	(
		await lookupManyFromPackAsync(generatedPack, ["aße"], {
			reader: targetedReader,
			mode: "suffix",
		})
	).get("aße")?.[0]?.form,
	"Straße",
);
assert.equal(
	(
		await lookupManyFromPackAsync(generatedPack, ["parlf"], {
			reader: targetedReader,
			mode: "fuzzy",
			maxDistance: 1,
		})
	).get("parlf")?.[0]?.form,
	"parle",
);
const targetedMorphology = await morphologyAnalysesManyFromPackAsync(
	generatedPack,
	["parle", "parler", "absent"],
	{ reader: targetedReader },
);
assert.equal(targetedMorphology.get("parle")?.[0]?.lemma, "parler");
assert.equal(targetedMorphology.get("parler")?.[0]?.lemma, "parle");
assert.deepEqual(targetedMorphology.get("absent"), []);
const targetedGeneration = await morphologyGenerationsFromPackAsync(
	generatedPack,
	"PARLER",
	undefined,
	{ reader: targetedReader },
);
assert.deepEqual(
	targetedGeneration.map((generation) => generation.form),
	["parle"],
);
assert.deepEqual(
	await morphologyGenerationsFromPackAsync(
		generatedPack,
		"parler",
		{ number: "SG" },
		{ reader: targetedReader },
	),
	[],
);
assert.equal(
	targetedReads.some((path) => path.endsWith(".tsv")),
	false,
);

const camelMorphemeRows = [
	"section\tsurface\tsectionSurface\tcategory\tpartOfSpeech\tlexicalForm\tdiacritizedForm\tfeatureBundle",
	"PREFIXES\t\tPREFIXES:\tP0\t\t\t\tprc0:0 prc2:0",
	"PREFIXES\tال\tPREFIXES:ال\tPA\t\t\tٱل#\tprc0:Al_det prc2:0",
	"PREFIXES\tوال\tPREFIXES:وال\tPA\t\t\tوَٱل#\tprc0:Al_det prc2:wa_conj",
	"STEMS\tكتاب\tSTEMS:كتاب\tXV\tverb\tٱِكْتَأَب\tكْتَأَب\troot:ك.و.ب lex_logprob:-99",
	"STEMS\tكتاب\tSTEMS:كتاب\tXN\tnoun\tكِتَاب\tكِتَاب\troot:ك.ت.ب num:s lex_logprob:-8",
	"SUFFIXES\t\tSUFFIXES:\tS0\t\t\t\tenc0:0",
].join("\n");
const camelMorphemeIndex = await bucketedLookupIndex(camelMorphemeRows, [
	"sectionSurface",
	"lexicalForm",
]);
const camelCanonicalText = JSON.stringify({
	schemaVersion: "1",
	kind: "morphology",
	morphologyId: "ar-camel-fixture",
	languageTag: "ar",
	resourceRefs: [
		{ resourceId: "ar-camel-morphemes", role: "morpheme-inventory" },
		{ resourceId: "ar-camel-morphemes-index", role: "lookup-index" },
		{ resourceId: "ar-camel-compatibility", role: "compatibility-table" },
	],
});
const camelCompatibilityRows = [
	"table\tleftCategory\trightCategory",
	"AB\tP0\tXN",
	"AB\tPA\tXN",
	"BC\tXN\tS0",
	"AC\tP0\tS0",
	"AC\tPA\tS0",
].join("\n");
const camelPack = {
	manifest: {
		id: "pack:textlex-camel-fixture",
		packageName: "@ismail-elkorchi/textpack-textlex-camel-fixture",
		resources: [
			{
				id: "ar-camel-canonical",
				kind: "morphology" as const,
				format: "json",
				schemaId: "textlex.morphology.v1",
			},
			{
				id: "ar-camel-morphemes",
				kind: "morphology" as const,
				path: "resources/ar-camel-morphemes.indexed-table.v1.txt",
				format: "textpack-indexed-table-v1",
				schemaId: "textlex.morphology.rows.v1",
				metadata: { lookupIndexResourceId: "ar-camel-morphemes-index" },
			},
			{
				id: "ar-camel-compatibility",
				kind: "morphology" as const,
				format: "tsv",
				schemaId: "textlex.morphology.rows.v1",
			},
			{
				id: "ar-camel-morphemes-index",
				kind: "dataset" as const,
				path: "resources/ar-camel-morphemes.indexed-table.v1.txt",
				format: "textpack-indexed-table-v1",
				schemaId: "textpack.lookup-index.v1",
				metadata: {
					indexFormat: "normalized-key-bucketed-rows-v1",
					indexedResourceId: "ar-camel-morphemes",
					indexedResourceSchemaId: "textlex.morphology.rows.v1",
					indexedResourceTextChecksum: `sha256:${await sha256(camelMorphemeRows)}`,
					keyNormalization: "NFKC-casefold-Unicode-17",
					keyColumns: camelMorphemeIndex.keyColumns,
					emptyKeyColumns: camelMorphemeIndex.emptyKeyColumns,
					fuzzyColumns: camelMorphemeIndex.fuzzyColumns,
					patternColumns: camelMorphemeIndex.patternColumns,
					bucketCount: camelMorphemeIndex.bucketCount,
					sourceRowCount: camelMorphemeIndex.sourceRowCount,
					recordCount: camelMorphemeIndex.recordCount,
					rowReferenceCount: camelMorphemeIndex.rowReferenceCount,
					indexedResourceTextByteLength:
						camelMorphemeIndex.indexedResourceTextByteLength,
					lookupIndexShippedByteLength:
						camelMorphemeIndex.lookupIndexShippedByteLength,
					lookupIndexHeaderByteLength:
						camelMorphemeIndex.lookupIndexHeaderByteLength,
					lookupIndexHeaderChecksum:
						camelMorphemeIndex.lookupIndexHeaderChecksum,
					storageBudgetByteLength: camelMorphemeIndex.storageBudgetByteLength,
					storageSizeRatio: camelMorphemeIndex.storageSizeRatio,
					maximumBucketByteLength: camelMorphemeIndex.maximumBucketByteLength,
				},
			},
		],
		capabilitySlots: [
			{
				slot: "morphology",
				status: "task-supported" as const,
				tier: "rule-based" as const,
				resourceIds: ["ar-camel-canonical"],
				bindings: [
					{
						role: "primary" as const,
						resourceId: "ar-camel-canonical",
						schemaId: "textlex.morphology.v1",
						required: true,
					},
				],
			},
		],
	},
	resources: {
		"ar-camel-canonical": await fileBackedTextResource(
			"resources/ar-camel.json",
			camelCanonicalText,
		),
		"ar-camel-morphemes": await fileBackedTextResource(
			"resources/ar-camel-morphemes.indexed-table.v1.txt",
			camelMorphemeIndex.text,
		),
		"ar-camel-compatibility": await fileBackedTextResource(
			"resources/ar-camel-compatibility.tsv",
			camelCompatibilityRows,
		),
		"ar-camel-morphemes-index": await fileBackedTextResource(
			"resources/ar-camel-morphemes.indexed-table.v1.txt",
			camelMorphemeIndex.text,
		),
	},
};
const camelReads = new Map<string, number>();
const camelReader = {
	readText(
		{ descriptor }: { readonly descriptor: { readonly path: string } },
		range?: { readonly startByte: number; readonly endByte: number },
	) {
		camelReads.set(descriptor.path, (camelReads.get(descriptor.path) ?? 0) + 1);
		const records: Readonly<Record<string, string>> = {
			"resources/ar-camel.json": camelCanonicalText,
			"resources/ar-camel-morphemes.indexed-table.v1.txt":
				camelMorphemeIndex.text,
			"resources/ar-camel-compatibility.tsv": camelCompatibilityRows,
		};
		const text = records[descriptor.path];
		if (text === undefined) throw new Error(`missing ${descriptor.path}`);
		if (range === undefined) return text;
		return new TextDecoder("utf-8", { fatal: true }).decode(
			new TextEncoder().encode(text).slice(range.startByte, range.endByte),
		);
	},
};
const composedCamel = await morphologyAnalysesManyFromPackAsync(
	camelPack,
	["كتاب", "الكتاب", "والكتاب"],
	{ reader: camelReader },
);
const camelMorphemeReadCount =
	camelReads.get("resources/ar-camel-morphemes.indexed-table.v1.txt") ?? 0;
assert.ok(camelMorphemeReadCount > 1);
assert.equal(composedCamel.get("كتاب")?.[0]?.lemma, "كِتَاب");
assert.equal(composedCamel.get("كتاب")?.[0]?.features.lex_logprob, "-8");
for (const form of ["الكتاب", "والكتاب"]) {
	const analysis = composedCamel.get(form)?.[0];
	assert.equal(analysis?.form, form);
	assert.equal(analysis?.lemma, "كِتَاب");
	assert.equal(analysis?.features.stemSurface, "كتاب");
}
assert.equal(composedCamel.get("والكتاب")?.[0]?.features.prefixSurface, "وال");
assert.deepEqual(
	(
		await morphologyGenerationsFromPackAsync(camelPack, "كِتَاب", undefined, {
			reader: camelReader,
		})
	).map((generation) => generation.form),
	["كتاب"],
);
await morphologyAnalysesManyFromPackAsync(camelPack, ["الكتاب"], {
	reader: camelReader,
});
assert.equal(
	camelReads.get("resources/ar-camel-morphemes.indexed-table.v1.txt"),
	camelMorphemeReadCount,
);
assert.equal(camelReads.get("resources/ar-camel-compatibility.tsv"), 1);
