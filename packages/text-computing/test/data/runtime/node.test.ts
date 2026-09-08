import assert from "node:assert/strict";
import {
	readDataset,
	streamRecords,
} from "@ismail-elkorchi/text-computing/data";

const dataset = await readDataset(
	{ kind: "plain-text", text: "node" },
	{ id: "node" },
);
const iterator = streamRecords(dataset)[Symbol.asyncIterator]();
const first = await iterator.next();
assert.equal(first.value?.text, "node");
