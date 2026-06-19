import assert from "node:assert/strict";
import {
	addAnnotation,
	addLayer,
	createDocument,
	selectAnnotations,
	validateTextDocument,
} from "@ismail-elkorchi/textdoc";
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
	lookupPronunciations,
	lookupTermbase,
	mergedLexiconFromPackAsync,
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

function textResourceReader(records: Readonly<Record<string, string>>) {
	return {
		readText({
			descriptor,
		}: {
			readonly descriptor: { readonly path: string };
		}): string {
			const text = records[descriptor.path];
			if (text === undefined) {
				throw new Error(`missing fixture resource ${descriptor.path}`);
			}
			return text;
		},
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

const canonicalLexiconText = JSON.stringify({
	schemaVersion: "1",
	kind: "lexicon",
	languageTag: "fr",
	resourceRefs: [{ resourceId: "fr-lexicon-rows", role: "entries" }],
});
const canonicalLexiconRows =
	"entryId\tform\tlemma\tlanguageTag\tpartOfSpeech\nfr-1\tparle\tparler\tfr\tVERB\n";
const morphologyText = JSON.stringify({
	schemaVersion: "1",
	kind: "morphology",
	morphologyId: "fr-morph",
	languageTag: "fr",
	resourceRefs: [
		{ resourceId: "fr-morph-analyzer", role: "analyzer" },
		{ resourceId: "fr-morph-generator", role: "generator" },
		{ resourceId: "fr-morph-morphemes", role: "morpheme-inventory" },
	],
});
const morphologyAnalyzerRows =
	"form\tlemma\tpartOfSpeech\tfeatureBundle\tentryId\nparle\tparler\tVERB\tV;IND;PRS;1;SG\tm1\n";
const morphologyGeneratorRows =
	"lemma\tform\tpartOfSpeech\tfeatureBundle\tentryId\nparler\tparle\tVERB\tV;IND;PRS;1;SG\tm1\n";
const morphologyMorphemeRows =
	"surface\tlexicalForm\tpartOfSpeech\tfeatureBundle\tentryId\nre\tre\tPREFIX\tmorpheme\tm2\n";
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
				format: "tsv",
				schemaId: "textlex.lexicon.rows.v1",
			},
			{
				id: "fr-morphology",
				kind: "morphology" as const,
				format: "json",
				schemaId: "textlex.morphology.v1",
			},
			{
				id: "fr-morph-analyzer",
				kind: "morphology" as const,
				format: "tsv",
				schemaId: "textlex.morphology.rows.v1",
			},
			{
				id: "fr-morph-generator",
				kind: "morphology" as const,
				format: "tsv",
				schemaId: "textlex.morphology.rows.v1",
			},
			{
				id: "fr-morph-morphemes",
				kind: "morphology" as const,
				format: "tsv",
				schemaId: "textlex.morphology.rows.v1",
			},
		],
		capabilitySlots: [
			{
				slot: "lexicon",
				status: "task-supported" as const,
				resourceIds: ["fr-lexicon"],
				bindings: [
					{
						role: "primary" as const,
						resourceId: "fr-lexicon",
						schemaId: "textlex.lexicon.v1",
						required: true,
						ownerPackage: "@ismail-elkorchi/textlex" as const,
					},
				],
			},
			{
				slot: "morphology",
				status: "task-supported" as const,
				resourceIds: ["fr-morphology"],
				bindings: [
					{
						role: "primary" as const,
						resourceId: "fr-morphology",
						schemaId: "textlex.morphology.v1",
						required: true,
						ownerPackage: "@ismail-elkorchi/textlex" as const,
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
			"resources/fr-lexicon.tsv",
			canonicalLexiconRows,
		),
		"fr-morphology": await fileBackedTextResource(
			"resources/fr-morphology.json",
			morphologyText,
		),
		"fr-morph-analyzer": await fileBackedTextResource(
			"resources/fr-morph-analyzer.tsv",
			morphologyAnalyzerRows,
		),
		"fr-morph-generator": await fileBackedTextResource(
			"resources/fr-morph-generator.tsv",
			morphologyGeneratorRows,
		),
		"fr-morph-morphemes": await fileBackedTextResource(
			"resources/fr-morph-morphemes.tsv",
			morphologyMorphemeRows,
		),
	},
};
const generatedReader = textResourceReader({
	"resources/fr-lexicon.json": canonicalLexiconText,
	"resources/fr-lexicon.tsv": canonicalLexiconRows,
	"resources/fr-morphology.json": morphologyText,
	"resources/fr-morph-analyzer.tsv": morphologyAnalyzerRows,
	"resources/fr-morph-generator.tsv": morphologyGeneratorRows,
	"resources/fr-morph-morphemes.tsv": morphologyMorphemeRows,
});
const mergedLexicon = await mergedLexiconFromPackAsync(generatedPack, {
	reader: generatedReader,
});
assert.equal(lookup(mergedLexicon, "parle")[0]?.canonical, "parler");
const morphology = await morphologyIndexFromPackAsync(generatedPack, {
	reader: generatedReader,
});
assert.equal(morphology.analyze("parle")[0]?.lemma, "parler");
assert.equal(morphology.generate("parler", { SG: "true" })[0]?.form, "parle");
assert.equal(morphology.analyze("re")[0]?.partOfSpeech, "PREFIX");
assert.equal(morphology.generate("re")[0]?.form, "re");
