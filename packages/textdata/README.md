# @ismail-elkorchi/textdata

`textdata` loads, streams, converts, splits, and writes text datasets and annotation formats.

This is an expert engine module. Applications should use `@ismail-elkorchi/text-computing` with generated Capability Packs.

```ts
import { readDataset, splitDataset, streamRecords, writeDataset } from "@ismail-elkorchi/textdata";

const dataset = await readDataset(
	{ kind: "jsonl", text: "{\"id\":\"r1\",\"text\":\"Hello world\",\"labels\":[\"greeting\"]}\n" },
	{ id: "demo" },
);

for await (const record of streamRecords(dataset)) {
	console.log(record.id);
}

const splits = splitDataset(dataset, {
	splits: [
		{ name: "train", ratio: 0.8 },
		{ name: "dev", ratio: 0.1 },
		{ name: "test", ratio: 0.1 },
	],
	seed: "demo",
});

const output: string[] = [];
await writeDataset(splits.train, { kind: "chunks", chunks: output }, { format: "jsonl" });
```

Supported reader families include plain text, JSONL, CSV/TSV, CoNLL-style rows, CoNLL-U, IOB/BIO/BILOU, TEI/XML, basic HTML/XML, and parallel text with alignments.

`textdata` does not compute corpus statistics, train models, run pipelines, build search indexes, or discover hidden resources.

Textpack-backed segmentation uses the repository's pinned Unicode 17 word,
sentence, and grapheme algorithms plus explicit pack tailoring. Results do not
depend on the host runtime's `Intl.Segmenter` implementation.
