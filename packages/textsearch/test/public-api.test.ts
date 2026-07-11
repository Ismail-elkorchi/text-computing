import assert from "node:assert/strict";
import test from "node:test";

import * as analyzer from "../dist/analyzer/mod.js";
import * as cql from "../dist/cql/mod.js";
import * as facet from "../dist/facet/mod.js";
import * as filter from "../dist/filter/mod.js";
import * as highlight from "../dist/highlight/mod.js";
import * as index from "../dist/index/mod.js";
import * as api from "../dist/index.js";
import * as query from "../dist/query/mod.js";
import * as rank from "../dist/rank/mod.js";
import * as suggest from "../dist/suggest/mod.js";

test("root exports the final textsearch API only", () => {
	assert.deepEqual(
		Object.keys(api).sort(),
		[
			"TextSearchError",
			"addToIndex",
			"allQuery",
			"andFilter",
			"annotationFilter",
			"annotationQuery",
			"analyze",
			"analyzerFromPack",
			"booleanQuery",
			"createAnalyzer",
			"createIndex",
			"documentFilter",
			"explain",
			"facet",
			"facets",
			"fieldFilter",
			"fieldQuery",
			"fuzzyQuery",
			"highlight",
			"metadataFilter",
			"metadataQuery",
			"noneQuery",
			"notFilter",
			"orFilter",
			"packageName",
			"parseCql",
			"phraseQuery",
			"prefixQuery",
			"proximityQuery",
			"queryFilter",
			"rangeFilter",
			"rangeQuery",
			"regexQuery",
			"scoreBm25",
			"scoreBm25f",
			"scoreBoolean",
			"scoreLanguageModel",
			"scoreTfIdf",
			"search",
			"searchAnalyzerResourcesFromPack",
			"searchIndexFromPack",
			"searchIndexSchemaFromPack",
			"serializeCql",
			"suffixQuery",
			"suggest",
			"termQuery",
			"termVector",
			"termsQuery",
			"wildcardQuery",
		].sort(),
	);
});

test("required final subpaths are importable", () => {
	assert.equal(typeof analyzer.createAnalyzer, "function");
	assert.equal(typeof index.createIndex, "function");
	assert.equal(typeof index.termVector, "function");
	assert.equal(typeof query.termQuery, "function");
	assert.equal(typeof query.wildcardQuery, "function");
	assert.equal(typeof rank.scoreBm25, "function");
	assert.equal(typeof filter.metadataFilter, "function");
	assert.equal(typeof facet.facet, "function");
	assert.equal(typeof highlight.highlight, "function");
	assert.equal(typeof suggest.suggest, "function");
	assert.equal(typeof cql.parseCql, "function");
});
