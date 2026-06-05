import assert from "node:assert/strict";
import test from "node:test";

import { buildWordlist } from "@ismail-elkorchi/textlex";
import { annotationQualityFindings } from "../dist/annotation/mod.js";
import {
	punctuationQualityFindings,
	segmentationQualityFindings,
} from "../dist/document/mod.js";
import {
	analyzeCorpusQuality,
	analyzeDocumentQuality,
	annotateQuality,
	assertJsonValue,
} from "../dist/index.js";
import {
	lexicalDiversityMetrics,
	readabilityMetrics,
} from "../dist/readability/mod.js";
import { buildQualityReport } from "../dist/report/mod.js";
import { fixtureCorpus } from "./fixtures/corpora.ts";
import {
	conflictingAnnotationDocument,
	noisyDocument,
} from "./fixtures/documents.ts";

test("analyzes document quality across section 19 dimensions", () => {
	const wordlist = buildWordlist(["Acme", "quality", "Footer", "line"], {
		id: "fixture-en-wordlist",
		casefold: true,
		language: "en",
	});
	const frenchWordlist = buildWordlist(["qual", "ity"], {
		id: "fixture-fr-wordlist",
		casefold: true,
		language: "fr",
	});
	const report = analyzeDocumentQuality(noisyDocument(), {
		wordlists: [wordlist, frenchWordlist],
		profile: {
			id: "strict-review",
			expectedLanguages: ["en"],
			thresholds: {
				"readiness.warning_count": 0,
				"lexical.oov_rate": 0.1,
			},
		},
		styleRules: [
			{
				id: "style-acme",
				kind: "brand-spacing",
				message: "Brand spacing review",
				pattern: "Acme\\s{2,}Corp",
			},
		],
	});
	const kinds = new Set(report.findings.map((finding) => finding.kind));
	assert.equal(report.target, "document");
	assert.ok(kinds.has("unicode.default-ignorable"));
	assert.ok(kinds.has("whitespace.repeated"));
	assert.ok(kinds.has("punctuation.repeated"));
	assert.ok(kinds.has("ocr.line-break-hyphenation"));
	assert.ok(kinds.has("noisy.repeated-character"));
	assert.ok(kinds.has("lexical.oov-profile"));
	assert.ok(kinds.has("language.mixed-profile"));
	assert.ok(kinds.has("morphology.coverage-missing"));
	assert.ok(kinds.has("style.brand-spacing"));
	assert.ok(kinds.has("annotation.sparsity.empty-layer"));
	assert.ok(kinds.has("readiness.processing-risk"));
	assert.equal(Number.isFinite(report.metrics["findings.total"]), true);
	assert.equal(Number.isFinite(report.metrics["readability.word_count"]), true);
	assertJsonValue(report);
});

test("adds quality annotations without removing existing layers", () => {
	const doc = noisyDocument();
	const annotated = annotateQuality(doc, {
		minSeverity: "warning",
		maxAnnotations: 3,
	});
	assert.ok(annotated.layers["quality.findings"]);
	assert.ok(annotated.layers["token.word"]);
	assert.equal(doc.layers["quality.findings"], undefined);
	assert.ok(
		Object.keys(annotated.layers["quality.findings"]?.annotations ?? {})
			.length > 0,
	);
});

test("reports annotation conflicts and span unit issues", () => {
	const doc = conflictingAnnotationDocument();
	const findings = annotationQualityFindings(doc);
	const segmentation = segmentationQualityFindings(doc);
	assert.ok(
		findings.some((finding) => finding.kind === "annotation.conflict.overlap"),
	);
	assert.ok(
		segmentation.some(
			(finding) => finding.kind === "segmentation.non-utf16-span",
		),
	);
});

test("computes corpus quality over structural corpus input", () => {
	const report = analyzeCorpusQuality(fixtureCorpus(), {
		requiredMetadataKeys: ["language", "domain"],
		balanceKeys: ["language"],
		expectedDocumentIds: ["a", "b", "c"],
	});
	const kinds = new Set(report.findings.map((finding) => finding.kind));
	assert.ok(kinds.has("corpus.duplicate-document-id"));
	assert.ok(kinds.has("corpus.metadata-gap"));
	assert.ok(kinds.has("corpus.imbalance"));
	assert.ok(kinds.has("corpus.missing-document"));
	assert.equal(report.metrics["corpus.document_count"], 3);
	assertJsonValue(report);
});

test("keeps readability and report metrics finite", () => {
	const doc = noisyDocument();
	for (const value of Object.values(readabilityMetrics(doc))) {
		assert.equal(Number.isFinite(value), true);
	}
	for (const value of Object.values(lexicalDiversityMetrics(doc))) {
		assert.equal(Number.isFinite(value), true);
	}
	const report = buildQualityReport(punctuationQualityFindings(doc), {
		target: "document",
		targetId: doc.id,
	});
	for (const value of Object.values(report.metrics)) {
		assert.equal(Number.isFinite(value), true);
	}
});

test("rejects non-json public values", () => {
	assert.throws(
		() => assertJsonValue({ created: new Date("2020-01-01T00:00:00Z") }),
		/TEXTQUALITY_JSON_VALUE/,
	);
	assert.throws(
		() => assertJsonValue({ bad: Number.NaN }),
		/TEXTQUALITY_JSON_NUMBER/,
	);
});
