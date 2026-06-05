import assert from "node:assert/strict";
import test from "node:test";

import { createDocument } from "@ismail-elkorchi/textdoc";
import { analyzeDocumentQuality } from "../../dist/index.js";

test("node runtime imports final textquality entrypoint", () => {
	const report = analyzeDocumentQuality(
		createDocument("A  B!!!", { id: "node" }),
	);
	assert.ok(
		report.findings.some((finding) => finding.kind === "whitespace.repeated"),
	);
});
