import assert from "node:assert/strict";
import { loadFrenchLexicon } from "../dist/index.js";

await assert.rejects(
	() =>
		loadFrenchLexicon({
			resolveComponent: async () => {
				throw new Error("missing component");
			},
		}),
	/Required textpack component @ismail-elkorchi\/textpack-fr-lexicon-sa could not be resolved: missing component/,
);
