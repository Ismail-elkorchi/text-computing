import assert from "node:assert/strict";
import { loadFrenchMorphology } from "../dist/index.js";

await assert.rejects(
	() =>
		loadFrenchMorphology({
			resolveComponent: async () => {
				throw new Error("missing component");
			},
		}),
	/Required textpack component @ismail-elkorchi\/textpack-fr-morphology-sa could not be resolved: missing component/,
);
