import {
  isTextConformanceReportV1,
  packageName,
  runTextConformanceChecks,
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

void expectedPackageName;
