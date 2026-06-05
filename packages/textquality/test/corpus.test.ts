import assert from "node:assert/strict";
import test from "node:test";

import { analyzeCorpusQuality } from "../dist/corpus/mod.js";
import { fixtureCorpus } from "./fixtures/corpora.ts";

test("corpus checks cover metadata coverage and imbalance", () => {
	const report = analyzeCorpusQuality(fixtureCorpus(), {
		requiredMetadataKeys: ["language", "domain"],
		balanceKeys: ["language"],
		expectedDocumentIds: ["a", "b", "c"],
	});
	const kinds = new Set(report.findings.map((finding) => finding.kind));
	assert.ok(kinds.has("corpus.metadata-gap"));
	assert.ok(kinds.has("corpus.imbalance"));
	assert.ok(kinds.has("corpus.duplicate-document-id"));
	assert.ok(kinds.has("corpus.missing-document"));
});
