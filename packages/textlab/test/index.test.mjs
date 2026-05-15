import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  packageName,
  renderConformanceReportSummary,
  renderEvidenceManifestSummary,
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
      status: "readiness-only",
      scope: "Expected arcs only",
      evidence: ["readiness artifacts"],
      limitations: ["no parser"],
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

if (summary.counts.map((entry) => `${entry.status}:${entry.count}`).join(",") !== "scaffold:1,readiness-only:1,slice-proven:1,beta:1") {
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
      supportStatus: "readiness-only",
      claimBoundary: "Readiness artifacts only.",
      reportPath: "fixtures/reports/nlp-dependency-parser/conformance-report.json",
      evidenceRefs: ["fixtures/dependency-parser/slices.json"],
      comparatorRefs: [],
      knownGaps: ["No parser implementation."],
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

const dir = await mkdtemp(path.join(tmpdir(), "textlab-support-status-"));
const fixturePath = path.join(dir, "support-status.v1.json");
await writeFile(fixturePath, `${JSON.stringify(supportStatus, null, 2)}\n`, "utf8");
const evidencePath = path.join(dir, "task-evidence-manifest.v1.json");
await writeFile(evidencePath, `${JSON.stringify(evidenceManifest, null, 2)}\n`, "utf8");
const reportPath = path.join(dir, "conformance-report.json");
await writeFile(reportPath, `${JSON.stringify(conformanceReport, null, 2)}\n`, "utf8");

const cliResult = await runTextlabCli(["support-status", fixturePath]);

if (cliResult.exitCode !== 0 || cliResult.stderr !== "") {
  throw new Error(`support-status CLI should pass: ${cliResult.stderr}`);
}

if (!cliResult.stdout.includes("task:nlp-dependency-parser [readiness-only]")) {
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

const missingReportCliResult = await runTextlabCli(["conformance-report"]);

if (missingReportCliResult.exitCode !== 2 || !missingReportCliResult.stderr.includes("Missing path")) {
  throw new Error("conformance-report CLI should require an explicit path");
}

const invalidCliResult = await runTextlabCli(["unknown"]);

if (invalidCliResult.exitCode !== 2 || !invalidCliResult.stderr.includes("Unknown command")) {
  throw new Error("CLI should reject unknown commands deterministically");
}
