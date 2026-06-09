import assert from "node:assert/strict";

const root = await import("../dist/index.js");
const dataset = await import("../dist/dataset/mod.js");
const reader = await import("../dist/reader/mod.js");
const writer = await import("../dist/writer/mod.js");
const stream = await import("../dist/stream/mod.js");
const split = await import("../dist/split/mod.js");
const conllu = await import("../dist/conllu/mod.js");
const iob = await import("../dist/iob/mod.js");
const tei = await import("../dist/tei/mod.js");
const parallel = await import("../dist/parallel/mod.js");

function assertKeys(
	name: string,
	value: Record<string, unknown>,
	keys: readonly string[],
): void {
	assert.deepEqual(Object.keys(value).sort(), [...keys].sort(), name);
}

assertKeys("root exports", root, [
	"TextDataError",
	"createDataset",
	"mergeMetadata",
	"normalizeDatasetManifest",
	"packageName",
	"packageVersion",
	"readDataset",
	"readUdAnnotationDatasetFromPack",
	"splitDataset",
	"streamRecords",
	"udAnnotationRecordsFromPack",
	"udSyntaxResourcesFromPack",
	"validateDataset",
	"writeDataset",
]);

assertKeys("dataset exports", dataset, [
	"assertDatasetManifest",
	"assertDatasetRecord",
	"createDataset",
	"mergeMetadata",
	"normalizeDatasetManifest",
	"normalizeInputRecord",
	"validateDataset",
]);

assertKeys("reader exports", reader, [
	"readConllDataset",
	"readDataset",
	"readDelimitedDataset",
	"readJsonlDataset",
	"readPlainTextCollection",
	"resolveInputFormat",
]);

assertKeys("writer exports", writer, [
	"serializeJsonl",
	"serializeTabular",
	"writeChunk",
	"writeDataset",
]);

assertKeys("stream exports", stream, [
	"batchRecords",
	"collectRecords",
	"filterRecords",
	"mapRecords",
	"streamRecords",
]);

assertKeys("split exports", split, [
	"createSplitReport",
	"splitDataset",
	"stableShuffle",
]);

assertKeys("conllu exports", conllu, [
	"conlluSentenceToRecord",
	"parseConllu",
	"readConlluDataset",
	"readUdAnnotationDatasetFromPack",
	"serializeConllu",
	"udAnnotationRecordsFromPack",
	"udSyntaxResourcesFromPack",
]);

assertKeys("iob exports", iob, [
	"assertTransition",
	"iobSentenceToRecord",
	"parseIob",
	"parseSequenceLabel",
	"readIobDataset",
	"serializeIob",
]);

assertKeys("tei exports", tei, [
	"parseXmlRecord",
	"readTeiDataset",
	"readXmlDataset",
	"structuralElements",
	"structuralType",
	"xmlExtractToRecord",
]);

assertKeys("parallel exports", parallel, [
	"parallelLinesToRecords",
	"parseAlignmentLinks",
	"parseParallelTable",
	"readParallelDataset",
	"serializeParallel",
]);
