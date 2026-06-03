/// <reference lib="deno.ns" />

import { buildLexicon, lookup } from "../../dist/index.js";

Deno.test("textlex final API works in Deno", () => {
	const lexicon = buildLexicon([{ id: "deno", forms: ["deno"] }]);
	if (lookup(lexicon, "deno")[0]?.entryId !== "deno") {
		throw new Error("deno runtime smoke failed");
	}
});
