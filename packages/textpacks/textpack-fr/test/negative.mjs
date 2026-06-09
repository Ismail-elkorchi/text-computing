import assert from "node:assert/strict";
import { loadFrench } from "../dist/index.js";

await assert.rejects(
	() =>
		loadFrench({
			resolveComponent: async () => {
				throw new Error("missing component");
			},
		}),
	/Required textpack component @ismail-elkorchi\/textpack-foundation could not be resolved: missing component/,
);
