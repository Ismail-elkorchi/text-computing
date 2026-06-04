import { compileRuleSet, packageName } from "../../dist/index.js";

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
