import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  inspectCorpusFixture,
  inspectEvidenceReplay,
  inspectTextdocAnnotations,
  packageName,
  renderCorpusFixtureInspection,
  renderConformanceReportSummary,
  renderEvidenceManifestSummary,
  renderEvidenceReplayInspection,
  renderTextdocAnnotationInspection,
  summarizeConformanceReport,
  summarizeEvidenceManifest,
  summarizeSupportStatus,
} from "../dist/index.js";
import { runTextlabCli } from "../dist/cli.js";

if (packageName !== "@ismail-elkorchi/textlab") {
  throw new Error("package name should remain stable");
}

const supportStatus = {
  schemaVersion: 1,
  packages: [
    {
      name: "@ismail-elkorchi/textfacts",
      status: "beta",
      scope: "Unicode text facts",
      evidence: ["multi-runtime tests"],
      limitations: ["fixture-bound applied NLP integration"],
    },
    {
      name: "@ismail-elkorchi/textlab",
      status: "scaffold",
      scope: "Inspection tooling",
      evidence: ["workspace package"],
      limitations: ["no broad renderer"],
    },
  ],
  tasks: [
    {
      id: "nlp-tokenization-sbd",
      status: "slice-proven",
      scope: "Frozen slices",
      evidence: ["fixtures"],
      limitations: ["not broad multilingual"],
    },
    {
      id: "nlp-dependency-parser",
      status: "slice-proven",
      scope: "Frozen parser arcs",
      evidence: ["fixtures"],
      limitations: ["frozen slices only"],
    },
  ],
};

const summary = summarizeSupportStatus(supportStatus);

if (summary.packageRows.map((row) => row.id).join(",") !== "@ismail-elkorchi/textfacts,@ismail-elkorchi/textlab") {
  throw new Error("package rows should be sorted deterministically");
}

if (summary.taskRows.map((row) => row.id).join(",") !== "nlp-dependency-parser,nlp-tokenization-sbd") {
  throw new Error("task rows should be sorted deterministically");
}

if (summary.counts.map((entry) => `${entry.status}:${entry.count}`).join(",") !== "scaffold:1,slice-proven:2,beta:1") {
  throw new Error("summary counts should be deterministic and complete");
}

let invalidRejected = false;
try {
  summarizeSupportStatus({ schemaVersion: 1, packages: [], tasks: [{ id: "", status: "scaffold" }] });
} catch (error) {
  invalidRejected = error instanceof TypeError && error.message === "support status document is invalid";
}

if (!invalidRejected) {
  throw new Error("invalid support status should be rejected");
}

const evidenceManifest = {
  schemaVersion: 1,
  generatedAt: "2026-05-10T00:00:00.000Z",
  tasks: [
    {
      taskId: "nlp-rule-backed-ner",
      supportStatus: "slice-proven",
      claimBoundary: "Frozen NER slices only.",
      reportPath: "fixtures/reports/nlp-rule-backed-ner/conformance-report.json",
      evidenceRefs: ["fixtures/rule-backed-ner/slices.json"],
      comparatorRefs: ["fixtures/rule-backed-ner/comparisons/spacy-3.8.14.json"],
      knownGaps: ["No entity linking."],
    },
    {
      taskId: "nlp-dependency-parser",
      supportStatus: "slice-proven",
      claimBoundary: "Frozen parser slices only.",
      reportPath: "fixtures/reports/nlp-dependency-parser/conformance-report.json",
      evidenceRefs: ["fixtures/dependency-parser/slices.json"],
      comparatorRefs: ["fixtures/dependency-parser/comparisons/stanza-1.12.json"],
      knownGaps: ["No broad treebank behavior."],
    },
  ],
};

const evidenceSummary = summarizeEvidenceManifest(evidenceManifest);

if (evidenceSummary.rows.map((row) => row.taskId).join(",") !== "nlp-dependency-parser,nlp-rule-backed-ner") {
  throw new Error("task evidence rows should be sorted deterministically");
}

const nerEvidenceRow = evidenceSummary.rows.find((row) => row.taskId === "nlp-rule-backed-ner");

if (
  nerEvidenceRow === undefined ||
  nerEvidenceRow.evidenceRefCount !== 1 ||
  nerEvidenceRow.comparatorRefCount !== 1 ||
  nerEvidenceRow.knownGapCount !== 1 ||
  !nerEvidenceRow.hasComparatorEvidence
) {
  throw new Error("task evidence summary should count evidence, comparators, and known gaps");
}

if (!renderEvidenceManifestSummary(evidenceSummary).includes("nlp-rule-backed-ner [slice-proven] evidence=1 comparators=1 gaps=1")) {
  throw new Error("task evidence renderer should include compact evidence counts");
}

let invalidEvidenceRejected = false;
try {
  summarizeEvidenceManifest({ schemaVersion: 1, generatedAt: "2026-05-10T00:00:00.000Z", tasks: [] });
} catch (error) {
  invalidEvidenceRejected = error instanceof TypeError && error.message === "task evidence manifest is invalid";
}

if (!invalidEvidenceRejected) {
  throw new Error("invalid task evidence manifest should be rejected");
}

const conformanceReport = {
  schemaId: "urn:ismail-elkorchi:textconformance:report:v1",
  schemaVersion: 1,
  reportId: "task-evidence:nlp-rule-backed-ner",
  subject: {
    kind: "task",
    id: "nlp-rule-backed-ner",
    schemaId: "docs/specs/support-status.v1.json",
  },
  generatedAt: "2026-05-10T00:00:00.000Z",
  summary: {
    pass: 3,
    fail: 1,
    notRun: 2,
  },
  checks: [
    { checkId: "fixture", status: "pass" },
    { checkId: "expected", status: "pass" },
    { checkId: "comparator", status: "pass" },
    { checkId: "negative", status: "fail" },
    { checkId: "future-a", status: "not-run" },
    { checkId: "future-b", status: "not-run" },
  ],
};

const conformanceSummary = summarizeConformanceReport(conformanceReport);

if (
  conformanceSummary.reportId !== "task-evidence:nlp-rule-backed-ner" ||
  conformanceSummary.subject !== "task:nlp-rule-backed-ner" ||
  conformanceSummary.pass !== 3 ||
  conformanceSummary.fail !== 1 ||
  conformanceSummary.notRun !== 2 ||
  conformanceSummary.checkCount !== 6
) {
  throw new Error("conformance report summary should preserve report counts and subject identity");
}

if (!renderConformanceReportSummary(conformanceSummary).includes("Fail: 1")) {
  throw new Error("conformance report renderer should include failure counts");
}

let invalidReportRejected = false;
try {
  summarizeConformanceReport({ schemaVersion: 1, reportId: "bad", subject: { kind: "task", id: "x" }, checks: [] });
} catch (error) {
  invalidReportRejected = error instanceof TypeError && error.message === "conformance report is invalid";
}

if (!invalidReportRejected) {
  throw new Error("invalid conformance report should be rejected");
}

const textdocDocument = {
  schemaVersion: 1,
  documentId: "doc:inspection",
  revision: "1",
  textLengthCU: 19,
  units: { text: "utf16-code-unit" },
  views: [{ id: "analysis", kind: "raw" }],
  layers: [
    {
      id: "layer-token",
      kind: "token",
      viewId: "analysis",
      annotations: [
        {
          id: "token-1",
          kind: "token",
          lifecycle: { state: "active" },
          targets: [{ kind: "span", viewId: "analysis", startCU: 0, endCU: 5 }],
          text: "Alice",
        },
        {
          id: "token-2",
          kind: "token",
          lifecycle: { state: "active" },
          targets: [{ kind: "span", viewId: "analysis", startCU: 6, endCU: 11 }],
          text: "knows",
        },
      ],
    },
    {
      id: "layer-entity",
      kind: "entity",
      viewId: "analysis",
      annotations: [
        {
          id: "ent-1",
          kind: "entity",
          lifecycle: { state: "active" },
          targets: [{ kind: "annotation", annotationId: "token-1" }],
          label: "PER",
        },
      ],
    },
    {
      id: "layer-relation",
      kind: "relation",
      viewId: "analysis",
      annotations: [
        {
          id: "rel-1",
          kind: "relation",
          lifecycle: { state: "active" },
          targets: [{ kind: "document" }],
          relationType: "knows",
          arguments: [{ role: "subject", annotationId: "ent-1" }],
        },
      ],
    },
    {
      id: "layer-coreference-chain",
      kind: "coreference-chain",
      viewId: "analysis",
      annotations: [
        {
          id: "chain-1",
          kind: "coreference-chain",
          lifecycle: { state: "active" },
          targets: [{ kind: "document" }],
          mentionIds: ["mention-1", "mention-2"],
          representativeMentionId: "mention-1",
        },
      ],
    },
    {
      id: "layer-dependency",
      kind: "dependency",
      viewId: "analysis",
      annotations: [
        {
          id: "dep-1",
          kind: "dependency",
          lifecycle: { state: "active" },
          targets: [{ kind: "document" }],
          dependentNodeId: "node-1",
          headNodeId: null,
          relation: "root",
          source: {
            sentenceId: "sent-1",
            conlluId: "1",
            conlluHead: "0",
            conlluDeprel: "root",
            conlluDeps: "_",
          },
        },
      ],
    },
  ],
};

const annotationInspection = inspectTextdocAnnotations(textdocDocument, {
  layerKinds: ["relation", "coreference-chain", "dependency"],
});

if (
  annotationInspection.documentId !== "doc:inspection" ||
  annotationInspection.layerCount !== 5 ||
  annotationInspection.annotationCount !== 6 ||
  annotationInspection.rows.map((row) => row.annotationId).join(",") !== "chain-1,dep-1,rel-1" ||
  annotationInspection.graphEdgeCount !== 4
) {
  throw new Error("textdoc annotation inspection should count and query graph annotations deterministically");
}

if (!renderTextdocAnnotationInspection(annotationInspection).includes("relation:rel-1")) {
  throw new Error("textdoc annotation renderer should include queried relation rows");
}

let invalidDocumentRejected = false;
try {
  inspectTextdocAnnotations({ schemaVersion: 1, documentId: "bad", layers: [{ id: "", annotations: [] }] });
} catch (error) {
  invalidDocumentRejected = error instanceof TypeError && error.message === "textdoc document is invalid";
}

if (!invalidDocumentRejected) {
  throw new Error("invalid textdoc documents should be rejected before inspection");
}

const evidenceReplay = {
  schemaVersion: 1,
  generatedAt: "2026-05-16T00:00:00.000Z",
  tasks: [
    {
      task: "tokenization-sbd",
      taskId: "nlp-tokenization-sbd",
      status: "ok",
      validators: [{ argv: ["node", "tools/validate-tokenization-sbd-readiness.mjs"], path: "tools/validate-tokenization-sbd-readiness.mjs", sha256: "0".repeat(64) }],
      comparisons: [
        {
          path: "fixtures/tokenization-sbd/comparisons/spacy-3.8.14.json",
          sha256: "1".repeat(64),
          comparator: { name: "spaCy", version: "3.8.14", runtime: "Python" },
          status: "pass",
        },
        {
          path: "fixtures/tokenization-sbd/comparisons/wink-nlp-2.4.0.json",
          sha256: "2".repeat(64),
          comparator: { name: "wink-nlp", version: "2.4.0", runtime: "Node.js" },
          status: "not-run",
        },
      ],
      conformanceReportRefs: ["fixtures/reports/nlp-tokenization-sbd/conformance-report.json"],
      knownGap: "one comparator gap",
    },
  ],
};

const replayInspection = inspectEvidenceReplay(evidenceReplay);

if (
  replayInspection.rows.length !== 1 ||
  replayInspection.rows[0].comparatorCount !== 2 ||
  replayInspection.rows[0].notRunComparisonCount !== 1 ||
  replayInspection.statusCounts.map((entry) => `${entry.status}:${entry.count}`).join(",") !== "ok:1"
) {
  throw new Error("evidence replay inspection should count comparator status and task status deterministically");
}

if (!renderEvidenceReplayInspection(replayInspection).includes("notRunComparisons=1")) {
  throw new Error("evidence replay renderer should expose comparator gap counts");
}

const corpusFixture = {
  schemaVersion: 1,
  corpusId: "corpus-smoke",
  formulaSet: ["tf.raw-count", "bm25.okapi.k1-1.5.b-0.75"],
  documentOrder: ["doc-a", "doc-empty"],
  termOrder: ["alpha", "beta"],
  tolerance: 1e-12,
  documents: [
    { id: "doc-a", length: 2, tf: [{ term: "alpha", value: 1 }], tfidf: [] },
    { id: "doc-empty", length: 0, tf: [], tfidf: [] },
  ],
  queries: [
    {
      id: "alpha",
      bm25: [
        { docId: "doc-a", score: 0.5 },
        { docId: "doc-empty", score: 0 },
      ],
    },
  ],
};

const corpusInspection = inspectCorpusFixture(corpusFixture);

if (
  corpusInspection.corpusId !== "corpus-smoke" ||
  corpusInspection.documentCount !== 2 ||
  corpusInspection.emptyDocumentCount !== 1 ||
  corpusInspection.termCount !== 2 ||
  corpusInspection.queryCount !== 1 ||
  corpusInspection.scoredHitCount !== 1
) {
  throw new Error("corpus fixture inspection should count documents, terms, queries, and scored hits");
}

if (!renderCorpusFixtureInspection(corpusInspection).includes("Empty documents: 1")) {
  throw new Error("corpus fixture renderer should include empty-document count");
}

const dir = await mkdtemp(path.join(tmpdir(), "textlab-support-status-"));
const fixturePath = path.join(dir, "support-status.v1.json");
await writeFile(fixturePath, `${JSON.stringify(supportStatus, null, 2)}\n`, "utf8");
const evidencePath = path.join(dir, "task-evidence-manifest.v1.json");
await writeFile(evidencePath, `${JSON.stringify(evidenceManifest, null, 2)}\n`, "utf8");
const reportPath = path.join(dir, "conformance-report.json");
await writeFile(reportPath, `${JSON.stringify(conformanceReport, null, 2)}\n`, "utf8");
const textdocPath = path.join(dir, "document.json");
await writeFile(textdocPath, `${JSON.stringify(textdocDocument, null, 2)}\n`, "utf8");
const replayPath = path.join(dir, "evidence-replay.v1.json");
await writeFile(replayPath, `${JSON.stringify(evidenceReplay, null, 2)}\n`, "utf8");
const corpusPath = path.join(dir, "corpus-fixture.json");
await writeFile(corpusPath, `${JSON.stringify(corpusFixture, null, 2)}\n`, "utf8");

const cliResult = await runTextlabCli(["support-status", fixturePath]);

if (cliResult.exitCode !== 0 || cliResult.stderr !== "") {
  throw new Error(`support-status CLI should pass: ${cliResult.stderr}`);
}

if (!cliResult.stdout.includes("task:nlp-dependency-parser [slice-proven]")) {
  throw new Error("support-status CLI should render task status rows");
}

const evidenceCliResult = await runTextlabCli(["evidence", evidencePath]);

if (evidenceCliResult.exitCode !== 0 || evidenceCliResult.stderr !== "") {
  throw new Error(`evidence CLI should pass: ${evidenceCliResult.stderr}`);
}

if (!evidenceCliResult.stdout.includes("nlp-rule-backed-ner [slice-proven] evidence=1 comparators=1 gaps=1")) {
  throw new Error("evidence CLI should render task evidence rows");
}

const reportCliResult = await runTextlabCli(["conformance-report", reportPath]);

if (reportCliResult.exitCode !== 0 || reportCliResult.stderr !== "") {
  throw new Error(`conformance-report CLI should pass: ${reportCliResult.stderr}`);
}

if (!reportCliResult.stdout.includes("Subject: task:nlp-rule-backed-ner")) {
  throw new Error("conformance-report CLI should render the report subject");
}

const annotationCliResult = await runTextlabCli(["annotations", textdocPath]);

if (annotationCliResult.exitCode !== 0 || annotationCliResult.stderr !== "") {
  throw new Error(`annotations CLI should pass: ${annotationCliResult.stderr}`);
}

if (!annotationCliResult.stdout.includes("Graph edges: 4")) {
  throw new Error("annotations CLI should render graph edge counts");
}

const replayCliResult = await runTextlabCli(["evidence-replay", replayPath]);

if (replayCliResult.exitCode !== 0 || replayCliResult.stderr !== "") {
  throw new Error(`evidence-replay CLI should pass: ${replayCliResult.stderr}`);
}

if (!replayCliResult.stdout.includes("notRunComparisons=1")) {
  throw new Error("evidence-replay CLI should render comparator gap counts");
}

const evidenceRunCliResult = await runTextlabCli(["evidence-run", "replay", "retrieval"]);

if (evidenceRunCliResult.exitCode !== 0 || evidenceRunCliResult.stderr !== "") {
  throw new Error(`evidence-run replay CLI should pass: ${evidenceRunCliResult.stderr}`);
}

if (!evidenceRunCliResult.stdout.includes('"mode": "replay"') || !evidenceRunCliResult.stdout.includes("nlp-retrieval")) {
  throw new Error("evidence-run replay CLI should invoke repository replay and expose task output");
}

const invalidEvidenceRunCliResult = await runTextlabCli(["evidence-run", "capture"]);

if (invalidEvidenceRunCliResult.exitCode !== 2 || !invalidEvidenceRunCliResult.stderr.includes("invalid evidence-run mode")) {
  throw new Error("evidence-run CLI should reject unsupported modes");
}

const corpusCliResult = await runTextlabCli(["corpus-fixture", corpusPath]);

if (corpusCliResult.exitCode !== 0 || corpusCliResult.stderr !== "") {
  throw new Error(`corpus-fixture CLI should pass: ${corpusCliResult.stderr}`);
}

if (!corpusCliResult.stdout.includes("Corpus: corpus-smoke")) {
  throw new Error("corpus-fixture CLI should render corpus identity");
}

const missingReportCliResult = await runTextlabCli(["conformance-report"]);

if (missingReportCliResult.exitCode !== 2 || !missingReportCliResult.stderr.includes("Missing path")) {
  throw new Error("conformance-report CLI should require an explicit path");
}

const invalidCliResult = await runTextlabCli(["unknown"]);

if (invalidCliResult.exitCode !== 2 || !invalidCliResult.stderr.includes("Unknown command")) {
  throw new Error("CLI should reject unknown commands deterministically");
}
