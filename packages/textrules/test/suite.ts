import assert from "node:assert/strict";
import {
	type Annotation,
	addAnnotation,
	addGraph,
	addLayer,
	createDocument,
	type TextDocument,
	validateTextDocument,
} from "@ismail-elkorchi/textdoc";
import {
	applyRules,
	checkAgreement,
	compileRuleSet,
	createRuleProcessor,
	matchRules,
	RuleEntityRecognizer,
	type RuleSet,
	RuleTokenizer,
	rewriteView,
	validateGrammar,
} from "../dist/index.js";

const manualEvidence = {
	mode: "manual" as const,
	exactness: "E3" as const,
	producer: "fixture",
	packageName: "fixture-package",
	packageVersion: "1.0.0",
	inputViewIds: ["raw"],
};

function tokenDocument(): TextDocument {
	const token: Annotation = {
		id: "token-1",
		layer: "tokens",
		type: "token.word",
		spans: [
			{
				viewId: "raw",
				span: { start: 0, end: 5, unit: "utf16-code-unit" },
			},
		],
		value: { index: 0, text: "Alice", lemma: "Alice", pos: "PROPN" },
		features: { keep: true },
		evidence: manualEvidence,
		alternatives: [
			{
				value: { index: 0, text: "ALICE" },
				evidence: manualEvidence,
				score: { kind: "rank", value: 2 },
			},
		],
	};
	return addAnnotation(
		addLayer(createDocument("Alice founded Acme.", { id: "doc:alice" }), {
			id: "tokens",
			type: "token.word",
			viewId: "raw",
			annotations: {},
		}),
		token,
	);
}

const entityRules: RuleSet = {
	id: "rules:entity",
	version: "1.0.0",
	rules: [
		{
			id: "entity:alice",
			when: { kind: "token", text: "Alice", capture: "name" },
			action: [
				{
					kind: "annotate",
					layerId: "entities",
					layerType: "entity.mention",
					value: { label: "PER" },
				},
			],
		},
	],
};

const compiled = compileRuleSet(entityRules);
const matches = matchRules(tokenDocument(), compiled);
assert.equal(matches.length, 1);
assert.equal(matches[0]?.captures.name?.annotationIds?.[0], "token-1");

const applied = applyRules(tokenDocument(), compiled);
assert.equal(validateTextDocument(applied).ok, true);
assert.equal(applied.layers.entities?.type, "entity.mention");
const preserved = applied.layers.tokens?.annotations["token-1"];
assert.equal(preserved?.features?.keep, true);
assert.equal(preserved?.evidence.packageName, "fixture-package");
assert.equal(preserved?.alternatives?.length, 1);

const rewriteRules = compileRuleSet({
	id: "rules:rewrite",
	version: "1.0.0",
	rules: [
		{
			id: "rewrite:alice",
			when: { kind: "char", text: "Alice" },
			action: [
				{
					kind: "rewrite",
					targetViewId: "normalized",
					replacements: { Alice: "Alicia" },
				},
			],
		},
	],
});
const rewritten = rewriteView(tokenDocument(), rewriteRules);
assert.equal(rewritten.views.normalized?.text, "Alicia founded Acme.");
assert.equal(rewritten.views.normalized?.spanMapId, "normalized:span-map");
assert.deepEqual(
	rewritten.spanMaps["normalized:span-map"]?.entries.map(
		(entry) => entry.relation,
	),
	["expanded", "identity"],
);

const multiRewritten = rewriteView(
	tokenDocument(),
	compileRuleSet({
		id: "rules:multi-rewrite",
		version: "1.0.0",
		rules: [
			{
				id: "rewrite:names",
				when: { kind: "char", text: "Alice" },
				action: [
					{
						kind: "rewrite",
						targetViewId: "multi-normalized",
						replacements: { Alice: "A", Acme: "Company" },
					},
				],
			},
		],
	}),
);
assert.equal(
	multiRewritten.views["multi-normalized"]?.text,
	"A founded Company.",
);
assert.deepEqual(
	multiRewritten.spanMaps["multi-normalized:span-map"]?.entries.map(
		(entry) => entry.relation,
	),
	["contracted", "identity", "expanded", "identity"],
);

const replacedSpan = rewriteView(
	tokenDocument(),
	compileRuleSet({
		id: "rules:replacement",
		version: "1.0.0",
		rules: [
			{
				id: "rewrite:span",
				when: { kind: "char", text: "Alice" },
				action: [
					{
						kind: "rewrite",
						targetViewId: "alias",
						replacement: "Alicia",
					},
				],
			},
		],
	}),
);
assert.equal(replacedSpan.views.alias?.text, "Alicia founded Acme.");

const sequenceMatches = matchRules(
	tokenDocument(),
	compileRuleSet({
		id: "rules:sequence",
		version: "1.0.0",
		rules: [
			{
				id: "sequence:combinations",
				when: {
					kind: "sequence",
					patterns: [
						{ kind: "char", pattern: "Alice|Acme" },
						{ kind: "char", pattern: "founded|Acme" },
					],
				},
				action: [{ kind: "feature", name: "sequence", value: true }],
			},
		],
	}),
);
assert.equal(sequenceMatches.length, 2);

const priorityMatches = matchRules(
	tokenDocument(),
	compileRuleSet(
		{
			id: "rules:conflicts",
			version: "1.0.0",
			rules: [
				{
					id: "lower",
					priority: 1,
					when: { kind: "char", text: "Alice" },
					action: [{ kind: "feature", name: "lower", value: true }],
				},
				{
					id: "higher",
					priority: 2,
					when: { kind: "char", text: "Alice" },
					action: [{ kind: "feature", name: "higher", value: true }],
				},
			],
		},
		{ conflictPolicy: "priority" },
	),
);
assert.deepEqual(
	priorityMatches.map((match) => match.ruleId),
	["higher"],
);

const tokenized = applyRules(
	createDocument("Alice founded Acme.", { id: "doc:tokenize" }),
	compileRuleSet({
		id: "rules:tokenize",
		version: "1.0.0",
		rules: [
			{
				id: "tokenize",
				when: { kind: "char", pattern: "\\S+" },
				action: [{ kind: "retokenize", layerId: "tokens" }],
			},
		],
	}),
);
assert.equal(tokenized.layers.tokens?.type, "token.word");
assert.equal(Object.keys(tokenized.layers.tokens?.annotations ?? {}).length, 3);

const cascaded = applyRules(
	tokenDocument(),
	compileRuleSet({
		id: "rules:cascade",
		version: "1.0.0",
		rules: [
			{
				id: "entity:first",
				phase: "first",
				when: { kind: "token", text: "Alice" },
				action: [
					{
						kind: "annotate",
						layerId: "entities",
						layerType: "entity.mention",
						value: { label: "PER" },
					},
				],
			},
			{
				id: "diagnostic:second",
				phase: "second",
				when: { kind: "annotation", type: "entity.mention" },
				action: [
					{
						kind: "diagnostic",
						code: "cascade.seen",
						message: "cascade saw entity",
					},
				],
			},
		],
	}),
);
assert.equal(
	Object.values(cascaded.layers["rule.diagnostics"]?.annotations ?? {})[0]
		?.value.code,
	"cascade.seen",
);

const graphDoc = addGraph(applied, {
	id: "deps",
	kind: "dependency",
	nodes: {
		n1: { id: "n1", annotationId: "token-1", layerId: "tokens" },
		n2: {
			id: "n2",
			annotationId:
				Object.keys(applied.layers.entities?.annotations ?? {})[0] ?? "",
			layerId: "entities",
		},
	},
	edges: { e1: { id: "e1", source: "n1", target: "n2", relation: "mentions" } },
});
assert.equal(
	matchRules(
		graphDoc,
		compileRuleSet({
			id: "rules:dependency",
			version: "1.0.0",
			rules: [
				{
					id: "dep",
					when: { kind: "dependency", relation: "mentions", capture: "edge" },
					action: [{ kind: "diagnostic", code: "seen", message: "seen" }],
				},
			],
		}),
	).length,
	1,
);

const entityId =
	Object.keys(applied.layers.entities?.annotations ?? {})[0] ?? "";
const graphUpdated = applyRules(
	graphDoc,
	compileRuleSet({
		id: "rules:graph",
		version: "1.0.0",
		rules: [
			{
				id: "graph:add-edge",
				when: { kind: "char", text: "Alice" },
				action: [
					{
						kind: "graph",
						graphId: "deps",
						graphKind: "link",
						relation: "related",
						sourceAnnotationId: "token-1",
						targetAnnotationId: entityId,
					},
				],
			},
		],
	}),
);
assert.equal(graphUpdated.graphs.deps?.kind, "dependency");

const processor = createRuleProcessor(compiled, {
	id: "processor:entity",
	producedLayers: ["entities"],
});
assert.equal(processor.packageName, "@ismail-elkorchi/textrules");
assert.equal(
	(processor.process(tokenDocument()) as TextDocument).layers.entities?.type,
	"entity.mention",
);
assert.equal(RuleEntityRecognizer.create(compiled).kind, "entity-recognizer");
assert.equal(RuleTokenizer.create(compiled).kind, "tokenizer");

const agreement = checkAgreement(
	{
		id: "a",
		layer: "x",
		type: "x",
		spans: [],
		features: { number: "sing" },
		evidence: manualEvidence,
	},
	{
		id: "b",
		layer: "x",
		type: "x",
		spans: [],
		features: { number: "plur" },
		evidence: manualEvidence,
	},
	["number"],
);
assert.equal(agreement.ok, false);

assert.throws(() =>
	compileRuleSet({
		id: "rules:invalid-resources",
		version: "1.0.0",
		resources: ["ok", ""] as readonly string[],
		rules: [],
	}),
);
assert.throws(() =>
	compileRuleSet({
		id: "rules:invalid-priority",
		version: "1.0.0",
		rules: [
			{
				id: "bad",
				priority: Number.NaN,
				when: { kind: "char", text: "x" },
				action: [{ kind: "diagnostic", code: "x", message: "x" }],
			},
		],
	}),
);
assert.throws(() =>
	validateGrammar({
		id: "grammar:bad",
		kind: "invalid" as "local",
	}),
);
