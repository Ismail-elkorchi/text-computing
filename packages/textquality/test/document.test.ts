import assert from "node:assert/strict";
import test from "node:test";
import { createDocument } from "@ismail-elkorchi/textdoc";

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

test("punctuation checks respect French spacing and apostrophes", () => {
	const french = createDocument("L'État : d'accord !", {
		id: "fr-punctuation",
		metadata: { language: "fr" },
	});
	const findings = punctuationQualityFindings(french);
	assert.equal(
		findings.some((finding) => finding.kind === "punctuation.leading-space"),
		false,
	);
	assert.equal(
		findings.some((finding) => finding.kind === "punctuation.unbalanced-quote"),
		false,
	);
	const english = createDocument("Wait !", { id: "en-punctuation" });
	assert.equal(
		punctuationQualityFindings(english).some(
			(finding) => finding.kind === "punctuation.leading-space",
		),
		true,
	);
});
