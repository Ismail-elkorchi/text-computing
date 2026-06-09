import assert from "node:assert/strict";
import { loadFoundation } from "../dist/index.js";

await assert.rejects(
	() =>
		loadFoundation({
			resolveComponent: async () => {
				throw new Error("missing component");
			},
		}),
	/Required textpack component @ismail-elkorchi\/textpack-language-registry could not be resolved: missing component/,
);
