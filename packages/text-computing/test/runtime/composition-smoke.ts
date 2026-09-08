import {
	createDocument,
	toDocumentJson,
} from "@ismail-elkorchi/text-computing/document";
import {
	createPipeline,
	runPipeline,
} from "@ismail-elkorchi/text-computing/pipeline";
import {
	applyRules,
	compileRuleSet,
	createRuleProcessor,
} from "@ismail-elkorchi/text-computing/rules";

export async function runCompositionSmoke(): Promise<void> {
	const rules = compileRuleSet({
		id: "portable-mentions",
		version: "1",
		rules: [
			{
				id: "alice",
				when: { kind: "char", text: "Alice" },
				action: [
					{
						kind: "annotate",
						layerId: "mentions",
						layerType: "entity.mention",
						value: { label: "person" },
					},
				],
			},
		],
	});
	const pipeline = createPipeline([
		createRuleProcessor(rules, { provides: [{ layer: "mentions" }] }),
	]);
	for (const text of ["Alice arrived.", "No matches."]) {
		const document = createDocument(text);
		const direct = applyRules(document, rules);
		const composed = await runPipeline(pipeline, document);
		if (
			JSON.stringify(toDocumentJson(direct)) !==
			JSON.stringify(toDocumentJson(composed))
		) {
			throw new Error("Portable direct and pipeline rule outputs differ.");
		}
	}
}
