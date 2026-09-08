import assert from "node:assert/strict";
import {
	compileRuleSet,
	packageName,
} from "@ismail-elkorchi/text-computing/rules";
import { compileRuleSet as compileRuleSetFromSubpath } from "@ismail-elkorchi/text-computing/rules/compile";

assert.equal(packageName, "@ismail-elkorchi/text-computing");
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
