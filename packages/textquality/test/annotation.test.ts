import assert from "node:assert/strict";
import test from "node:test";
import { addLayer, createDocument } from "@ismail-elkorchi/textdoc";

import { annotationQualityFindings } from "../dist/annotation/mod.js";
import {
	conflictingAnnotationDocument,
	evidence,
} from "./fixtures/documents.ts";

test("annotation checks report conflicts and span unit issues", () => {
	const findings = annotationQualityFindings(conflictingAnnotationDocument());
	const kinds = new Set(findings.map((finding) => finding.kind));
	assert.ok(kinds.has("annotation.conflict.overlap"));
	assert.ok(kinds.has("annotation.non-utf16-span"));
});

test("overlapping alternatives are valid outside non-overlapping layers", () => {
	const span = {
		viewId: "raw",
		span: { start: 0, end: 5, unit: "utf16-code-unit" as const },
	};
	const doc = addLayer(createDocument("Paris", { id: "morph-alternatives" }), {
		id: "morph.analysis",
		type: "morphology",
		viewId: "raw",
		annotations: {
			noun: {
				id: "noun",
				layer: "morph.analysis",
				type: "morphology",
				spans: [span],
				value: { partOfSpeech: "NOUN" },
				evidence,
			},
			properNoun: {
				id: "properNoun",
				layer: "morph.analysis",
				type: "morphology",
				spans: [span],
				value: { partOfSpeech: "PROPN" },
				evidence,
			},
		},
	});
	assert.equal(
		annotationQualityFindings(doc).some(
			(finding) => finding.kind === "annotation.conflict.overlap",
		),
		false,
	);
	assert.equal(
		annotationQualityFindings(doc, {
			annotation: { nonOverlappingLayerIds: ["morph.analysis"] },
		}).some((finding) => finding.kind === "annotation.conflict.overlap"),
		true,
	);
});
