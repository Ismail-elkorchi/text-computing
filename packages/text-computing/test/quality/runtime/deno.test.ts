import { createDocument } from "@ismail-elkorchi/text-computing/document";
import { analyzeDocumentQuality } from "@ismail-elkorchi/text-computing/quality";

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
