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
	camelMorphologyFromPack,
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

const camelPack = {
	manifest: {
		resources: [
			{ id: "ar-msa-camel-morph-features", kind: "morphology" as const },
			{ id: "ar-msa-camel-morph-defaults", kind: "morphology" as const },
			{
				id: "ar-msa-camel-morph-tokenizations",
				kind: "segmentation-profile" as const,
			},
			{ id: "ar-msa-camel-morph-morphemes", kind: "morphology" as const },
			{
				id: "ar-msa-camel-morph-compatibility",
				kind: "morphology" as const,
			},
			{ id: "ar-msa-camel-morph-quality", kind: "quality-profile" as const },
		],
	},
	resources: {
		"ar-msa-camel-morph-features":
			"feature\tvalueCount\tvalues\npos\t1\tnoun\n",
		"ar-msa-camel-morph-defaults": "pos\tfeature\tvalue\nnoun\tcas\tn\n",
		"ar-msa-camel-morph-tokenizations": "order\tfield\n1\td3seg\n",
		"ar-msa-camel-morph-morphemes": [
			"section\tsurface\tcategory\tpos\tlex\tdiac\tbw\tgloss\troot\tpattern\tstem\tstemcat\tsource\td3seg\tatbseg\td3tok\tatbtok\tfeatures",
			"STEMS\tكتب\tS00001\tnoun\tكتاب\tكِتاب\tkitAb/NOUN\tbook\tكتب\tفِعال\tكتب\tN\tcamel\tكتب\tكتب\tكتب\tكتب\tcas:n gen:m num:s",
		].join("\n"),
		"ar-msa-camel-morph-compatibility":
			"table\tleftCategory\trightCategory\nAB\tP1\tS00001\n",
		"ar-msa-camel-morph-quality": '{"acceptedRecords":1}',
	},
};
const camel = camelMorphologyFromPack(camelPack);
assert.equal(camel.features[0]?.feature, "pos");
assert.equal(camel.lookupSurface("كتب")[0]?.category, "S00001");
assert.equal(camel.lookupCategory("S00001")[0]?.features.cas, "n");

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
