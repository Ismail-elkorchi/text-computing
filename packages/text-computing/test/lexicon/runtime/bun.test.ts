import { expect, test } from "bun:test";
import { buildLexicon, lookup } from "@ismail-elkorchi/text-computing/lexicon";

test("textlex final API works in Bun", () => {
	const lexicon = buildLexicon([{ id: "bun", forms: ["bun"] }]);
	expect(lookup(lexicon, "bun")[0]?.entryId).toBe("bun");
});
