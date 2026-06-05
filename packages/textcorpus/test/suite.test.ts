import assert from "node:assert/strict";
import test from "node:test";

import {
	addDocuments,
	collocations,
	concordance,
	corpusFingerprint,
	corpusQuery,
	createCorpus,
	createCorpusFromDataset,
	detectReuse,
	diachronicTrends,
	dispersion,
	documentSimilarityMatrix,
	documentTermMatrix,
	extractTerms,
	frequency,
	goodDictionaryExamples,
	keyness,
	lexicalDiversity,
	ngrams,
	stylometricProfile,
	wordSketch,
} from "../dist/index.js";
import { fixtureDocuments, makeDocument, token } from "./fixtures/documents.ts";

test("creates an immutable final corpus with metadata partitions and indexes", () => {
	const corpus = createCorpus(fixtureDocuments(), {
		id: "fixture-corpus",
		metadata: { language: "en" },
		partitionKeys: ["domain", "year"],
	});
	assert.equal(corpus.id, "fixture-corpus");
	assert.deepEqual(
		corpus.documents.map((doc) => doc.id),
		["doc-a", "doc-b", "doc-c"],
	);
	assert.equal(corpus.indexes.documents, 3);
	assert.equal(corpus.indexes.tokens, 20);
	assert.deepEqual(corpus.indexes.tokenLayers, ["tokens"]);
	assert.deepEqual(corpus.indexes.partitions.domain, ["history", "legal"]);
	assert.equal(Object.isFrozen(corpus), true);
	assert.match(corpusFingerprint(corpus), /^[0-9a-f]{8}$/);
});

test("rejects non-plain metadata objects", () => {
	class Metadata {
		readonly language = "en";
	}
	assert.throws(
		() =>
			createCorpus(fixtureDocuments(), {
				metadata: new Metadata(),
			}),
		/TEXTCORPUS_JSON_VALUE/,
	);
});

test("adds documents without mutating the original corpus", () => {
	const corpus = createCorpus(fixtureDocuments().slice(0, 2), {
		id: "small",
		partitionKeys: ["domain"],
	});
	const next = addDocuments(corpus, [fixtureDocuments()[2]]);
	assert.equal(corpus.documents.length, 2);
	assert.equal(next.documents.length, 3);
	assert.equal(next.indexes.tokens, 20);
});

test("runs structured token, lemma, annotation, metadata, partition, and boolean queries", () => {
	const corpus = createCorpus(fixtureDocuments(), {
		partitionKeys: ["domain"],
	});
	const tokenResult = corpusQuery(corpus, { kind: "token", term: "contract" });
	assert.equal(tokenResult.count, 3);
	assert.equal(tokenResult.hits.length, 4);
	const lemmaResult = corpusQuery(corpus, { kind: "lemma", lemma: "term" });
	assert.equal(lemmaResult.hits.length, 4);
	const annotationResult = corpusQuery(corpus, {
		kind: "annotation",
		layer: "tokens",
		type: "token.word",
	});
	assert.equal(annotationResult.count, 3);
	assert.equal(annotationResult.hits.length, 20);
	const metadataResult = corpusQuery(corpus, {
		kind: "metadata",
		key: "year",
		value: "2021",
	});
	assert.deepEqual(
		metadataResult.documents.map((doc) => doc.id),
		["doc-b"],
	);
	const partitionResult = corpusQuery(corpus, {
		kind: "partition",
		key: "domain",
		value: "history",
	});
	assert.deepEqual(
		partitionResult.documents.map((doc) => doc.id),
		["doc-c"],
	);
	const booleanResult = corpusQuery(corpus, {
		kind: "and",
		queries: [
			{ kind: "lemma", lemma: "contract" },
			{ kind: "metadata", key: "domain", value: "legal" },
		],
	});
	assert.deepEqual(
		booleanResult.documents.map((doc) => doc.id),
		["doc-a", "doc-b"],
	);
});

test("rejects non-utf16 spans when text must be sliced", () => {
	const [doc] = fixtureDocuments();
	assert.notEqual(doc, undefined);
	const first = doc.layers.tokens?.annotations["tok-0"];
	assert.notEqual(first, undefined);
	const badDoc = {
		...doc,
		layers: {
			tokens: {
				...doc.layers.tokens,
				annotations: {
					...doc.layers.tokens?.annotations,
					"tok-0": {
						...first,
						value: { index: 0 },
						spans: [
							{
								viewId: "raw",
								span: { start: 0, end: 1, unit: "grapheme" },
							},
						],
					},
				},
			},
		},
	};
	assert.throws(
		() => createCorpus([badDoc], { tokenLayerId: "tokens" }),
		/TEXTCORPUS_DOCUMENT_INDEX_ERROR/,
	);
});

test("produces concordances, frequency lists, ngrams, collocations, and keyness", () => {
	const docs = fixtureDocuments();
	const corpus = createCorpus(docs, { partitionKeys: ["domain", "year"] });
	const lines = concordance(
		corpus,
		{ kind: "lemma", lemma: "contract" },
		{ window: 2 },
	);
	assert.equal(lines.length, 4);
	assert.equal(lines[0]?.node.toLocaleLowerCase("und"), "contract");
	const rows = frequency(corpus, { minCount: 2 });
	assert.equal(rows[0]?.item, "contract");
	assert.equal(rows[0]?.count, 4);
	assert.equal(
		ngrams(corpus, { n: 2 }).some((row) => row.key.includes("contract")),
		true,
	);
	const collocates = collocations(
		corpus,
		{ kind: "lemma", lemma: "contract" },
		{ measure: "logdice" },
	);
	assert.equal(
		collocates.some((row) => row.collocate === "terms"),
		true,
	);
	const focus = createCorpus(docs.slice(0, 2));
	const reference = createCorpus(docs.slice(2));
	assert.equal(
		keyness(focus, reference).some((row) => row.item === "the"),
		true,
	);
});

test("computes dispersion, terms, lexicographic examples, stylometry, reuse, and diachrony", () => {
	const corpus = createCorpus(fixtureDocuments(), {
		partitionKeys: ["domain", "year"],
	});
	assert.deepEqual(
		dispersion(
			corpus,
			{ kind: "lemma", lemma: "contract" },
			{ partitionKey: "domain" },
		).map((row) => row.partition),
		["history", "legal"],
	);
	assert.equal(
		extractTerms(corpus, { maxNgram: 2 }).some(
			(candidate) => candidate.term === "contract",
		),
		true,
	);
	assert.equal(wordSketch(corpus, "contract").relations.length > 0, true);
	assert.equal(
		goodDictionaryExamples(corpus, {
			kind: "lemma",
			lemma: "contract",
		})[0]?.node.toLocaleLowerCase("und"),
		"contract",
	);
	const profile = stylometricProfile(corpus);
	assert.equal(profile.documents.length, 3);
	assert.equal(documentSimilarityMatrix(corpus).length, 3);
	assert.equal(Object.keys(lexicalDiversity(corpus)).length, 3);
	assert.equal(detectReuse(corpus, { shingleSize: 2 }).length > 0, true);
	const trends = diachronicTrends(corpus, {
		periodKey: "year",
		query: { kind: "lemma", lemma: "contract" },
	});
	assert.deepEqual(
		trends.map((row) => row.period),
		["2020", "2021", "2022"],
	);
});

test("creates corpora from textdata-compatible dataset values", async () => {
	const corpus = await createCorpusFromDataset({
		id: "dataset",
		metadata: { source: "fixture" },
		records: fixtureDocuments(),
	});
	assert.equal(corpus.metadata.datasetId, "dataset");
	assert.equal(corpus.documents.length, 3);
	class Metadata {
		readonly source = "override";
	}
	await assert.rejects(
		() =>
			createCorpusFromDataset(
				{
					id: "dataset",
					metadata: { source: "fixture" },
					records: fixtureDocuments(),
				},
				{ metadata: new Metadata() },
			),
		/TEXTCORPUS_JSON_VALUE/,
	);
});

test("supports whitespace fallback only when explicitly requested", () => {
	const doc = makeDocument(
		"plain",
		"Loose text only",
		[token("Loose", "loose"), token("text", "text"), token("only", "only")],
		{},
	);
	const withoutLayer = { ...doc, layers: {} };
	assert.throws(
		() => createCorpus([withoutLayer]),
		/TEXTCORPUS_TOKEN_LAYER_MISSING/,
	);
	const corpus = createCorpus([withoutLayer], { tokenSource: "whitespace" });
	assert.equal(corpus.indexes.tokens, 3);
});

test("exposes document-term rows for corpus-side task-map support", () => {
	const corpus = createCorpus(fixtureDocuments(), {
		partitionKeys: ["domain", "year"],
	});
	const rows = documentTermMatrix(corpus);
	assert.equal(
		rows.some((row) => row.docId === "doc-a" && row.item === "contract"),
		true,
	);
});
