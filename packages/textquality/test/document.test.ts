import assert from "node:assert/strict";
import test from "node:test";
import { createDocument } from "@ismail-elkorchi/textdoc";

import {
	analyzeDocumentQuality,
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

test("script profiles use Unicode script semantics", () => {
	const arabic = createDocument("مَرْحَبًا بالعالم ١٢٣", {
		id: "arabic-script",
		metadata: { language: "ar" },
	});
	const report = analyzeDocumentQuality(arabic, {
		dimensions: ["script-mix"],
		profile: { expectedScripts: ["Arab"] },
	});
	assert.equal(
		report.findings.some(
			(finding) =>
				finding.kind === "script.mixed-token" ||
				finding.kind === "script.unexpected",
		),
		false,
	);
});

test("document findings have unique evidence-sensitive ids and bounded volume", () => {
	const document = createDocument("x\u0001".repeat(100), {
		id: "bounded-findings",
	});
	const report = analyzeDocumentQuality(document, {
		dimensions: ["invisible-control"],
		maxFindings: 12,
		maxFindingsPerKind: 7,
	});
	assert.equal(report.findings.length, 7);
	assert.equal(
		new Set(report.findings.map((finding) => finding.id)).size,
		report.findings.length,
	);
	assert.throws(
		() => analyzeDocumentQuality(document, { maxFindings: -1 }),
		/maxFindings must be a non-negative safe integer/u,
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
