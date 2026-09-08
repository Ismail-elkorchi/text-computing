import assert from "node:assert/strict";

const root = await import("@ismail-elkorchi/text-computing/data");
const dataset = await import("@ismail-elkorchi/text-computing/data/dataset");
const reader = await import("@ismail-elkorchi/text-computing/data/reader");
const writer = await import("@ismail-elkorchi/text-computing/data/writer");
const stream = await import("@ismail-elkorchi/text-computing/data/stream");
const split = await import("@ismail-elkorchi/text-computing/data/split");
const conllu = await import("@ismail-elkorchi/text-computing/data/conllu");
const iob = await import("@ismail-elkorchi/text-computing/data/iob");
const tei = await import("@ismail-elkorchi/text-computing/data/tei");
const parallel = await import("@ismail-elkorchi/text-computing/data/parallel");

function assertKeys(
	name: string,
	value: Record<string, unknown>,
	keys: readonly string[],
): void {
	assert.deepEqual(Object.keys(value).sort(), [...keys].sort(), name);
}

assertKeys("root exports", root, [
	"TextDataError",
	"corpusRowsFromPack",
	"createDataset",
	"mergeMetadata",
	"normalizeDatasetManifest",
	"packageName",
	"packageVersion",
	"readDataset",
	"readUdAnnotationDatasetFromPack",
	"readUdAnnotationDatasetFromPackAsync",
	"segmentationAdapterFromPack",
	"segmentationResourcesFromPack",
	"splitDataset",
	"streamRecords",
	"udAnnotationRecordsFromPack",
	"udAnnotationRecordsFromPackAsync",
	"udSyntaxResourcesFromPack",
	"udSyntaxResourcesFromPackAsync",
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
	"readUdAnnotationDatasetFromPackAsync",
	"serializeConllu",
	"udAnnotationRecordsFromPack",
	"udAnnotationRecordsFromPackAsync",
	"udSyntaxResourcesFromPack",
	"udSyntaxResourcesFromPackAsync",
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
