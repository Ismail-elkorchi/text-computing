import assert from "node:assert/strict";
import { loadFrenchKnowledgeBase } from "../dist/index.js";

await assert.rejects(
	() =>
		loadFrenchKnowledgeBase({
			resolveComponent: async () => {
				throw new Error("missing component");
			},
		}),
	/Required textpack component @ismail-elkorchi\/textpack-wikidata-fr could not be resolved: missing component/,
);
