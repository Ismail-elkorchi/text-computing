import assert from "node:assert/strict";
import test from "node:test";

import { createDocument } from "@ismail-elkorchi/textdoc";

import {
	addToIndex,
	analyze,
	analyzerFromPack,
	createAnalyzer,
	createIndex,
	explain,
	facet,
	parseCql,
	search,
	searchAnalyzerResourcesFromPack,
	searchIndexFromPack,
	searchIndexSchemaFromPack,
	serializeCql,
	suggest,
	termVector,
} from "../dist/index.js";
import { badSpanDocument, fixtureDocuments } from "./fixtures/documents.ts";

async function sha256(text: string): Promise<string> {
	const bytes = new TextEncoder().encode(text);
	const digest = await crypto.subtle.digest("SHA-256", bytes);
	return [...new Uint8Array(digest)]
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("");
}

async function fileBackedTextResource(path: string, text: string) {
	return {
		kind: "file-backed-resource",
		packageName: "@ismail-elkorchi/textpack-search-test",
		packageRoot: "file:///fixture/",
		path,
		encoding: "utf8",
		checksum: `sha256:${await sha256(text)}`,
		byteLength: new TextEncoder().encode(text).byteLength,
	} as const;
}

function textResourceReader(records: Readonly<Record<string, string>>) {
	return {
		readText({
			descriptor,
		}: {
			readonly descriptor: { readonly path: string };
		}): string {
			const text = records[descriptor.path];
			if (text === undefined) {
				throw new Error(`missing fixture resource ${descriptor.path}`);
			}
			return text;
		},
	};
}

function searchProfilePack(profile: Readonly<Record<string, unknown>>) {
	const resourceId = "search-profile";
	return {
		manifest: {
			id: "pack:search:adapter-test",
			packageName: "@ismail-elkorchi/textpack-search-adapter-test",
			targets: { languages: ["und"] },
			resources: [
				{
					id: resourceId,
					kind: "search-profile" as const,
					format: "json",
					schemaId: "textsearch.analyzer-profile.v1",
				},
			],
			capabilitySlots: [
				{
					slot: "search",
					status: "task-supported" as const,
					tier: "baseline" as const,
					resourceIds: [resourceId],
					bindings: [
						{
							role: "profile" as const,
							resourceId,
							schemaId: "textsearch.analyzer-profile.v1",
							required: true,
						},
					],
				},
			],
		},
		resources: { [resourceId]: JSON.stringify(profile) },
	};
}

function searchProfile(
	overrides: Readonly<Record<string, unknown>> = {},
): Readonly<Record<string, unknown>> {
	return {
		schemaVersion: "1",
		kind: "search-profile",
		analyzerId: "adapter-test",
		tokenizer: { type: "unicode-word-boundary" },
		...overrides,
	};
}

async function assertUnsupportedSearchProfile(
	profile: Readonly<Record<string, unknown>>,
	message: RegExp,
): Promise<void> {
	await assert.rejects(() => analyzerFromPack(searchProfilePack(profile)), {
		name: "TypeError",
		message,
	});
}

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
		analyze(analyzer, "Contract and terms").map((token) => token.position),
		[0, 0, 2],
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

test("preserves analyzer positions and applies field analyzers to queries", () => {
	const analyzer = createAnalyzer(
		[
			{ kind: "tokenizer", mode: "unicode-word" },
			{ kind: "normalizer", form: "nfkc-casefold" },
			{ kind: "stopwords", words: ["the"] },
			{ kind: "stemmer", map: { contracts: "contract", clauses: "clause" } },
			{ kind: "synonym", map: { contract: ["agreement"] } },
		],
		{ id: "position-query-analyzer" },
	);
	let index = createIndex({
		id: "position-query-index",
		fields: {
			body: {
				source: { kind: "view", viewId: "raw" },
				analyzer,
			},
		},
	});
	for (const [id, text] of [
		["gap", "quick the fox"],
		["tight", "quick fox"],
		["synonym", "contract clauses"],
	] as const) {
		index = addToIndex(index, createDocument(text, { id }));
	}
	assert.deepEqual(
		search(index, {
			kind: "phrase",
			field: "body",
			terms: ["quick", "the", "fox"],
		}).map((result) => result.docId),
		["gap"],
	);
	assert.deepEqual(
		search(index, {
			kind: "phrase",
			field: "body",
			terms: ["agreement", "clauses"],
		}).map((result) => result.docId),
		["synonym"],
	);
	assert.deepEqual(
		search(index, { kind: "term", field: "body", term: "contracts" }).map(
			(result) => result.docId,
		),
		["synonym"],
	);
});

test("search profile textpack resources materialize through the adapter", async () => {
	const profileText = JSON.stringify({
		schemaVersion: "1",
		kind: "search-profile",
		analyzerId: "fr-basic",
		languageTag: "fr",
		script: "Latn",
		tokenizer: { type: "unicode-word-boundary", mode: "default" },
		tokenFilters: [
			{ componentId: "casefold", type: "casefold" },
			{ componentId: "accent-fold", type: "diacritic-fold" },
		],
		fields: [{ fieldName: "text", analyzerRole: "index" }],
	});
	const pack = {
		manifest: {
			id: "pack:search:profile",
			packageName: "@ismail-elkorchi/textpack-search-profile-test",
			targets: { languages: ["fr"] },
			resources: [
				{
					id: "search-fr-profile",
					kind: "search-profile" as const,
					format: "json",
					schemaId: "textsearch.analyzer-profile.v1",
				},
			],
			capabilitySlots: [
				{
					slot: "search",
					status: "task-supported" as const,
					tier: "baseline" as const,
					resourceIds: ["search-fr-profile"],
					bindings: [
						{
							role: "profile" as const,
							resourceId: "search-fr-profile",
							schemaId: "textsearch.analyzer-profile.v1",
							required: true,
						},
					],
				},
			],
		},
		resources: {
			"search-fr-profile": await fileBackedTextResource(
				"resources/search-fr.json",
				profileText,
			),
		},
	};
	const resources = await searchAnalyzerResourcesFromPack(pack, {
		reader: textResourceReader({ "resources/search-fr.json": profileText }),
	});
	assert.deepEqual(resources[0]?.payload, {
		type: "json",
		value: {
			schemaVersion: "1",
			kind: "search-profile",
			analyzerId: "fr-basic",
			languageTag: "fr",
			script: "Latn",
			tokenizer: { type: "unicode-word-boundary", mode: "default" },
			tokenFilters: [
				{ componentId: "casefold", type: "casefold" },
				{ componentId: "accent-fold", type: "diacritic-fold" },
			],
			fields: [{ fieldName: "text", analyzerRole: "index" }],
		},
	});
	const analyzer = await analyzerFromPack(pack, {
		reader: textResourceReader({ "resources/search-fr.json": profileText }),
	});
	assert.deepEqual(
		analyze(analyzer, "Été").map((token) => token.term),
		["ete"],
	);
	const schema = await searchIndexSchemaFromPack(pack, {
		reader: textResourceReader({ "resources/search-fr.json": profileText }),
	});
	assert.equal(schema.defaultAnalyzer?.id, "fr-basic");
	const emptyIndex = await searchIndexFromPack(pack, {
		reader: textResourceReader({ "resources/search-fr.json": profileText }),
	});
	assert.equal(emptyIndex.fields.text?.analyzerId, "fr-basic");
});

test("search profile adapter rejects unsupported char filter types", async () => {
	await assertUnsupportedSearchProfile(
		searchProfile({
			charFilters: [{ componentId: "apostrophes", type: "character-policy" }],
		}),
		/Unsupported analyzer profile char filter type "character-policy"/,
	);
});

test("search profile adapter rejects unsupported tokenizer types", async () => {
	await assertUnsupportedSearchProfile(
		searchProfile({
			tokenizer: {
				componentId: "dictionary",
				type: "dictionary-tokenization",
			},
		}),
		/Unsupported analyzer profile tokenizer type "dictionary-tokenization"/,
	);
});

test("search profile adapter rejects unsupported token filter types", async () => {
	await assertUnsupportedSearchProfile(
		searchProfile({
			tokenFilters: [{ componentId: "wordlist", type: "wordlist-membership" }],
		}),
		/Unsupported analyzer profile token filter type "wordlist-membership"/,
	);
});

test("search profile adapter executes Arabic mark filters", async () => {
	const analyzer = await analyzerFromPack(
		searchProfilePack(
			searchProfile({
				tokenFilters: [
					{ componentId: "arabic-marks", type: "arabic-mark-policy" },
				],
			}),
		),
	);
	assert.deepEqual(
		analyze(analyzer, "مَـرْحَبًا").map((token) => token.term),
		["مرحبا"],
	);
});

test("search textpack adapter selects analyzer profiles from task bindings", async () => {
	const profileA = JSON.stringify({
		schemaVersion: "1",
		kind: "search-profile",
		analyzerId: "profile-a",
		tokenizer: { type: "unicode-word-boundary" },
	});
	const profileB = JSON.stringify({
		schemaVersion: "1",
		kind: "search-profile",
		analyzerId: "profile-b",
		tokenizer: { type: "unicode-word-boundary" },
	});
	const pack = {
		manifest: {
			id: "pack:search:binding-selection",
			packageName: "@ismail-elkorchi/textpack-search-binding-selection",
			targets: { languages: ["en"] },
			resources: [
				{
					id: "profile-a",
					kind: "search-profile" as const,
					format: "json",
					schemaId: "textsearch.analyzer-profile.v1",
				},
				{
					id: "profile-b",
					kind: "search-profile" as const,
					format: "json",
					schemaId: "textsearch.analyzer-profile.v1",
				},
			],
			capabilitySlots: [
				{
					slot: "search",
					status: "task-supported" as const,
					tier: "baseline" as const,
					resourceIds: ["profile-b"],
					bindings: [
						{
							role: "profile" as const,
							resourceId: "profile-b",
							schemaId: "textsearch.analyzer-profile.v1",
							required: true,
						},
					],
				},
			],
		},
		resources: {
			"profile-a": profileA,
			"profile-b": profileB,
		},
	};
	assert.equal((await analyzerFromPack(pack)).id, "profile-b");
	await assert.rejects(
		() => analyzerFromPack(pack, { resourceId: "profile-a" }),
		/not bound for slot search/,
	);
	const ambiguousPack = {
		...pack,
		manifest: {
			...pack.manifest,
			capabilitySlots: [
				{
					slot: "search",
					status: "task-supported" as const,
					tier: "baseline" as const,
					resourceIds: ["profile-a", "profile-b"],
					bindings: [
						{
							role: "profile" as const,
							resourceId: "profile-a",
							schemaId: "textsearch.analyzer-profile.v1",
							required: true,
						},
						{
							role: "profile" as const,
							resourceId: "profile-b",
							schemaId: "textsearch.analyzer-profile.v1",
							required: true,
						},
					],
				},
			],
		},
	};
	await assert.rejects(
		() => analyzerFromPack(ambiguousPack),
		/ambiguous task resource bindings/,
	);
	assert.equal(
		(await analyzerFromPack(ambiguousPack, { resourceId: "profile-a" })).id,
		"profile-a",
	);
	const missingBindingPack = {
		...pack,
		manifest: {
			...pack.manifest,
			capabilitySlots: [
				{
					slot: "search",
					status: "task-supported" as const,
					tier: "baseline" as const,
					resourceIds: ["profile-a"],
				},
			],
		},
	};
	await assert.rejects(
		() => analyzerFromPack(missingBindingPack),
		/no task resource bindings for slot search/,
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

test("ranks only positive analyzed and expanded terms and facets post-filter hits", () => {
	const index = fixtureIndex();
	const rankedTerms: string[][] = [];
	search(
		index,
		{
			kind: "boolean",
			must: [{ kind: "term", field: "body", term: "clauses" }],
			filter: [{ kind: "term", field: "body", term: "legal" }],
			mustNot: [{ kind: "term", field: "body", term: "archive" }],
		},
		{
			ranking: {
				kind: "dfr",
				id: "capture-positive-terms",
				score: (context) => {
					rankedTerms.push([...context.queryTerms]);
					return context.queryTerms.length;
				},
			},
		},
	);
	assert.ok(
		rankedTerms.every(
			(terms) =>
				terms.includes("clause") &&
				!terms.includes("legal") &&
				!terms.includes("archive"),
		),
	);
	const expandedTerms: string[][] = [];
	search(
		index,
		{ kind: "prefix", field: "body", prefix: "CONTR" },
		{
			ranking: {
				kind: "dfr",
				id: "capture-expanded-terms",
				score: (context) => {
					expandedTerms.push([...context.queryTerms]);
					return 1;
				},
			},
		},
	);
	assert.ok(expandedTerms.every((terms) => terms.includes("contract")));
	const filtered = search(
		index,
		{ kind: "all" },
		{
			filters: [{ kind: "metadata", key: "domain", value: "legal" }],
			facets: [{ metadataKey: "domain" }],
		},
	);
	assert.deepEqual(filtered[0]?.facets?.[0]?.buckets, [
		{ value: "legal", count: 2 },
	]);
});

test("incrementally indexes a scale fixture without rebuilding prior documents", () => {
	const analyzer = createAnalyzer([
		{ kind: "tokenizer", mode: "unicode-word" },
		{ kind: "normalizer", form: "nfkc-casefold" },
	]);
	let index = createIndex({
		id: "scale-index",
		fields: {
			body: { source: { kind: "view", viewId: "raw" }, analyzer },
		},
	});
	const emptyIndex = index;
	const started = performance.now();
	for (let documentId = 0; documentId < 750; documentId += 1) {
		index = addToIndex(
			index,
			createDocument(`common unique${documentId}`, {
				id: `scale-${documentId}`,
			}),
		);
	}
	const elapsed = performance.now() - started;
	assert.equal(emptyIndex.stats.documentCount, 0);
	assert.equal(index.stats.documentCount, 750);
	assert.equal(index.stats.documentFrequencies["body\u0000common"], 750);
	assert.deepEqual(
		search(index, { kind: "term", field: "body", term: "unique749" }).map(
			(result) => result.docId,
		),
		["scale-749"],
	);
	const beforeReplacement = index;
	index = addToIndex(
		index,
		createDocument("common replacement", { id: "scale-749" }),
		{ onDuplicate: "replace" },
	);
	assert.equal(index.stats.documentCount, 750);
	assert.equal(index.stats.documentFrequencies["body\u0000common"], 750);
	assert.equal(
		search(index, { kind: "term", field: "body", term: "unique749" }).length,
		0,
	);
	assert.equal(
		search(beforeReplacement, {
			kind: "term",
			field: "body",
			term: "unique749",
		}).length,
		1,
	);
	assert.ok(elapsed < 10_000, `incremental indexing took ${elapsed}ms`);
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
	class Metadata {
		readonly created = "2020-01-01";
	}
	assert.throws(
		() =>
			createIndex({
				fields: { body: { source: { kind: "view", viewId: "raw" } } },
				metadata: { created: new Date() },
			}),
		/TEXTSEARCH_JSON_VALUE/,
	);
	assert.throws(
		() =>
			createIndex(
				{
					fields: { body: { source: { kind: "view", viewId: "raw" } } },
				},
				{ metadata: new Metadata() },
			),
		/TEXTSEARCH_JSON_VALUE/,
	);
	assert.throws(
		() =>
			createIndex({
				fields: { body: { source: { kind: "view", viewId: "raw" } } },
				metadata: new Metadata(),
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
