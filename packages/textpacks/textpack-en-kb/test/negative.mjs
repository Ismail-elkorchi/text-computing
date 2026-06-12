import assert from "node:assert/strict";
import { loadEnglishKnowledgeBase } from "../dist/index.js";

await assert.rejects(
	() =>
		loadEnglishKnowledgeBase({
			resolveComponent: async () => {
				throw new Error("missing component");
			},
		}),
	/Required textpack component @ismail-elkorchi\/textpack-wordnet-en could not be resolved: missing component/,
);
