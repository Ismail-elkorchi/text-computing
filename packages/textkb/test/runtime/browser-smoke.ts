import { candidateEntities, createKnowledgeBase } from "../../dist/index.js";

const kb = createKnowledgeBase({
	entities: [{ id: "Q1", labels: { en: ["Acme"] } }],
});

if (candidateEntities(kb, "Acme")[0]?.entityId !== "Q1") {
	throw new Error("browser smoke failed");
}
