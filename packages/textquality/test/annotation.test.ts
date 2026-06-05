import assert from "node:assert/strict";
import test from "node:test";

import { annotationQualityFindings } from "../dist/annotation/mod.js";
import { conflictingAnnotationDocument } from "./fixtures/documents.ts";

test("annotation checks report conflicts and span unit issues", () => {
	const findings = annotationQualityFindings(conflictingAnnotationDocument());
	const kinds = new Set(findings.map((finding) => finding.kind));
	assert.ok(kinds.has("annotation.conflict.overlap"));
	assert.ok(kinds.has("annotation.non-utf16-span"));
});
