import { expect, test } from "bun:test";
import { createDocument } from "@ismail-elkorchi/textdoc";
import { analyzeDocumentQuality } from "../../dist/index.js";

test("bun runtime imports final textquality entrypoint", () => {
	const report = analyzeDocumentQuality(
		createDocument("A  B!!!", { id: "bun" }),
	);
	expect(
		report.findings.some((finding) => finding.kind === "whitespace.repeated"),
	).toBe(true);
});
