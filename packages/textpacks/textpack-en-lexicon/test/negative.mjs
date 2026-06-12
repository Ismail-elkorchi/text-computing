import assert from "node:assert/strict";
import { loadEnglishLexicon } from "../dist/index.js";

await assert.rejects(
	() =>
		loadEnglishLexicon({
			resolveComponent: async () => {
				throw new Error("missing component");
			},
		}),
	/Required textpack component @ismail-elkorchi\/textpack-en-wordlist-esdb could not be resolved: missing component/,
);
