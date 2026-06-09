import assert from "node:assert/strict";
import type {
	DatasetInput,
	DatasetOutput,
	DatasetReadOptions,
	DatasetRecord,
	DatasetSplits,
	DatasetWriteOptions,
	TextDataset,
	UdAnnotationRecord,
	UdSyntaxPackResources,
} from "../../dist/index.js";
import {
	readDataset,
	readUdAnnotationDatasetFromPack,
	splitDataset,
	streamRecords,
	udAnnotationRecordsFromPack,
	udSyntaxResourcesFromPack,
	writeDataset,
} from "../../dist/index.js";

const input: DatasetInput = { kind: "plain-text", text: "typed" };
const readOptions: DatasetReadOptions = { id: "types" };
const dataset: TextDataset = await readDataset(input, readOptions);
const splits: DatasetSplits<unknown> = splitDataset(dataset, { seed: "types" });
const output: DatasetOutput = { kind: "chunks", chunks: [] };
const writeOptions: DatasetWriteOptions = { format: "jsonl" };
const record: DatasetRecord = { id: "record", text: "typed" };
const udRecord: UdAnnotationRecord = {
	split: "train",
	sentenceIndex: 1,
	tokenId: "1",
	upos: "NOUN",
	xpos: "NN",
	features: "Number=Sing",
	head: "0",
	deprel: "root",
	deps: "0:root",
	misc: "_",
};
const udResources: UdSyntaxPackResources = {
	upos: [],
	features: [],
	dependencies: [],
	sentenceProfiles: [],
	annotations: [udRecord],
	quality: {},
};

for await (const item of streamRecords(dataset)) {
	assert.equal(typeof item, "object");
	break;
}
await writeDataset(splits.train, output, writeOptions);
assert.equal(record.id, "record");
void readUdAnnotationDatasetFromPack;
void udAnnotationRecordsFromPack;
void udSyntaxResourcesFromPack;
void udRecord;
void udResources;
