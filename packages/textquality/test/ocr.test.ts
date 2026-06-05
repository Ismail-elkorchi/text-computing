import assert from "node:assert/strict";
import test from "node:test";

import { ocrQualityFindings } from "../dist/ocr/mod.js";
import { noisyDocument } from "./fixtures/documents.ts";

test("ocr checks report line break and confusion candidates", () => {
	const findings = ocrQualityFindings(noisyDocument(), {
		ocr: { confusionCharacters: ["\u200b"] },
	});
	const kinds = new Set(findings.map((finding) => finding.kind));
	assert.ok(kinds.has("ocr.line-break-hyphenation"));
	assert.ok(kinds.has("ocr.confusion-character"));
});
