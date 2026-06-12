import assert from "node:assert/strict";
import { loadEnglishSearch } from "../dist/index.js";

await assert.rejects(
	() =>
		loadEnglishSearch({
			resolveComponent: async () => {
				throw new Error("missing component");
			},
		}),
	/Required textpack component @ismail-elkorchi\/textpack-en-wordlist-esdb could not be resolved: missing component/,
);
