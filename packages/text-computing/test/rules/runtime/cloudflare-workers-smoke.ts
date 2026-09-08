import {
	compileRuleSet,
	packageName,
} from "@ismail-elkorchi/text-computing/rules";

export default {
	fetch(): Response {
		const compiled = compileRuleSet({
			id: "rules:workers",
			version: "1.0.0",
			rules: [
				{
					id: "rule",
					when: { kind: "char", text: "x" },
					action: [{ kind: "diagnostic", code: "x", message: "x" }],
				},
			],
		});
		return new Response(`${packageName}:${compiled.id}`);
	},
};
