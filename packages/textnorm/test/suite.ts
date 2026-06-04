import assert from "node:assert/strict";
import { createDocument, validateTextDocument } from "@ismail-elkorchi/textdoc";
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

const materialized = {
	...doc,
	views: { ...doc.views, [normalized.view.id]: normalized.view },
	spanMaps: { ...doc.spanMaps, [normalized.spanMap.id]: normalized.spanMap },
};
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
