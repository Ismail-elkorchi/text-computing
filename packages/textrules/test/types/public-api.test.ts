import assert from "node:assert/strict";
import {
	compileRuleSet,
	type Pattern,
	type RuleAction,
	type RuleSet,
	RuleTokenizer,
	type TextProcessor,
} from "../../dist/index.js";
import { matchRules, type RuleMatch } from "../../dist/match/mod.js";
import { createRuleProcessor } from "../../dist/processor/mod.js";
import { rewriteView } from "../../dist/rewrite/mod.js";

const pattern: Pattern = { kind: "char", text: "Alice" };
const action: RuleAction = {
	kind: "annotate",
	layerId: "mentions",
	layerType: "entity.mention",
};
const ruleSet: RuleSet = {
	id: "rules:types",
	version: "1.0.0",
	rules: [{ id: "rule", when: pattern, action: [action] }],
};
const compiled = compileRuleSet(ruleSet);
const processor: TextProcessor = createRuleProcessor(compiled);
const matches: readonly RuleMatch[] = [];

assert.equal(processor.packageName, "@ismail-elkorchi/textrules");
assert.equal(RuleTokenizer.create(compiled).kind, "tokenizer");
assert.equal(matches.length, 0);
assert.equal(typeof matchRules, "function");
assert.equal(typeof rewriteView, "function");
