import { expect, test } from "bun:test";
import { buildLexicon, lookup } from "../../dist/index.js";

test("textlex final API works in Bun", () => {
	const lexicon = buildLexicon([{ id: "bun", forms: ["bun"] }]);
	expect(lookup(lexicon, "bun")[0]?.entryId).toBe("bun");
});
