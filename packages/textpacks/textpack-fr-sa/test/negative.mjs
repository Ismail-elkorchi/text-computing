import assert from "node:assert/strict";
import { loadFrenchShareAlike } from "../dist/index.js";

await assert.rejects(
	() =>
		loadFrenchShareAlike({
			resolveComponent: async () => {
				throw new Error("missing component");
			},
		}),
	/Required textpack component @ismail-elkorchi\/textpack-foundation could not be resolved: missing component/,
);
