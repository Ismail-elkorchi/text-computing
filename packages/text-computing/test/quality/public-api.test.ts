import assert from "node:assert/strict";
import test from "node:test";
import * as api from "@ismail-elkorchi/text-computing/quality";
import * as annotation from "@ismail-elkorchi/text-computing/quality/annotation";
import * as corpus from "@ismail-elkorchi/text-computing/quality/corpus";
import * as document from "@ismail-elkorchi/text-computing/quality/document";
import * as noisy from "@ismail-elkorchi/text-computing/quality/noisy";
import * as ocr from "@ismail-elkorchi/text-computing/quality/ocr";
import * as readability from "@ismail-elkorchi/text-computing/quality/readability";
import * as report from "@ismail-elkorchi/text-computing/quality/report";
import * as style from "@ismail-elkorchi/text-computing/quality/style";

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
