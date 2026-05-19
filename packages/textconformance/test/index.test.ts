import {
  conformanceClaimRegistrySchemaVersion,
  diffTextConformanceReports,
  isTextConformanceClaimRegistryV1,
  isTextConformanceClaimV1,
  isTextConformanceReportDiffV1,
  isTextConformanceReportV1,
  packageName,
  renderTextConformanceReportDiffMarkdown,
  renderTextConformanceReportMarkdown,
  runTextConformanceChecks,
  validateTextConformanceClaimRegistry,
} from "../src/index.ts";

const expectedPackageName: typeof packageName = "@ismail-elkorchi/textconformance";

const report = runTextConformanceChecks(
  [
    {
      checkId: "schema-valid",
      evidenceRefs: ["schemas/textconformance-report-v1.schema.json"],
      run: () => "pass",
    },
    {
      checkId: "comparator-replay",
      run: () => ({
        checkId: "comparator-replay",
        status: "not-run",
        message: "Comparator replay is not attached to this unit test.",
      }),
    },
    {
      checkId: "negative-control",
      run: () => "fail",
    },
  ],
  {
    reportId: "textconformance:test",
    subject: {
      kind: "fixture-suite",
      id: "textconformance-unit",
    },
    generatedAt: "2026-04-23T00:00:00.000Z",
  },
);

if (!isTextConformanceReportV1(report)) {
  throw new Error("runner output should satisfy the conformance report contract");
}

const renderedReport = renderTextConformanceReportMarkdown(report, {
  title: "Textconformance unit report",
});
if (!renderedReport.endsWith("\n")) {
  throw new Error("report Markdown renderer should emit a final newline");
}
if (
  !renderedReport.includes("# Textconformance unit report") ||
  !renderedReport.includes("- **Summary:** pass=1; fail=1; not-run=1") ||
  !renderedReport.includes("| comparator-replay | not-run | Comparator replay is not attached to this unit test. | — |") ||
  renderedReport.indexOf("| comparator-replay |") > renderedReport.indexOf("| negative-control |")
) {
  throw new Error("report Markdown renderer should emit deterministic summary and check rows");
}
if (renderTextConformanceReportMarkdown(report, { title: "Textconformance unit report" }) !== renderedReport) {
  throw new Error("report Markdown renderer should be deterministic across repeated calls");
}

if (report.summary.pass !== 1 || report.summary.fail !== 1 || report.summary.notRun !== 1) {
  throw new Error("runner summary should count pass, fail, and not-run checks");
}

let invalidCheckRejected = false;
try {
  runTextConformanceChecks(
    [
      {
        checkId: "",
        run: () => "pass",
      },
    ],
    {
      reportId: "textconformance:invalid",
      subject: {
        kind: "fixture-suite",
        id: "invalid",
      },
    },
  );
} catch (error) {
  invalidCheckRejected =
    error instanceof TypeError &&
    error.message === "conformance check id must be a non-empty string";
}

if (!invalidCheckRejected) {
  throw new Error("runner should reject empty check ids");
}

const expectedReport = runTextConformanceChecks(
  [
    {
      checkId: "schema-valid",
      run: () => "pass",
    },
    {
      checkId: "output-stable",
      run: () => "pass",
    },
    {
      checkId: "removed-check",
      run: () => "not-run",
    },
  ],
  {
    reportId: "textconformance:expected",
    subject: {
      kind: "fixture-suite",
      id: "textconformance-diff",
    },
  },
);
const actualReport = runTextConformanceChecks(
  [
    {
      checkId: "added-check",
      run: () => "pass",
    },
    {
      checkId: "output-stable",
      run: () => "fail",
    },
    {
      checkId: "schema-valid",
      run: () => "pass",
    },
  ],
  {
    reportId: "textconformance:actual",
    subject: {
      kind: "fixture-suite",
      id: "textconformance-diff",
    },
  },
);
const diff = diffTextConformanceReports(expectedReport, actualReport);
if (!isTextConformanceReportDiffV1(diff)) {
  throw new Error("report diff should satisfy the runtime guard");
}
if (
  diff.summary.same !== 1 ||
  diff.summary.changed !== 1 ||
  diff.summary.added !== 1 ||
  diff.summary.removed !== 1
) {
  throw new Error("report diff should count same, changed, added, and removed checks");
}
const renderedDiff = renderTextConformanceReportDiffMarkdown(diff, {
  title: "Textconformance unit diff",
});
if (
  !renderedDiff.includes("# Textconformance unit diff") ||
  !renderedDiff.includes("- **Summary:** same=1; changed=1; added=1; removed=1") ||
  renderedDiff.indexOf("| added-check |") > renderedDiff.indexOf("| output-stable |")
) {
  throw new Error("diff Markdown renderer should emit deterministic summary and check rows");
}
if (renderTextConformanceReportDiffMarkdown(diff, { title: "Textconformance unit diff" }) !== renderedDiff) {
  throw new Error("diff Markdown renderer should be deterministic across repeated calls");
}

const escapedReport = runTextConformanceChecks(
  [
    {
      checkId: "pipe-message",
      run: () => ({
        checkId: "pipe-message",
        status: "fail",
        message: "contains | pipe\nand backslash \\ marker",
        evidenceRefs: ["fixtures/example|pipe.json", "fixtures/example\\backslash.json"],
      }),
    },
  ],
  {
    reportId: "textconformance:escaped",
    subject: {
      kind: "fixture-suite",
      id: "textconformance-escaped",
    },
  },
);
const escapedMarkdown = renderTextConformanceReportMarkdown(escapedReport);
if (
  !escapedMarkdown.includes("contains \\| pipe<br>and backslash \\\\ marker") ||
  !escapedMarkdown.includes("fixtures/example\\|pipe.json<br>fixtures/example\\\\backslash.json")
) {
  throw new Error("report Markdown renderer should escape table cells deterministically");
}

let invalidReportRenderRejected = false;
try {
  renderTextConformanceReportMarkdown({
    ...report,
    schemaId: "invalid",
  } as never);
} catch (error) {
  invalidReportRenderRejected =
    error instanceof TypeError && error.message === "conformance report is invalid";
}
if (!invalidReportRenderRejected) {
  throw new Error("report Markdown renderer should reject invalid reports");
}

let duplicateCheckRejected = false;
const firstExpectedCheck = expectedReport.checks[0];
if (firstExpectedCheck === undefined) {
  throw new Error("expected report should contain at least one check");
}
try {
  diffTextConformanceReports(
    {
      ...expectedReport,
      checks: [...expectedReport.checks, firstExpectedCheck],
    },
    actualReport,
  );
} catch (error) {
  duplicateCheckRejected =
    error instanceof TypeError &&
    error.message === "expected conformance report contains duplicate check id schema-valid";
}
if (!duplicateCheckRejected) {
  throw new Error("report diff should reject duplicate expected check ids");
}

const claim = {
  claimId: "claim:fixture-schema-valid",
  subject: {
    kind: "package",
    id: "@ismail-elkorchi/textconformance",
  },
  supportLabel: "fixture-proven",
  requirementRefs: ["packages/textconformance/README.md#conformance-report-package"],
  apiRefs: ["packages/textconformance/src/index.ts#runTextConformanceChecks"],
  evidenceRefs: ["packages/textconformance/test/index.test.ts"],
  reportRefs: [actualReport.reportId],
  limitations: ["This claim is limited to package unit-test evidence."],
} as const;
if (!isTextConformanceClaimV1(claim)) {
  throw new Error("claim should satisfy the claim guard");
}
const registry = {
  schemaVersion: conformanceClaimRegistrySchemaVersion,
  registryId: "registry:textconformance-unit",
  claims: [claim],
  notes: ["Unit-test claim registry."],
};
if (!isTextConformanceClaimRegistryV1(registry)) {
  throw new Error("claim registry should satisfy the runtime guard");
}
if (
  isTextConformanceClaimRegistryV1({
    ...registry,
    claims: [claim, claim],
  })
) {
  throw new Error("claim registry should reject duplicate claim ids");
}
const claimReport = validateTextConformanceClaimRegistry(registry, {
  knownReportIds: [actualReport.reportId],
  generatedAt: "2026-04-23T00:00:00.000Z",
});
if (!isTextConformanceReportV1(claimReport) || claimReport.summary.fail !== 0) {
  throw new Error("claim registry validation should produce a passing report");
}
const missingReport = validateTextConformanceClaimRegistry(registry, {
  knownReportIds: [],
});
if (missingReport.summary.fail !== 1) {
  throw new Error("claim registry validation should fail when report refs are missing");
}
if (
  isTextConformanceClaimV1({
    ...claim,
    evidenceRefs: [],
  })
) {
  throw new Error("claim guard should reject empty evidence refs");
}

void expectedPackageName;
