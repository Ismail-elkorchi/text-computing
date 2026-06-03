import {
	addAnnotation,
	addLayer,
	createDocument,
	type Annotation,
	type TokenValue,
} from "@ismail-elkorchi/textdoc";
import {
	analyzePosMorphLemmaDocument,
	runTextRules,
	type TextRulesCompiledRuleBundleV1,
	type TextRulesLexiconResource,
} from "../src/index.ts";

const originalEvidence = {
	mode: "manual" as const,
	exactness: "E3" as const,
	producer: "fixture",
	packageName: "fixture-package",
	packageVersion: "1.0.0",
	inputViewIds: ["raw"],
};

const token: Annotation<TokenValue> = {
	id: "token-1",
	layer: "tokens",
	type: "token.word",
	spans: [
		{
			viewId: "raw",
			span: { start: 0, end: 5, unit: "utf16-code-unit" },
		},
	],
	value: { index: 0, text: "Alice" },
	features: { keep: true },
	evidence: originalEvidence,
	alternatives: [
		{
			value: { index: 0, text: "ALICE" },
			evidence: originalEvidence,
			score: { kind: "rank", value: 2 },
		},
	],
};

const document = addAnnotation(
	addLayer(createDocument("Alice", { id: "doc:alice" }), {
		id: "tokens",
		type: "token.word",
		viewId: "raw",
		annotations: {},
	}),
	token,
);

const lexicon: TextRulesLexiconResource = {
	packId: "pack",
	packageName: "fixture-pack",
	version: "1.0.0",
	resourceId: "lexicon",
	lookupKey: "surface",
	overlayPrecedence: 0,
	entries: [
		{
			surface: "Alice",
			analyses: [{ ruleId: "alice", pos: "PROPN", lemma: "Alice" }],
		},
	],
};

const analyzed = analyzePosMorphLemmaDocument(
	{ document, tokenLayerId: "tokens" },
	[lexicon],
).document;
const preserved = analyzed.layers.tokens?.annotations["token-1"];

if (analyzed.layers.tokens?.type !== "token.word") {
	throw new Error("textrules should preserve final token layer type");
}
if (preserved?.evidence.packageName !== "fixture-package") {
	throw new Error("textrules should preserve existing annotation evidence");
}
if (preserved?.features?.keep !== true) {
	throw new Error("textrules should preserve existing annotation features");
}
if (preserved?.alternatives?.length !== 1) {
	throw new Error("textrules should preserve existing annotation alternatives");
}

const compiled: TextRulesCompiledRuleBundleV1 = {
	schemaVersion: 1,
	bundleId: "bundle:rewrite",
	compiledId: "compiled:rewrite",
	namespace: "rewrite",
	conflictPolicy: "emit-all",
	resourceIds: [],
	rules: [
		{
			id: "rewrite-alice",
			kind: "rewrite",
			namespace: "rewrite",
			priority: 1,
			when: {
				pattern: {
					ruleId: "rewrite-alice",
					atoms: [{ kind: "literal", value: "Alice" }],
				},
			},
			rewrite: {
				targetViewId: "normalized",
				replacement: ["Alicia"],
			},
		},
	],
};

const rewritten = runTextRules(
	{
		schemaVersion: 1,
		documentId: "doc:rewrite",
		revision: "r1",
		textLengthCU: 5,
		text: "Alice",
		source: { id: "source" },
		units: { text: "utf16-code-unit" },
		views: [{ id: "source-view", kind: "raw", text: "Alice" }],
		spanMaps: [],
		layers: [
			{
				id: "tokens",
				kind: "token",
				viewId: "source-view",
				annotations: [
					{
						id: "token-1",
						kind: "token",
						tokenKind: "lexical-token",
						lifecycle: { state: "active" },
						targets: [
							{
								kind: "span",
								viewId: "source-view",
								startCU: 0,
								endCU: 5,
							},
						],
						text: "Alice",
					},
				],
			},
		],
	} as never,
	compiled,
);

if (rewritten.document.views.normalized?.text !== "Alicia") {
	throw new Error("textrules rewrite views must carry replacement text");
}
if (rewritten.document.layers.tokens?.type !== "token.word") {
	throw new Error("textrules-generated token layers must use final token type");
}
