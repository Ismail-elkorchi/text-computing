import { expect, test } from "bun:test";
import { createDocument } from "@ismail-elkorchi/text-computing/document";
import { analyzeDocumentQuality } from "@ismail-elkorchi/text-computing/quality";

test("bun runtime imports final textquality entrypoint", () => {
	const report = analyzeDocumentQuality(
		createDocument("A  B!!!", { id: "bun" }),
	);
	expect(
		report.findings.some((finding) => finding.kind === "whitespace.repeated"),
	).toBe(true);
});
