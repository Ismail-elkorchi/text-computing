import assert from "node:assert/strict";
import { loadFrenchSyntax } from "../dist/index.js";

await assert.rejects(
	() =>
		loadFrenchSyntax({
			resolveComponent: async () => {
				throw new Error("missing component");
			},
		}),
	/Required textpack component @ismail-elkorchi\/textpack-fr-syntax-sa could not be resolved: missing component/,
);
