import assert from "node:assert/strict";
import test from "node:test";
import { punctuationQualityFindings } from "../dist/document/mod.js";
import {
	assertJsonValue,
	buildQualityReport,
	summarizeQualityReport,
} from "../dist/report/mod.js";
import { noisyDocument } from "./fixtures/documents.ts";

test("report builders produce stable json-safe summary reports", () => {
	const report = buildQualityReport(
		punctuationQualityFindings(noisyDocument()),
		{
			target: "document",
			targetId: "doc",
		},
	);
	assert.equal(report.target, "document");
	assert.ok(Array.isArray(summarizeQualityReport(report).findingKinds));
	assertJsonValue(report);
});
