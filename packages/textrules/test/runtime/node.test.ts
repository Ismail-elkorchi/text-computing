import assert from "node:assert/strict";
import { compileRuleSet as compileRuleSetFromSubpath } from "../../dist/compile/mod.js";
import { compileRuleSet, packageName } from "../../dist/index.js";

assert.equal(packageName, "@ismail-elkorchi/textrules");
assert.equal(
	compileRuleSet({
		id: "rules:node",
		version: "1.0.0",
		rules: [
			{
				id: "noop",
				when: { kind: "char", text: "x" },
				action: [{ kind: "diagnostic", code: "x", message: "x" }],
			},
		],
	}).id,
	"rules:node",
);
assert.equal(typeof compileRuleSetFromSubpath, "function");
