import assert from "node:assert/strict";
import { loadEnglish } from "../dist/index.js";

await assert.rejects(
	() =>
		loadEnglish({
			resolveComponent: async () => {
				throw new Error("missing component");
			},
		}),
	/Required textpack component @ismail-elkorchi\/textpack-foundation could not be resolved: missing component/,
);
