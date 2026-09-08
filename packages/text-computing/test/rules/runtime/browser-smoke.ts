import {
	compileRuleSet,
	packageName,
} from "@ismail-elkorchi/text-computing/rules";

if (packageName !== "@ismail-elkorchi/text-computing") {
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
