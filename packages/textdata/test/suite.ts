import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { parseConllu } from "../dist/conllu/mod.js";
import {
	readDataset,
	readUdAnnotationDatasetFromPack,
	splitDataset,
	streamRecords,
	udAnnotationRecordsFromPack,
	udSyntaxResourcesFromPack,
	writeDataset,
} from "../dist/index.js";
import { parseSequenceLabel } from "../dist/iob/mod.js";

async function collect<T>(records: AsyncIterable<T>): Promise<T[]> {
	const output: T[] = [];
	for await (const record of records) output.push(record);
	return output;
}

test("plain text, JSONL, CSV, and writers work", async () => {
	const plain = await readDataset(
		{ kind: "plain-text", text: "Hello world" },
		{ id: "plain" },
	);
	const plainRecords = await collect(streamRecords(plain));
	assert.equal(plainRecords[0]?.document?.views.raw?.text, "Hello world");

	const jsonl = await readDataset(
		{
			kind: "jsonl",
			text: '{"id":"r1","text":"Alpha","labels":["a"],"metadata":{"source":"fixture"}}\n',
		},
		{ id: "jsonl" },
	);
	const jsonlRecords = await collect(streamRecords(jsonl));
	assert.deepEqual(jsonlRecords[0]?.labels, ["a"]);

	const csv = await readDataset(
		{ kind: "csv", text: 'id,text,label\nr1,"A, B",x\n' },
		{ id: "csv", labelColumn: "label" },
	);
	const csvRecords = await collect(streamRecords(csv));
	assert.equal(csvRecords[0]?.text, "A, B");
	assert.deepEqual(csvRecords[0]?.labels, ["x"]);

	const chunks: string[] = [];
	await writeDataset(jsonl, { kind: "chunks", chunks }, { format: "jsonl" });
	assert.match(chunks.join(""), /"id":"r1"/);
});

test("CoNLL-U creates token layers and dependency graphs", async () => {
	const source = [
		"# sent_id = s1",
		"# text = I saw her",
		"1\tI\tI\tPRON\tPRP\t_\t2\tnsubj\t_\t_",
		"2\tsaw\tsee\tVERB\tVBD\t_\t0\troot\t_\t_",
		"3\ther\tshe\tPRON\tPRP\t_\t2\tobj\t_\t_",
		"",
	].join("\n");
	assert.equal(parseConllu(source).length, 1);
	const dataset = await readDataset(
		{ kind: "conllu", text: source },
		{ id: "conllu" },
	);
	const [record] = await collect(streamRecords(dataset));
	assert.equal(
		Object.keys(record?.document?.layers.tokens?.annotations ?? {}).length,
		3,
	);
	assert.equal(record?.document?.graphs.dependency?.kind, "dependency");
});

test("UD annotation textpack resources become annotation-only datasets", async () => {
	const pack = {
		manifest: {
			resources: [
				{ id: "fr-ud-gsd-upos", kind: "grammar" as const },
				{ id: "fr-ud-gsd-features", kind: "morphology" as const },
				{ id: "fr-ud-gsd-dependencies", kind: "grammar" as const },
				{
					id: "fr-ud-gsd-sentence-profile",
					kind: "statistical-model" as const,
				},
				{ id: "fr-ud-gsd-annotations", kind: "dataset" as const },
				{ id: "fr-ud-gsd-quality", kind: "quality-profile" as const },
			],
		},
		resources: {
			"fr-ud-gsd-upos": "upos\txpos\tcount\nNOUN\tNN\t1\n",
			"fr-ud-gsd-features": "feature\tvalue\tcount\nNumber\tSing\t1\n",
			"fr-ud-gsd-dependencies": "split\tdeprel\tcount\ntrain\troot\t1\n",
			"fr-ud-gsd-sentence-profile":
				"split\tsentenceCount\ttokenCount\taverageTokenCount\tmaxTokenCount\ntrain\t2\t4\t2\t3\n",
			"fr-ud-gsd-annotations": [
				"split\tsentenceIndex\ttokenId\tupos\txpos\tfeatures\thead\tdeprel\tdeps\tmisc",
				"train\t10\t1\tNOUN\tNN\tNumber=Sing\t0\troot\t0:root\t_",
				"train\t2\t1\tNOUN\tNN\tNumber=Sing\t0\troot\t0:root\t_",
				"train\t2\t10\tPUNCT\t.\t_\t1\tpunct\t1:punct\t_",
				"train\t2\t2\tADJ\tJJ\t_\t1\tamod\t1:amod\t_",
			].join("\n"),
			"fr-ud-gsd-quality": '{"rawTextIncluded":false}',
		},
	};
	const resources = udSyntaxResourcesFromPack(pack);
	assert.equal(resources.upos[0]?.upos, "NOUN");
	assert.equal(resources.features[0]?.feature, "Number");
	assert.equal(resources.dependencies[0]?.deprel, "root");
	assert.equal(resources.sentenceProfiles[0]?.tokenCount, 4);
	assert.equal(resources.quality.rawTextIncluded, false);
	const annotations = udAnnotationRecordsFromPack(pack);
	assert.equal(annotations.length, 4);
	assert.equal(annotations[0]?.upos, "NOUN");
	assert.deepEqual(
		annotations
			.filter((record) => record.sentenceIndex === 2)
			.map((record) => record.tokenId),
		["1", "2", "10"],
	);
	const dataset = readUdAnnotationDatasetFromPack(pack, { id: "ud-fixture" });
	const [record, laterRecord] = await collect(streamRecords(dataset));
	assert.equal(record?.id, "ud:train:2");
	assert.equal(laterRecord?.id, "ud:train:10");
	assert.equal(record?.document, undefined);
	assert.equal(record?.text, undefined);
	assert.equal(record?.metadata?.rawTextIncluded, false);
	const tokens = record?.fields?.tokens as readonly unknown[] | undefined;
	assert.deepEqual(
		tokens?.map((token) => (token as { tokenId?: string }).tokenId),
		["1", "2", "10"],
	);
});

test("IOB/BIO/BILOU validates transitions and creates entities", async () => {
	assert.deepEqual(parseSequenceLabel("B-PER"), { prefix: "B", type: "PER" });
	const dataset = await readDataset(
		{ kind: "iob", text: "Alice B-PER\nSmith I-PER\nworks O\n" },
		{ id: "iob", scheme: "BIO" },
	);
	const [record] = await collect(streamRecords(dataset));
	assert.equal(
		Object.keys(record?.document?.layers.entities?.annotations ?? {}).length,
		1,
	);
});

test("TEI/XML and parallel readers create structural and alignment records", async () => {
	const tei = await readDataset(
		{
			kind: "tei",
			text: "<TEI><text><body><p>Hello <hi>world</hi>. AT&amp;T &amp;lt;tag&amp;gt;</p></body></text></TEI>",
		},
		{ id: "tei" },
	);
	const [teiRecord] = await collect(streamRecords(tei));
	assert.equal(teiRecord?.text, "Hello world. AT&T &lt;tag&gt;");
	assert.ok(
		Object.keys(teiRecord?.document?.layers.structure?.annotations ?? {})
			.length > 0,
	);

	const parallel = await readDataset(
		{
			kind: "parallel",
			sourceText: "Hello\nGoodbye\n",
			targetText: "Bonjour\nAu revoir\n",
		},
		{ id: "parallel", sourceLanguage: "en", targetLanguage: "fr" },
	);
	const parallelRecords = await collect(streamRecords(parallel));
	assert.equal(parallelRecords.length, 2);
	assert.equal(parallelRecords[0]?.sourceLanguage, "en");
});

test("splitDataset is synchronous and deterministic", async () => {
	const dataset = await readDataset(
		{
			kind: "jsonl",
			text: [
				'{"id":"r1","text":"one","labels":["x"]}',
				'{"id":"r2","text":"two","labels":["x"]}',
				'{"id":"r3","text":"three","labels":["y"]}',
			].join("\n"),
		},
		{ id: "split" },
	);
	const splits = splitDataset(dataset, {
		seed: "seed",
		splits: [
			{ name: "train", ratio: 0.67 },
			{ name: "dev", ratio: 0.33 },
			{ name: "test", ratio: 0 },
		],
	});
	assert.equal(typeof splits.then, "undefined");
	assert.equal(splits.report.counts.train + splits.report.counts.dev, 3);
	assert.equal((await collect(streamRecords(splits.train))).length, 2);
});

test("splitDataset applies strata for finite datasets", async () => {
	const dataset = {
		id: "strata",
		metadata: {},
		records: [
			{ id: "a1", label: "a" },
			{ id: "a2", label: "a" },
			{ id: "b1", label: "b" },
			{ id: "b2", label: "b" },
		],
	};
	const splits = splitDataset(dataset, {
		seed: "strata",
		stratifyBy: "label",
		splits: [
			{ name: "train", ratio: 0.5 },
			{ name: "dev", ratio: 0.5 },
			{ name: "test", ratio: 0 },
		],
	});
	const trainLabels = (await collect(streamRecords(splits.train)))
		.map((record) => record.label)
		.sort();
	const devLabels = (await collect(streamRecords(splits.dev)))
		.map((record) => record.label)
		.sort();
	assert.deepEqual(trainLabels, ["a", "b"]);
	assert.deepEqual(devLabels, ["a", "b"]);
});

test("async split datasets share one streaming source safely", async () => {
	async function* records() {
		yield { id: "r1", text: "one" };
		yield { id: "r2", text: "two" };
		yield { id: "r3", text: "three" };
	}
	const splits = splitDataset(
		{ id: "async", metadata: {}, records: records() },
		{
			seed: "async",
			splits: [
				{ name: "train", ratio: 0.5 },
				{ name: "dev", ratio: 0.5 },
				{ name: "test", ratio: 0 },
			],
		},
	);
	const train = await collect(streamRecords(splits.train));
	const dev = await collect(streamRecords(splits.dev));
	assert.equal(train.length + dev.length, 3);
});

test("async split rejects count-based splits", () => {
	async function* records() {
		yield { id: "r1", text: "one" };
	}
	assert.throws(
		() =>
			splitDataset(
				{ id: "async-count", metadata: {}, records: records() },
				{
					seed: "async-count",
					splits: [
						{ name: "train", count: 1 },
						{ name: "dev", count: 0 },
						{ name: "test", count: 0 },
					],
				},
			),
		/TEXTDATA_SPLIT_COUNT_REQUIRES_FINITE_DATASET|finite iterable/,
	);
});

test("metadata rejects non-JSON values", async () => {
	await assert.rejects(
		() =>
			readDataset(
				{ kind: "plain-text", text: "bad" },
				{ id: "bad", metadata: { created: new Date(0) } },
			),
		/TEXTDATA_INVALID_JSON|non-json/,
	);
});

test("package source avoids forbidden sibling dependencies", async () => {
	const packageJson = JSON.parse(await readFile("package.json", "utf8"));
	assert.deepEqual(Object.keys(packageJson.dependencies).sort(), [
		"@ismail-elkorchi/textdoc",
		"@ismail-elkorchi/textfacts",
	]);
});
