import assert from "node:assert/strict";
import type {
	Fst,
	FstArc,
	MorphFstResult,
	RewriteRule,
	SemiringName,
	SpanRef,
} from "@ismail-elkorchi/text-computing/finite-state";
import {
	buildFst,
	compileRegex,
	packageName,
} from "@ismail-elkorchi/text-computing/finite-state";
import { applyDown } from "@ismail-elkorchi/text-computing/finite-state/apply";
import { compileLexicon } from "@ismail-elkorchi/text-computing/finite-state/lexc";
import { analyzeWord } from "@ismail-elkorchi/text-computing/finite-state/morph";

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

assert.equal(packageName, "@ismail-elkorchi/text-computing");
assert.equal(applyDown(compileRegex("a"), "a")[0]?.output, "a");
assert.equal(applyDown(fst, "a")[0]?.output, "a");
assert.equal(span.span.unit, "utf16-code-unit");
assert.equal(rule.input, "a");
assert.equal(result?.lemma, "type");
