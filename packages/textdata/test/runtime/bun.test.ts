import { expect, test } from "bun:test";
import { readDataset, streamRecords } from "../../dist/index.js";

test("bun imports textdata", async () => {
	const dataset = await readDataset(
		{ kind: "plain-text", text: "bun" },
		{ id: "bun" },
	);
	const iterator = streamRecords(dataset)[Symbol.asyncIterator]();
	const first = await iterator.next();
	expect(first.value?.text).toBe("bun");
});
