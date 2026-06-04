import assert from "node:assert/strict";
import test from "node:test";

import {
	addToIndex,
	analyze,
	createAnalyzer,
	createIndex,
	explain,
	facet,
	parseCql,
	search,
	serializeCql,
	suggest,
	termVector,
} from "../dist/index.js";
import { badSpanDocument, fixtureDocuments } from "./fixtures/documents.ts";

function fixtureAnalyzer() {
	return createAnalyzer(
		[
			{ kind: "tokenizer", mode: "unicode-word" },
			{ kind: "normalizer", form: "nfkc-casefold" },
			{ kind: "stopwords", words: ["the", "and"] },
			{ kind: "stemmer", map: { clauses: "clause", terms: "term" } },
		],
		{ id: "fixture-analyzer" },
	);
}

function fixtureIndex() {
	const analyzer = fixtureAnalyzer();
	let index = createIndex({
		id: "fixture-search",
		defaultAnalyzer: analyzer,
		fields: {
			body: {
				source: { kind: "view", viewId: "raw" },
				analyzer,
				store: true,
				highlight: true,
				boost: 2,
			},
			lemmas: {
				source: {
					kind: "annotation",
					layerId: "tokens",
					annotationType: "token.word",
					valueKey: "lemma",
				},
				analyzer,
				filterable: true,
			},
			domain: {
				source: { kind: "metadata", key: "domain" },
				analyzer,
				facetable: true,
				filterable: true,
			},
			year: {
				source: { kind: "metadata", key: "year" },
				facetable: true,
				filterable: true,
			},
			grams: {
				source: { kind: "view", viewId: "raw" },
				analyzer,
				characterNgram: { min: 3, max: 4 },
			},
		},
	});
	for (const doc of fixtureDocuments()) {
		index = addToIndex(index, doc, {
			metadataBoosts: doc.id === "doc-b" ? { importance: 0.25 } : {},
		});
	}
	return index;
}

test("analyzes strings and TextDocument inputs with deterministic components", () => {
	const analyzer = createAnalyzer(
		[
			{ kind: "tokenizer", mode: "unicode-word" },
			{ kind: "normalizer", form: "nfkc-casefold" },
			{ kind: "stopwords", words: ["and"] },
			{ kind: "synonym", map: { contract: ["agreement"] } },
			{ kind: "payload", payload: { source: "test" } },
		],
		{ id: "analysis" },
	);
	assert.deepEqual(
		analyze(analyzer, "Contract and terms").map((token) => token.term),
		["agreement", "contract", "terms"],
	);
	assert.deepEqual(
		analyze(analyzer, fixtureDocuments()[0], { tokenLayerId: "tokens" }).map(
			(token) => token.term,
		),
		["agreement", "contract", "terms", "protect", "legal", "rights"],
	);
	assert.equal(analyze(analyzer, "Contract")[0]?.payload?.source, "test");
	const resourceAnalyzer = createAnalyzer(
		[
			{ kind: "tokenizer", mode: "unicode-word" },
			{ kind: "normalizer", form: "nfkc-casefold" },
			{ kind: "lexicon", map: { contract: "agreement" } },
			{
				kind: "fst",
				id: "strip-final-s",
				transducer: {
					apply: (term) => (term.endsWith("s") ? term.slice(0, -1) : undefined),
				},
			},
		],
		{ id: "resource-analyzer" },
	);
	assert.deepEqual(
		analyze(resourceAnalyzer, "Contracts").map((token) => token.term),
		["contract", "contracts"],
	);
	assert.deepEqual(
		analyze(resourceAnalyzer, "Contract").map((token) => token.term),
		["agreement", "contract"],
	);
});

test("builds fielded positional indexes without mutating source documents", () => {
	const docs = fixtureDocuments();
	const index = fixtureIndex();
	assert.equal(index.id, "fixture-search");
	assert.equal(index.stats.documentCount, 3);
	assert.equal(index.stats.fieldCount, 5);
	assert.equal(index.stats.tokenCount > 0, true);
	assert.deepEqual(
		termVector(index, "doc-b", "body").find(
			(entry) => entry.term === "contract",
		),
		{
			term: "contract",
			count: 2,
			positions: [1, 4],
			spans: [
				{
					fieldId: "body",
					term: "contract",
					startCU: 6,
					endCU: 14,
					position: 1,
					viewId: "raw",
				},
				{
					fieldId: "body",
					term: "contract",
					startCU: 28,
					endCU: 36,
					position: 4,
					viewId: "raw",
				},
			],
		},
	);
	assert.equal(Object.isFrozen(index), true);
	assert.equal(
		docs[0]?.layers.tokens?.annotations["tok-0"]?.value?.text,
		"Contract",
	);
});

test("runs term, phrase, proximity, wildcard, prefix, suffix, fuzzy, regex, metadata, annotation, and range queries", () => {
	const index = fixtureIndex();
	assert.deepEqual(
		search(index, { kind: "term", field: "body", term: "contract" }).map(
			(result) => result.docId,
		),
		["doc-b", "doc-a"],
	);
	assert.deepEqual(
		search(index, {
			kind: "phrase",
			field: "body",
			terms: ["legal", "contract"],
		}).map((result) => result.docId),
		["doc-b"],
	);
	assert.deepEqual(
		search(index, {
			kind: "proximity",
			field: "body",
			terms: ["contract", "rights"],
			window: 5,
		}).map((result) => result.docId),
		["doc-a"],
	);
	assert.equal(
		search(index, { kind: "wildcard", pattern: "contr*" }).length,
		2,
	);
	assert.equal(
		search(index, { kind: "prefix", prefix: "hist" })[0]?.docId,
		"doc-c",
	);
	assert.equal(
		search(index, { kind: "suffix", suffix: "view" })[0]?.docId,
		"doc-b",
	);
	assert.equal(
		search(index, { kind: "fuzzy", term: "contrct" })[0]?.docId,
		"doc-b",
	);
	assert.equal(
		search(index, { kind: "regex", pattern: "^arch" })[0]?.docId,
		"doc-c",
	);
	assert.deepEqual(
		search(index, { kind: "metadata", key: "domain", value: "history" }).map(
			(result) => result.docId,
		),
		["doc-c"],
	);
	assert.equal(
		search(index, { kind: "annotation", layerId: "tokens", type: "token.word" })
			.length,
		3,
	);
	assert.deepEqual(
		search(index, { kind: "range", metadataKey: "year", gte: 2020 }).map(
			(result) => result.docId,
		),
		["doc-b", "doc-a"],
	);
});

test("applies boolean queries, filters, ranking models, boosts, facets, highlights, suggestions, and explanations", () => {
	const index = fixtureIndex();
	const results = search(
		index,
		{
			kind: "boolean",
			must: [{ kind: "term", term: "contract" }],
			filter: [{ kind: "metadata", key: "domain", value: "legal" }],
			mustNot: [{ kind: "term", term: "archive" }],
		},
		{
			filters: [{ kind: "range", metadataKey: "year", gte: 2021 }],
			staticBoosts: [{ metadataKey: "domain", value: "legal", boost: 0.1 }],
			rerankHooks: [
				{
					id: "finite",
					rerank: (context) => context.baseScore + 0.01,
				},
			],
			highlight: { fragmentSize: 40 },
			facets: [{ metadataKey: "domain", includeMissing: true }],
			explain: true,
		},
	);
	assert.deepEqual(
		results.map((result) => result.docId),
		["doc-b", "doc-a"],
	);
	assert.match(
		results[0]?.highlights?.[0]?.markedText ?? "",
		/<mark>contract<\/mark>/i,
	);
	assert.deepEqual(results[0]?.facets?.[0]?.buckets[0], {
		value: "legal",
		count: 2,
	});
	assert.equal(results[0]?.explanation?.model, "bm25");
	assert.equal(suggest(index, "contrct")[0]?.term, "contract");
	assert.deepEqual(facet(index, { metadataKey: "domain" }).buckets, [
		{ value: "legal", count: 2 },
		{ value: "history", count: 1 },
	]);
	for (const ranking of [
		{ kind: "boolean" as const },
		{ kind: "tfidf" as const },
		{ kind: "bm25" as const },
		{ kind: "bm25f" as const, fieldWeights: { body: 2 } },
		{ kind: "language-model" as const },
		{
			kind: "dfr" as const,
			id: "hook",
			score: () => 7,
		},
	]) {
		assert.equal(
			Number.isFinite(
				search(index, { kind: "term", term: "contract" }, { ranking })[0]
					?.score,
			),
			true,
		);
	}
	const explanation = explain(
		index,
		{ kind: "term", term: "contract" },
		"doc-b",
	);
	assert.equal(explanation.matchingTerms.includes("contract"), true);
	assert.equal(Number.isFinite(explanation.score), true);
});

test("parses CQL into structured queries and serializes common query forms", () => {
	const index = fixtureIndex();
	const query = parseCql('body:contract AND "legal contract"');
	assert.deepEqual(
		search(index, query).map((result) => result.docId),
		["doc-b"],
	);
	assert.equal(serializeCql({ kind: "prefix", prefix: "contr" }), "contr*");
});

test("rejects unsafe JSON metadata and non-UTF-16 spans before slicing", () => {
	assert.throws(
		() =>
			createIndex({
				fields: { body: { source: { kind: "view", viewId: "raw" } } },
				metadata: { created: new Date() },
			}),
		/TEXTSEARCH_JSON_VALUE/,
	);
	const index = createIndex({
		fields: {
			tokenText: {
				source: {
					kind: "annotation",
					layerId: "tokens",
					annotationType: "token.word",
				},
			},
		},
	});
	assert.throws(
		() => addToIndex(index, badSpanDocument()),
		/TEXTSEARCH_SPAN_UNIT/,
	);
});
