import assert from "node:assert/strict";
import { loadArabicLexicon } from "../dist/index.js";

await assert.rejects(
	() =>
		loadArabicLexicon({
			resolveComponent: async () => {
				throw new Error("missing component");
			},
		}),
	/Required textpack component @ismail-elkorchi\/textpack-wordnet-ar could not be resolved: missing component/,
);
