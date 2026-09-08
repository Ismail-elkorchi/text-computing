import assert from "node:assert/strict";
import test from "node:test";
import * as api from "@ismail-elkorchi/text-computing/search";
import * as analyzer from "@ismail-elkorchi/text-computing/search/analyzer";
import * as cql from "@ismail-elkorchi/text-computing/search/cql";
import * as facet from "@ismail-elkorchi/text-computing/search/facet";
import * as filter from "@ismail-elkorchi/text-computing/search/filter";
import * as highlight from "@ismail-elkorchi/text-computing/search/highlight";
import * as index from "@ismail-elkorchi/text-computing/search/index";
import * as query from "@ismail-elkorchi/text-computing/search/query";
import * as rank from "@ismail-elkorchi/text-computing/search/rank";
import * as suggest from "@ismail-elkorchi/text-computing/search/suggest";

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
