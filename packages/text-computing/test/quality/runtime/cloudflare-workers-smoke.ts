import { createDocument } from "@ismail-elkorchi/text-computing/document";
import { analyzeDocumentQuality } from "@ismail-elkorchi/text-computing/quality";

const report = analyzeDocumentQuality(
	createDocument("A  B!!!", { id: "workers" }),
);

if (
	!report.findings.some((finding) => finding.kind === "whitespace.repeated")
) {
	throw new Error("workers smoke failed");
}
