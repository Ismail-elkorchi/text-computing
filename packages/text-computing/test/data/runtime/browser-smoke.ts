import {
	readDataset,
	streamRecords,
} from "@ismail-elkorchi/text-computing/data";

const dataset = await readDataset(
	{ kind: "plain-text", text: "browser" },
	{ id: "browser" },
);
const iterator = streamRecords(dataset)[Symbol.asyncIterator]();
const first = await iterator.next();
if (first.value?.text !== "browser") {
	throw new Error("browser smoke failed");
}
