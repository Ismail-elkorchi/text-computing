import assert from "node:assert/strict";
import { loadArabicQualityShareAlike } from "../dist/index.js";

await assert.rejects(
	() =>
		loadArabicQualityShareAlike({
			resolveComponent: async () => {
				throw new Error("missing component");
			},
		}),
	/Required textpack component @ismail-elkorchi\/textpack-ar-core could not be resolved: missing component/,
);
