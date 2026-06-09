import assert from "node:assert/strict";
import { loadArabicQuality } from "../dist/index.js";

await assert.rejects(
	() =>
		loadArabicQuality({
			resolveComponent: async () => {
				throw new Error("missing component");
			},
		}),
	/Required textpack component @ismail-elkorchi\/textpack-ar-quality-sa could not be resolved: missing component/,
);
