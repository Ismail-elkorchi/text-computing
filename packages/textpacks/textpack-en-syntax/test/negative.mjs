import assert from "node:assert/strict";
import { loadEnglishSyntax } from "../dist/index.js";

await assert.rejects(
	() =>
		loadEnglishSyntax({
			resolveComponent: async () => {
				throw new Error("missing component");
			},
		}),
	/Required textpack component @ismail-elkorchi\/textpack-en-syntax-ud-gumreddit could not be resolved: missing component/,
);
