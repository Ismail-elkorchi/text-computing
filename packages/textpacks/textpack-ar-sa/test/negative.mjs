import assert from "node:assert/strict";
import { loadArabicShareAlike } from "../dist/index.js";

await assert.rejects(
	() =>
		loadArabicShareAlike({
			resolveComponent: async () => {
				throw new Error("missing component");
			},
		}),
	/Required textpack component @ismail-elkorchi\/textpack-foundation could not be resolved: missing component/,
);
