import type { TextDocument } from "@ismail-elkorchi/textdoc";
import {
	analyzeCorpusQuality,
	analyzeDocumentQuality,
	annotateQuality,
	type CorpusQualityOptions,
	type DocumentQualityOptions,
	type QualityFinding,
	type QualityReport,
	type StructuralTextCorpus,
} from "../../dist/index.js";
import { noisyDocument } from "../fixtures/documents.ts";

const doc: TextDocument = noisyDocument();
const docOptions: DocumentQualityOptions = {
	dimensions: ["unicode-integrity", "readability"],
};
const report: QualityReport = analyzeDocumentQuality(doc, docOptions);
const findings: readonly QualityFinding[] = report.findings;
const annotated: TextDocument = annotateQuality(doc, docOptions);

const corpus: StructuralTextCorpus = {
	id: "types-corpus",
	documents: [{ id: "doc", metadata: { language: "en" } }],
	indexes: {},
	metadata: {},
};
const corpusOptions: CorpusQualityOptions = {
	requiredMetadataKeys: ["language"],
};
const corpusReport: QualityReport = analyzeCorpusQuality(corpus, corpusOptions);

void findings;
void annotated;
void corpusReport;
