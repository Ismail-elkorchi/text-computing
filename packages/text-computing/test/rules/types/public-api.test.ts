import assert from "node:assert/strict";
import type { TextProcessor } from "@ismail-elkorchi/text-computing/pipeline";
import {
	compileRuleSet,
	type Pattern,
	type RuleAction,
	type RuleSet,
} from "@ismail-elkorchi/text-computing/rules";
import {
	matchRules,
	type RuleMatch,
} from "@ismail-elkorchi/text-computing/rules/match";
import { createRuleProcessor } from "@ismail-elkorchi/text-computing/rules/processor";
import { rewriteView } from "@ismail-elkorchi/text-computing/rules/rewrite";

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
const processor: TextProcessor = createRuleProcessor(compiled, {
	provides: [{ layer: "mentions" }],
});
const matches: readonly RuleMatch[] = [];

assert.equal(processor.provides[0]?.layer, "mentions");
assert.equal(matches.length, 0);
assert.equal(typeof matchRules, "function");
assert.equal(typeof rewriteView, "function");
