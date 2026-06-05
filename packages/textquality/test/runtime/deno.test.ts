import { createDocument } from "@ismail-elkorchi/textdoc";
import { analyzeDocumentQuality } from "../../dist/index.js";

Deno.test("deno runtime imports final textquality entrypoint", () => {
	const report = analyzeDocumentQuality(
		createDocument("A  B!!!", { id: "deno" }),
	);
	if (
		!report.findings.some((finding) => finding.kind === "whitespace.repeated")
	) {
		throw new Error("deno smoke failed");
	}
});
