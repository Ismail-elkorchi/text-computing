import { candidateEntities, createKnowledgeBase } from "../../dist/index.js";

Deno.test("deno runtime imports final textkb entrypoint", () => {
	const kb = createKnowledgeBase({
		entities: [{ id: "Q1", labels: { en: ["Acme"] } }],
	});
	if (candidateEntities(kb, "Acme")[0]?.entityId !== "Q1") {
		throw new Error("deno smoke failed");
	}
});
