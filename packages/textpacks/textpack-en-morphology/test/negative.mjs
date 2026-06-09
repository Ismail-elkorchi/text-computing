import assert from "node:assert/strict";
import { loadEnglishMorphology } from "../dist/index.js";

await assert.rejects(
	() =>
		loadEnglishMorphology({
			resolveComponent: async () => {
				throw new Error("missing component");
			},
		}),
	/Required textpack component @ismail-elkorchi\/textpack-en-inflection-scowl could not be resolved: missing component/,
);
