import {
  conformanceClaimRegistrySchemaVersion,
  diffTextConformanceReports,
  isTextConformanceClaimRegistryV1,
  isTextConformanceClaimV1,
  isTextConformanceReportDiffV1,
  isTextConformanceReportV1,
  packageName,
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
