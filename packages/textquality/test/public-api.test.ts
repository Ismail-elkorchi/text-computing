import assert from "node:assert/strict";
import test from "node:test";

import * as annotation from "../dist/annotation/mod.js";
import * as corpus from "../dist/corpus/mod.js";
import * as document from "../dist/document/mod.js";
import * as api from "../dist/index.js";
import * as noisy from "../dist/noisy/mod.js";
import * as ocr from "../dist/ocr/mod.js";
import * as readability from "../dist/readability/mod.js";
import * as report from "../dist/report/mod.js";
import * as style from "../dist/style/mod.js";

test("root exports the final textquality API", () => {
	assert.deepEqual(
		Object.keys(api).sort(),
		[
			"TextQualityError",
			"analyzeCorpusQuality",
			"analyzeDocumentQuality",
			"analyzeDocumentQualityFromPack",
			"annotateQuality",
			"assertJsonObject",
			"assertJsonValue",
			"buildQualityReport",
			"packageName",
			"qualityEvidence",
			"qualityProfileFromPack",
			"qualityResourcesFromPack",
		].sort(),
	);
});

test("required final subpaths are importable", () => {
	assert.equal(typeof document.analyzeDocumentQuality, "function");
	assert.equal(typeof document.languageMixQualityFindings, "function");
	assert.equal(typeof document.morphologyCoverageQualityFindings, "function");
	assert.equal(typeof corpus.analyzeCorpusQuality, "function");
	assert.equal(typeof ocr.ocrQualityFindings, "function");
	assert.equal(typeof noisy.noisyTextQualityFindings, "function");
	assert.equal(typeof readability.readabilityMetrics, "function");
	assert.equal(typeof style.styleQualityFindings, "function");
	assert.equal(typeof annotation.annotationQualityFindings, "function");
	assert.equal(typeof report.buildQualityReport, "function");
});
