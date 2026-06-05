import { createDocument } from "@ismail-elkorchi/textdoc";
import { analyzeDocumentQuality } from "../../dist/index.js";

const report = analyzeDocumentQuality(
	createDocument("A  B!!!", { id: "browser" }),
);

if (
	!report.findings.some((finding) => finding.kind === "whitespace.repeated")
) {
	throw new Error("browser smoke failed");
}
