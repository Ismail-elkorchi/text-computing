import assert from "node:assert/strict";
import { loadEnglishQuality } from "../dist/index.js";

await assert.rejects(
	() =>
		loadEnglishQuality({
			resolveComponent: async () => {
				throw new Error("missing component");
			},
		}),
	/Required textpack component @ismail-elkorchi\/textpack-en-core could not be resolved: missing component/,
);
