import { compileRuleSet, packageName } from "../../dist/index.js";

if (packageName !== "@ismail-elkorchi/textrules") {
	throw new Error("unexpected package name");
}

compileRuleSet({
	id: "rules:browser",
	version: "1.0.0",
	rules: [
		{
			id: "rule",
			when: { kind: "char", text: "x" },
			action: [{ kind: "diagnostic", code: "x", message: "x" }],
		},
	],
});
