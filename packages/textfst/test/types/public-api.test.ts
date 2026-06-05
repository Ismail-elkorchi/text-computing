import assert from "node:assert/strict";
import { applyDown } from "../../dist/apply/mod.js";
import type {
	Fst,
	FstArc,
	MorphFstResult,
	RewriteRule,
	SemiringName,
	SpanRef,
} from "../../dist/index.js";
import { buildFst, compileRegex, packageName } from "../../dist/index.js";
import { compileLexicon } from "../../dist/lexc/mod.js";
import { analyzeWord } from "../../dist/morph/mod.js";

const arc: FstArc = { from: 0, to: 1, input: "a", output: "a" };
const semiring: SemiringName = "boolean";
const span: SpanRef = {
	viewId: "input",
	span: { start: 0, end: 1, unit: "utf16-code-unit" },
};
const rule: RewriteRule = { input: "a", output: "b" };
const fst: Fst = buildFst({
	kind: "acceptor",
	semiring,
	states: [0, 1],
	arcs: [arc],
	startState: 0,
	finalWeights: { 1: 0 },
});
const morph = compileLexicon({
	entries: [{ surface: "typed", analysis: "type+V+PST" }],
});
const result: MorphFstResult | undefined = analyzeWord(morph, "typed")[0];

assert.equal(packageName, "@ismail-elkorchi/textfst");
assert.equal(applyDown(compileRegex("a"), "a")[0]?.output, "a");
assert.equal(applyDown(fst, "a")[0]?.output, "a");
assert.equal(span.span.unit, "utf16-code-unit");
assert.equal(rule.input, "a");
assert.equal(result?.lemma, "type");
