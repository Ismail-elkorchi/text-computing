import assert from "node:assert/strict";
import { loadFrenchQualityShareAlike } from "../dist/index.js";

await assert.rejects(
	() =>
		loadFrenchQualityShareAlike({
			resolveComponent: async () => {
				throw new Error("missing component");
			},
		}),
	/Required textpack component @ismail-elkorchi\/textpack-fr-core could not be resolved: missing component/,
);
