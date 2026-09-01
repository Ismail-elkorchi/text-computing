import assert from "node:assert/strict";
import {
	addViewWithSpanMap,
	createDocument,
	validateTextDocument,
} from "@ismail-elkorchi/textdoc";
import { buildLexicon } from "@ismail-elkorchi/textlex";
import {
	annotateNormalization,
	applyEditScript,
	buildConfusionTable,
	buildNormalizationProfile,
	buildSpellingMap,
	buildTransliterationMap,
	buildVariantGraph,
	candidateNormalizations,
	computeEditScript,
	createHistoricalView,
	createNormalizedView,
	historicalTargetViewKind,
	normalizationProfileFromPack,
	normalizationResourcesFromPack,
	normalizeDocument,
	spanMapFromEditScript,
	transliterationScriptPair,
	validateOcrConfidence,
	witnessReference,
} from "../dist/index.js";
import { allCandidateKinds } from "./fixtures/candidates.ts";
import {
	confusionTable,
	historicalMap,
	orthographyMap,
	punctuationMap,
	spacingMap,
	spellingMap,
	transliterationMap,
} from "./fixtures/resources.ts";

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
		packageName: "@ismail-elkorchi/textpack-norm-test",
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

await import("../dist/normalize/mod.js");
await import("../dist/variant/mod.js");
await import("../dist/noisy/mod.js");
await import("../dist/historical/mod.js");
await import("../dist/ocr/mod.js");
await import("../dist/transliteration/mod.js");
await import("../dist/spell/mod.js");
await import("../dist/view/mod.js");

const doc = createDocument("ye olde shoppe", { id: "doc" });
const spelling = candidateNormalizations(doc, {
	modes: ["spelling"],
	resources: { spellingMaps: [spellingMap] },
});
assert.deepEqual(
	spelling.map((candidate) => candidate.candidate),
	["old", "shop"],
);

const normalized = normalizeDocument(doc, {
	modes: ["spelling"],
	resources: { spellingMaps: [spellingMap] },
	targetViewId: "norm",
});
assert.equal(normalized.view.text, "ye old shop");
assert.equal(normalized.spanMap.targetViewId, "norm");
assert.equal(doc.views.norm, undefined);

const unicodeComposed = normalizeDocument(createDocument("e\u0301 olde"), {
	modes: ["spelling"],
	resources: { spellingMaps: [spellingMap] },
	unicodeForm: "NFC",
});
assert.equal(unicodeComposed.view.text, "é old");
assert.equal(
	unicodeComposed.spanMap.entries.at(-1)?.target.end,
	unicodeComposed.view.text.length,
);
assert.notEqual(
	unicodeComposed.view.transform?.optionsHash,
	normalizeDocument(createDocument("e\u0301 olde"), {
		modes: ["spelling"],
		resources: { spellingMaps: [spellingMap] },
		unicodeForm: "NFD",
	}).view.transform?.optionsHash,
);

const overlappingMap = buildSpellingMap(
	[
		{ source: "can not", candidates: ["cannot"], kind: "spacing" },
		{ source: "not", candidates: ["n't"], kind: "spacing" },
	],
	{ id: "overlap:test", kind: "spacing" },
);
assert.throws(
	() =>
		normalizeDocument(createDocument("can not"), {
			modes: ["spacing"],
			resources: { spacingMaps: [overlappingMap] },
			overlapPolicy: "all",
		}),
	/overlapPolicy "all" cannot apply overlapping/,
);
assert.equal(
	normalizeDocument(createDocument("can not"), {
		modes: ["spacing"],
		resources: { spacingMaps: [overlappingMap] },
		overlapPolicy: "longest",
	}).view.text,
	"cannot",
);

const materialized = addViewWithSpanMap(
	doc,
	normalized.view,
	normalized.spanMap,
);
assert.equal(validateTextDocument(materialized).ok, true);

const annotated = annotateNormalization(materialized, normalized);
assert.equal(validateTextDocument(annotated.document).ok, true);
assert.ok(annotated.layer.type.startsWith("view."));

const graph = buildVariantGraph(doc, {
	candidates: spelling,
	graphId: "variants",
});
assert.equal(graph.id, "variants");
assert.equal(Object.keys(graph.edges).length, 2);

const historicalDoc = createDocument("ye musick", { id: "historical" });
const historical = normalizeDocument(historicalDoc, {
	modes: ["historical"],
	resources: {
		historicalSpellingMaps: [historicalMap],
		orthographyMaps: [orthographyMap],
	},
	targetViewKind: "historical-normalized",
});
assert.equal(historical.view.text, "the music");
assert.equal(historicalTargetViewKind("lemma-oriented"), "morphological");
assert.equal(
	createHistoricalView(historicalDoc, "search-normalized", {
		modes: ["historical"],
		resources: { historicalSpellingMaps: [historicalMap] },
	}).view.kind,
	"search",
);

const ocr = normalizeDocument(createDocument("rnark"), {
	modes: ["ocr"],
	resources: { confusionTables: [confusionTable] },
	targetViewKind: "ocr-corrected",
});
assert.equal(ocr.view.text, "mark");
assert.equal(
	validateOcrConfidence({ sourceStart: 0, sourceEnd: 2, value: 0.8 }).value,
	0.8,
);
assert.equal(
	candidateNormalizations(createDocument("mork"), {
		modes: ["ocr"],
		resources: {
			lexicons: [buildLexicon([{ id: "mark", forms: ["mark"] }])],
		},
		maxEditDistance: 1,
	})[0]?.kind,
	"ocr",
);

const noisy = normalizeDocument(createDocument("Soooo GOOD line-\nbreak"), {
	modes: ["spelling", "spacing", "casing"],
	casePolicy: "casefold",
	repairLineBreakHyphenation: true,
	targetViewKind: "noisy-normalized",
});
assert.equal(noisy.view.text, "Soo good linebreak");

const punctuation = normalizeDocument(createDocument("“quote"), {
	modes: ["punctuation"],
	resources: { punctuationMaps: [punctuationMap] },
});
assert.equal(punctuation.view.text, '"quote');

const spacing = normalizeDocument(createDocument("can not"), {
	modes: ["spacing"],
	resources: { spacingMaps: [spacingMap] },
});
assert.equal(spacing.view.text, "cannot");

const dialect = normalizeDocument(createDocument("gonna"), {
	modes: ["dialect"],
	resources: {
		dialectMaps: [
			buildSpellingMap(
				[{ source: "gonna", candidates: ["going to"], kind: "dialect" }],
				{ id: "dialect:test", kind: "dialect" },
			),
		],
	},
});
assert.equal(dialect.view.text, "going to");

const transliteration = normalizeDocument(createDocument("salam"), {
	modes: ["transliteration"],
	resources: { transliterationMaps: [transliterationMap] },
	targetViewKind: "transliterated",
});
assert.equal(transliteration.view.text, "سلام");
assert.equal(
	transliterationScriptPair({
		sourceScript: "Latn",
		targetScript: "Arab",
		direction: "forward",
	}).targetScript,
	"Arab",
);

const script = computeEditScript("abc", "axbc");
assert.equal(applyEditScript(script), "axbc");
assert.equal(
	spanMapFromEditScript(script, { sourceViewId: "raw", targetViewId: "norm" })
		.entries[1]?.relation,
	"inserted",
);
assert.equal(
	createNormalizedView(createDocument("abc"), "abd", { sourceViewId: "raw" })
		.view.text,
	"abd",
);

assert.throws(
	() =>
		buildSpellingMap([
			{
				source: "bad",
				candidates: ["ok"],
				metadata: new Date() as unknown as Record<string, unknown>,
			},
		]),
	/I-JSON/,
);
assert.throws(
	() => buildConfusionTable([{ source: "x", replacement: "x" }]),
	/differ/,
);
assert.throws(
	() =>
		buildTransliterationMap([{ source: "", target: "x" }], {
			sourceScript: "Latn",
			targetScript: "Arab",
		}),
	/non-empty/,
);

const profile = buildNormalizationProfile({
	id: "profile",
	modes: ["historical"],
	languages: ["en", "en"],
	metadata: { ok: true },
});
assert.deepEqual(profile.languages, ["en"]);
assert.equal(
	witnessReference({ id: "w1", metadata: { siglum: "A" } }).id,
	"w1",
);

const kindSet = new Set(
	[
		...spelling,
		...candidateNormalizations(createDocument("rn"), {
			modes: ["ocr"],
			resources: { confusionTables: [confusionTable] },
		}),
		...candidateNormalizations(createDocument("gonna"), {
			modes: ["dialect"],
			resources: {
				dialectMaps: [
					buildSpellingMap(
						[{ source: "gonna", candidates: ["going to"], kind: "dialect" }],
						{ id: "dialect:test2", kind: "dialect" },
					),
				],
			},
		}),
		...candidateNormalizations(createDocument("salam"), {
			modes: ["transliteration"],
			resources: { transliterationMaps: [transliterationMap] },
		}),
		...candidateNormalizations(createDocument("“"), {
			modes: ["punctuation"],
			resources: { punctuationMaps: [punctuationMap] },
		}),
		...candidateNormalizations(createDocument("can not"), {
			modes: ["spacing"],
			resources: { spacingMaps: [spacingMap] },
		}),
		...candidateNormalizations(createDocument("LOUD"), {
			modes: ["casing"],
			casePolicy: "casefold",
		}),
		...candidateNormalizations(createDocument("ye"), {
			modes: ["historical"],
			resources: { historicalSpellingMaps: [historicalMap] },
		}),
	].map((candidate) => candidate.kind),
);
for (const kind of allCandidateKinds)
	assert.equal(kindSet.has(kind), true, kind);

const normalizationText =
	"kind\tsource\ttarget\nelision\tl'\tle\naccent\te\te\n";
const normalizationPack = {
	manifest: {
		id: "pack:norm:table",
		packageName: "@ismail-elkorchi/textpack-norm-table-test",
		targets: { languages: ["fr"] },
		resources: [
			{
				id: "normalization-fr-profile",
				kind: "normalization-profile" as const,
				format: "tsv",
				schemaId: "textnorm.rules.v1",
			},
		],
		capabilitySlots: [
			{
				slot: "normalization",
				status: "task-supported" as const,
				tier: "rule-based" as const,
				resourceIds: ["normalization-fr-profile"],
				bindings: [
					{
						role: "table" as const,
						resourceId: "normalization-fr-profile",
						schemaId: "textnorm.rules.v1",
						required: true,
					},
				],
			},
		],
	},
	resources: {
		"normalization-fr-profile": await fileBackedTextResource(
			"resources/normalization-fr.tsv",
			normalizationText,
		),
	},
};
const normalizationResources = await normalizationResourcesFromPack(
	normalizationPack,
	{
		reader: textResourceReader({
			"resources/normalization-fr.tsv": normalizationText,
		}),
	},
);
const normalizationPayload = normalizationResources[0]?.payload;
if (normalizationPayload?.type !== "table") {
	throw new Error("normalization resource should materialize as a table");
}
assert.deepEqual(normalizationPayload.value.rows[0], {
	kind: "elision",
	source: "l'",
	target: "le",
});

const normalizationProfileText = JSON.stringify({
	schemaVersion: "1",
	kind: "normalization-profile",
	profileId: "fr-search-normalization",
	languageTag: "fr",
	script: "Latn",
	unicodeNormalization: "NFC",
	rules: [
		{ ruleId: "unicode-nfc-compose", operation: "compose", priority: 10 },
		{ ruleId: "unicode-casefold", operation: "casefold", priority: 20 },
		{
			ruleId: "french-apostrophe-normalize",
			operation: "replace",
			input: "’",
			output: "'",
			priority: 30,
		},
		{
			ruleId: "french-accent-fold",
			operation: "strip-diacritic",
			priority: 40,
		},
	],
});
const normalizationProfilePack = {
	manifest: {
		id: "pack:norm:profile",
		packageName: "@ismail-elkorchi/textpack-norm-profile-test",
		targets: { languages: ["fr"] },
		resources: [
			{
				id: "fr-normalization-profile",
				kind: "normalization-profile" as const,
				format: "json",
				schemaId: "textnorm.profile.v1",
			},
		],
		capabilitySlots: [
			{
				slot: "normalization",
				status: "task-supported" as const,
				tier: "rule-based" as const,
				resourceIds: ["fr-normalization-profile"],
				bindings: [
					{
						role: "profile" as const,
						resourceId: "fr-normalization-profile",
						schemaId: "textnorm.profile.v1",
						required: true,
					},
				],
			},
		],
	},
	resources: {
		"fr-normalization-profile": await fileBackedTextResource(
			"resources/fr-normalization.json",
			normalizationProfileText,
		),
	},
};
const compiledNormalization = await normalizationProfileFromPack(
	normalizationProfilePack,
	{
		reader: textResourceReader({
			"resources/fr-normalization.json": normalizationProfileText,
		}),
	},
);
assert.equal(compiledNormalization.normalizeText("Été ’", "search"), "ete '");
assert.equal(compiledNormalization.normalizeText("Iİß", "search"), "iiss");
const normalizedView = compiledNormalization.searchView(
	createDocument("Été ’", { id: "doc:norm:profile" }),
);
assert.equal(normalizedView.view.text, "ete '");
assert.equal(normalizedView.spanMap.sourceViewId, "raw");
const customSourceView = compiledNormalization.searchView(
	createDocument("Été ’", {
		id: "doc:norm:custom-source-view",
		rawViewId: "source-text",
	}),
);
assert.equal(customSourceView.view.text, "ete '");
assert.equal(customSourceView.spanMap.sourceViewId, "source-text");
