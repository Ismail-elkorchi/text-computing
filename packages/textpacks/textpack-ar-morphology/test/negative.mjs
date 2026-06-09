import assert from "node:assert/strict";
import { loadArabicMorphology } from "../dist/index.js";

await assert.rejects(
	() =>
		loadArabicMorphology({
			resolveComponent: async () => {
				throw new Error("missing component");
			},
		}),
	/Required textpack component @ismail-elkorchi\/textpack-ar-msa-morphology could not be resolved: missing component/,
);
