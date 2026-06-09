import assert from "node:assert/strict";
import { loadFrenchMorphologyShareAlike } from "../dist/index.js";

await assert.rejects(
	() =>
		loadFrenchMorphologyShareAlike({
			resolveComponent: async () => {
				throw new Error("missing component");
			},
		}),
	/Required textpack component @ismail-elkorchi\/textpack-fr-lexique-sa could not be resolved: missing component/,
);
