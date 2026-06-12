import assert from "node:assert/strict";
import { loadArabicSyntax } from "../dist/index.js";

await assert.rejects(
	() =>
		loadArabicSyntax({
			resolveComponent: async () => {
				throw new Error("missing component");
			},
		}),
	/Required textpack component @ismail-elkorchi\/textpack-ar-syntax-sa could not be resolved: missing component/,
);
