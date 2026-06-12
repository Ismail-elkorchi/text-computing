import assert from "node:assert/strict";
import { loadFrenchSyntaxShareAlike } from "../dist/index.js";

await assert.rejects(
	() =>
		loadFrenchSyntaxShareAlike({
			resolveComponent: async () => {
				throw new Error("missing component");
			},
		}),
	/Required textpack component @ismail-elkorchi\/textpack-fr-syntax-ud-gsd-sa could not be resolved: missing component/,
);
