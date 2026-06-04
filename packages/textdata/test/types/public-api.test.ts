import assert from "node:assert/strict";
import type {
	DatasetInput,
	DatasetOutput,
	DatasetReadOptions,
	DatasetRecord,
	DatasetSplits,
	DatasetWriteOptions,
	TextDataset,
} from "../../dist/index.js";
import {
	readDataset,
	splitDataset,
	streamRecords,
	writeDataset,
} from "../../dist/index.js";

const input: DatasetInput = { kind: "plain-text", text: "typed" };
const readOptions: DatasetReadOptions = { id: "types" };
const dataset: TextDataset = await readDataset(input, readOptions);
const splits: DatasetSplits<unknown> = splitDataset(dataset, { seed: "types" });
const output: DatasetOutput = { kind: "chunks", chunks: [] };
const writeOptions: DatasetWriteOptions = { format: "jsonl" };
const record: DatasetRecord = { id: "record", text: "typed" };

for await (const item of streamRecords(dataset)) {
	assert.equal(typeof item, "object");
	break;
}
await writeDataset(splits.train, output, writeOptions);
assert.equal(record.id, "record");
