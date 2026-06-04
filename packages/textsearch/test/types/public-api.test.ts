import assert from "node:assert/strict";
import test from "node:test";

import {
	type Analyzer,
	addToIndex,
	createAnalyzer,
	createIndex,
	type FacetRequest,
	type Filter,
	type HighlightOptions,
	type RankingModel,
	type SearchQuery,
	type SuggestionOptions,
	search,
} from "../../dist/index.js";
import { fixtureDocuments } from "../fixtures/documents.ts";

test("public types support analyzer, index, query, rank, filter, facet, highlight, and suggest usage", () => {
	const analyzer: Analyzer = createAnalyzer([
		{ kind: "tokenizer", mode: "unicode-word" },
		{ kind: "normalizer", form: "nfkc-casefold" },
	]);
	const query: SearchQuery = { kind: "term", term: "contract" };
	const ranking: RankingModel = { kind: "bm25f", fieldWeights: { body: 2 } };
	const filter: Filter = { kind: "metadata", key: "domain", value: "legal" };
	const facet: FacetRequest = { metadataKey: "domain" };
	const highlight: HighlightOptions = { fragmentSize: 32 };
	const suggestion: SuggestionOptions = { maxDistance: 2 };
	let index = createIndex({
		fields: {
			body: { source: { kind: "view", viewId: "raw" }, analyzer },
		},
	});
	index = addToIndex(index, fixtureDocuments()[0]);
	assert.equal(
		search(index, query, {
			ranking,
			filters: [filter],
			facets: [facet],
			highlight,
		}).length,
		1,
	);
	assert.equal(suggestion.maxDistance, 2);
});
