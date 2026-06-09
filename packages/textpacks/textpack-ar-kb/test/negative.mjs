import assert from "node:assert/strict";
import { loadArabicKnowledgeBase } from "../dist/index.js";

await assert.rejects(
	() =>
		loadArabicKnowledgeBase({
			resolveComponent: async () => {
				throw new Error("missing component");
			},
		}),
	/Required textpack component @ismail-elkorchi\/textpack-wordnet-ar could not be resolved: missing component/,
);
