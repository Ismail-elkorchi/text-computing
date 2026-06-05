import assert from "node:assert/strict";
import test from "node:test";

import {
	punctuationQualityFindings,
	segmentationQualityFindings,
	unicodeIntegrityQualityFindings,
	whitespaceQualityFindings,
} from "../dist/document/mod.js";
import {
	conflictingAnnotationDocument,
	noisyDocument,
} from "./fixtures/documents.ts";

test("document checks cover integrity whitespace punctuation and segmentation", () => {
	assert.ok(unicodeIntegrityQualityFindings(noisyDocument()).length > 0);
	assert.ok(
		whitespaceQualityFindings(noisyDocument()).some(
			(finding) => finding.kind === "whitespace.repeated",
		),
	);
	assert.ok(
		punctuationQualityFindings(noisyDocument()).some(
			(finding) => finding.kind === "punctuation.repeated",
		),
	);
	assert.ok(
		segmentationQualityFindings(conflictingAnnotationDocument()).some(
			(finding) => finding.kind === "segmentation.non-utf16-span",
		),
	);
});
