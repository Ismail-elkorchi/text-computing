import assert from "node:assert/strict";
import { loadArabicSyntaxShareAlike } from "../dist/index.js";

await assert.rejects(
	() =>
		loadArabicSyntaxShareAlike({
			resolveComponent: async () => {
				throw new Error("missing component");
			},
		}),
	/Required textpack component @ismail-elkorchi\/textpack-ar-syntax-ud-nyuad-sa could not be resolved: missing component/,
);
