import assert from "node:assert/strict";
import { loadFrenchQuality } from "../dist/index.js";

await assert.rejects(
	() =>
		loadFrenchQuality({
			resolveComponent: async () => {
				throw new Error("missing component");
			},
		}),
	/Required textpack component @ismail-elkorchi\/textpack-fr-quality-sa could not be resolved: missing component/,
);
