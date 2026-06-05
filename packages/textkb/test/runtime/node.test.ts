import assert from "node:assert/strict";
import test from "node:test";

import { candidateEntities, createKnowledgeBase } from "../../dist/index.js";

test("node runtime imports final textkb entrypoint", () => {
	const kb = createKnowledgeBase({
		entities: [{ id: "Q1", labels: { en: ["Acme"] } }],
	});
	assert.equal(candidateEntities(kb, "Acme")[0]?.entityId, "Q1");
});
