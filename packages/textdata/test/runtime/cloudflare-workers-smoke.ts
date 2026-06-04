import { readDataset, streamRecords } from "../../dist/index.js";

const dataset = await readDataset(
	{ kind: "plain-text", text: "worker" },
	{ id: "worker" },
);
const iterator = streamRecords(dataset)[Symbol.asyncIterator]();
const first = await iterator.next();
if (first.value?.text !== "worker") {
	throw new Error("worker smoke failed");
}
