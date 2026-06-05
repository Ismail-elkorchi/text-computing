import { expect, test } from "bun:test";
import { candidateEntities, createKnowledgeBase } from "../../dist/index.js";

test("bun runtime imports final textkb entrypoint", () => {
	const kb = createKnowledgeBase({
		entities: [{ id: "Q1", labels: { en: ["Acme"] } }],
	});
	expect(candidateEntities(kb, "Acme")[0]?.entityId).toBe("Q1");
});
