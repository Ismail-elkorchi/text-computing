import { expect, test } from "bun:test";
import { trainSequenceTagger } from "../../dist/index.js";

test("textclassical bun smoke", () => {
	const tagger = trainSequenceTagger([{ tokens: ["x"], labels: ["X"] }], {
		kind: "hmm",
	});
	expect(tagger.labels).toEqual(["X"]);
});
