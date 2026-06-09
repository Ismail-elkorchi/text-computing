import assert from "node:assert/strict";
import { loadFrenchSearch } from "../dist/index.js";

await assert.rejects(
	() =>
		loadFrenchSearch({
			resolveComponent: async () => {
				throw new Error("missing component");
			},
		}),
	/Required textpack component @ismail-elkorchi\/textpack-fr-search-sa could not be resolved: missing component/,
);
