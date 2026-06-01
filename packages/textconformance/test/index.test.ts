import {
  conformanceBenchmarkReportSchemaId,
  conformanceBenchmarkReportSchemaVersion,
  conformanceBenchmarkThresholdPolicySchemaVersion,
  conformanceCapabilityRegistrySchemaVersion,
  conformanceSuiteSchemaId,
  conformanceSuiteSchemaVersion,
  diffTextConformanceReports,
  evaluateTextConformanceBenchmarkThresholds,
  isTextConformanceBenchmarkReportV1,
  isTextConformanceBenchmarkThresholdEvaluationReportV1,
  isTextConformanceBenchmarkThresholdPolicyV1,
  isTextConformanceCapabilityRegistryV1,
  isTextConformanceCapabilityStatementV1,
  isTextConformanceReportDiffV1,
  isTextConformanceReportV1,
  isTextConformanceSuiteV1,
  isTextConformanceSuiteTargetProbeV1,
  packageName,
  renderTextConformanceBenchmarkThresholdEvaluationMarkdown,
  renderTextConformanceReportDiffMarkdown,
  renderTextConformanceReportMarkdown,
  runTextConformanceDifferentialOracle,
  runTextConformanceBenchmark,
  runTextConformanceChecks,
  runTextConformanceSuite,
  runTextConformanceSuiteTargetChecks,
  runTextConformanceSuiteWithTargets,
  validateTextConformanceCapabilityRegistry,
  validateTextConformanceFixturePolicy,
} from "../src/index.ts";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const expectedPackageName: typeof packageName = "@ismail-elkorchi/textconformance";

const report = runTextConformanceChecks(
  [
    {
      checkId: "schema-valid",
      evidenceRefs: ["schemas/textconformance-report-v1.schema.json"],
      run: () => "pass",
    },
    {
      checkId: "fixture-replay",
      run: () => ({
        checkId: "fixture-replay",
        status: "not-run",
        message: "Fixture replay is not attached to this unit test.",
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
  !renderedReport.includes("| fixture-replay | not-run | Fixture replay is not attached to this unit test. | — |") ||
  renderedReport.indexOf("| fixture-replay |") > renderedReport.indexOf("| negative-control |")
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

const statement = {
  statementId: "statement:fixture-schema-valid",
  subject: {
    kind: "package",
    id: "@ismail-elkorchi/textconformance",
  },
  supportLevel: "fixture-validated",
  requirementRefs: ["packages/textconformance/README.md#conformance-report-package"],
  apiRefs: ["packages/textconformance/src/index.ts#runTextConformanceChecks"],
  inputRefs: ["packages/textconformance/test/index.test.ts#report"],
  oracleRefs: ["packages/textconformance/test/index.test.ts#isTextConformanceReportV1"],
  evidenceRefs: ["packages/textconformance/test/index.test.ts"],
  reportRefs: [actualReport.reportId],
  limitations: ["This statement is limited to package unit-test evidence."],
} as const;
if (!isTextConformanceCapabilityStatementV1(statement)) {
  throw new Error("statement should satisfy the statement guard");
}
const registry = {
  schemaVersion: conformanceCapabilityRegistrySchemaVersion,
  registryId: "registry:textconformance-unit",
  statements: [statement],
  notes: ["Unit-test capability registry."],
};
if (!isTextConformanceCapabilityRegistryV1(registry)) {
  throw new Error("capability registry should satisfy the runtime guard");
}
if (
  isTextConformanceCapabilityRegistryV1({
    ...registry,
    statements: [statement, statement],
  })
) {
  throw new Error("capability registry should reject duplicate statement ids");
}
const statementReport = validateTextConformanceCapabilityRegistry(registry, {
  knownReportIds: [actualReport.reportId],
  generatedAt: "2026-04-23T00:00:00.000Z",
});
if (!isTextConformanceReportV1(statementReport) || statementReport.summary.fail !== 0) {
  throw new Error("capability registry validation should produce a passing report");
}
const missingReport = validateTextConformanceCapabilityRegistry(registry, {
  knownReportIds: [],
});
if (missingReport.summary.fail !== 1) {
  throw new Error("capability registry validation should fail when report refs are missing");
}
if (
  isTextConformanceCapabilityStatementV1({
    ...statement,
    oracleRefs: [],
  })
) {
  throw new Error("statement guard should reject empty oracle refs");
}

const suite = {
  schemaId: conformanceSuiteSchemaId,
  schemaVersion: conformanceSuiteSchemaVersion,
  suiteId: "suite:textconformance-unit",
  suiteVersion: "1.0.0",
  suiteClass: "spec",
  subject: {
    kind: "package",
    id: "@ismail-elkorchi/textconformance",
    version: "0.1.0",
  },
  scopeBoundary: "Unit-test suite for the textconformance harness API.",
  fixtures: [
    {
      role: "validation",
      ref: "packages/textconformance/test/index.test.ts#suite-validation",
    },
    {
      role: "holdout",
      ref: "packages/textconformance/test/index.test.ts#suite-holdout",
    },
    {
      role: "negative-control",
      ref: "packages/textconformance/test/index.test.ts#suite-negative",
    },
  ],
  oracles: [
    {
      oracleId: "runtime-guard",
      kind: "runtime-guard",
      ref: "packages/textconformance/src/index.ts#isTextConformanceSuiteV1",
    },
  ],
  targets: [
    {
      targetId: "textconformance-test-fixture",
      kind: "package-fixture",
      ref: "packages/textconformance/test/index.test.ts",
      description: "Package-local fixture and harness assertions.",
    },
    {
      targetId: "textconformance-cli-artifact",
      kind: "generated-package-artifact",
      ref: "packages/textconformance/dist/cli.js",
      description: "Built CLI artifact used by external automation.",
    },
    {
      targetId: "textconformance-consumer-example",
      kind: "external-consumer-project",
      ref: "examples/textconformance-suite-target-consumer.mjs",
      description: "Repository-level consumer script that imports the built package entrypoint.",
    },
  ],
  checks: [
    {
      checkId: "suite-runtime-guard",
      oracleId: "runtime-guard",
      expectedStatus: "pass",
      evidenceRefs: ["packages/textconformance/test/index.test.ts"],
      traceability: {
        requirementRefs: ["packages/textconformance/README.md#suite-harness"],
        apiRefs: ["packages/textconformance/src/index.ts#runTextConformanceSuite"],
        inputRefs: ["packages/textconformance/test/index.test.ts#suite"],
        oracleRefs: ["runtime-guard"],
        reportRefs: ["suite:suite:textconformance-unit"],
        limitations: ["Unit-test fixture only."],
      },
    },
  ],
  limitations: ["Unit-test suite, not a repository-wide package statement."],
} as const;

if (!isTextConformanceSuiteV1(suite)) {
  throw new Error("suite should satisfy the conformance suite guard");
}
const suiteReport = runTextConformanceSuite(suite, {
  generatedAt: "2026-04-23T00:00:00.000Z",
  fixturePolicy: { requireHoldout: true },
});
if (!isTextConformanceReportV1(suiteReport) || suiteReport.summary.fail !== 0) {
  throw new Error("suite runner should produce a passing conformance report");
}
if (suiteReport.checks[0]?.checkId !== "fixture-policy:development-not-sole-evidence") {
  throw new Error("suite runner should emit deterministic sorted check rows");
}
const targetProbe = {
  targetId: "textconformance-test-fixture",
  kind: "package-fixture",
  ref: "packages/textconformance/test/index.test.ts",
  status: "pass",
  evidenceRefs: ["packages/textconformance/test/index.test.ts"],
} as const;
if (!isTextConformanceSuiteTargetProbeV1(targetProbe)) {
  throw new Error("target probe should satisfy the target probe guard");
}
const missingTargetChecks = runTextConformanceSuiteTargetChecks(suite);
if (missingTargetChecks.length !== 3 || missingTargetChecks.some((entry) => entry.status !== "fail")) {
  throw new Error("suite target checks should fail required targets without probes");
}
const targetReport = runTextConformanceSuiteWithTargets(suite, {
  generatedAt: "2026-04-23T00:00:00.000Z",
  fixturePolicy: { requireHoldout: true },
  targets: [
    targetProbe,
    {
      targetId: "textconformance-cli-artifact",
      kind: "generated-package-artifact",
      ref: "packages/textconformance/dist/cli.js",
      status: "pass",
      evidenceRefs: ["packages/textconformance/dist/cli.js"],
    },
    {
      targetId: "textconformance-consumer-example",
      kind: "external-consumer-project",
      ref: "examples/textconformance-suite-target-consumer.mjs",
      status: "pass",
      evidenceRefs: ["examples/textconformance-suite-target-consumer.mjs"],
    },
  ],
});
if (
  !isTextConformanceReportV1(targetReport) ||
  targetReport.summary.pass !== 8 ||
  targetReport.checks[7]?.checkId !== "target:textconformance-test-fixture"
) {
  throw new Error("suite target runner should append deterministic target checks");
}

const devOnlySuite = {
  ...suite,
  suiteId: "suite:textconformance-dev-only",
  fixtures: [{ role: "development", ref: "packages/textconformance/test/index.test.ts#dev" }],
} as const;
if (!isTextConformanceSuiteV1(devOnlySuite)) {
  throw new Error("development-only suite should remain structurally valid");
}
const devOnlyPolicy = validateTextConformanceFixturePolicy(devOnlySuite, {
  requireHoldout: true,
});
if (devOnlyPolicy.filter((entry) => entry.status === "fail").length !== 3) {
  throw new Error("fixture policy should reject development-only suites with missing controls");
}

const differentialPass = runTextConformanceDifferentialOracle({
  oracleId: "json-output",
  expected: { generatedAt: "a", values: [1, { id: "x" }] },
  actual: { generatedAt: "b", values: [1, { id: "x" }] },
  allowedDifferencePaths: ["$.generatedAt"],
  evidenceRefs: ["packages/textconformance/test/index.test.ts#differential"],
});
if (differentialPass.status !== "pass") {
  throw new Error("differential oracle should allow declared difference paths");
}
const differentialFail = runTextConformanceDifferentialOracle({
  oracleId: "json-output-fail",
  expected: { value: 1 },
  actual: { value: 2 },
});
if (differentialFail.status !== "fail") {
  throw new Error("differential oracle should fail undeclared differences");
}

const benchmarkReport = {
  schemaId: conformanceBenchmarkReportSchemaId,
  schemaVersion: conformanceBenchmarkReportSchemaVersion,
  benchmarkId: "benchmark:textconformance-unit",
  subject: {
    kind: "package",
    id: "@ismail-elkorchi/textconformance",
  },
  generatedAt: "2026-04-23T00:00:00.000Z",
  metrics: [
    {
      metricId: "duration-ms",
      value: 1,
      unit: "ms",
      higherIsPreferred: false,
    },
  ],
  evidenceRefs: ["packages/textconformance/test/index.test.ts#benchmark"],
  limitations: ["Synthetic unit-test benchmark report."],
} as const;
if (!isTextConformanceBenchmarkReportV1(benchmarkReport)) {
  throw new Error("benchmark report should satisfy the benchmark report guard");
}
if (isTextConformanceReportV1(benchmarkReport)) {
  throw new Error("benchmark report must not satisfy the conformance report guard");
}
let benchmarkClock = 0;
const benchmarkInvocations: string[] = [];
const executedBenchmarkReport = await runTextConformanceBenchmark({
  benchmarkId: "benchmark:textconformance-suite-runner",
  subject: {
    kind: "package",
    id: "@ismail-elkorchi/textconformance",
  },
  generatedAt: "2026-04-23T00:00:00.000Z",
  iterations: 3,
  warmupIterations: 1,
  clock() {
    const value = benchmarkClock;
    benchmarkClock += 5;
    return value;
  },
  evidenceRefs: ["packages/textconformance/test/index.test.ts#benchmark-runner"],
  limitations: ["Synthetic benchmark runner test; metrics use an injected deterministic clock."],
  cases: [
    {
      caseId: "suite-runner",
      evidenceRefs: ["packages/textconformance/test/index.test.ts#suite"],
      run(context) {
        benchmarkInvocations.push(`${context.phase}:${context.iteration}`);
        runTextConformanceSuite(suite, {
          generatedAt: "2026-04-23T00:00:00.000Z",
          fixturePolicy: { requireHoldout: true },
        });
      },
    },
  ],
});
if (
  !isTextConformanceBenchmarkReportV1(executedBenchmarkReport) ||
  executedBenchmarkReport.metrics.find((metric) => metric.metricId === "suite-runner.duration-ms.mean")?.value !== 5 ||
  executedBenchmarkReport.metrics.find((metric) => metric.metricId === "suite-runner.iterations")?.value !== 3 ||
  executedBenchmarkReport.evidenceRefs.join(",") !==
    "packages/textconformance/test/index.test.ts#benchmark-runner,packages/textconformance/test/index.test.ts#suite"
) {
  throw new Error("benchmark runner should produce deterministic benchmark report metrics");
}
if (benchmarkInvocations.join(",") !== "warmup:0,measurement:0,measurement:1,measurement:2") {
  throw new Error("benchmark runner should execute warmup and measurement iterations in order");
}
if (isTextConformanceReportV1(executedBenchmarkReport)) {
  throw new Error("executed benchmark report must not satisfy the conformance report guard");
}
let duplicateBenchmarkCaseRejected = false;
try {
  await runTextConformanceBenchmark({
    benchmarkId: "benchmark:duplicate-case",
    subject: { kind: "package", id: "@ismail-elkorchi/textconformance" },
    cases: [
      { caseId: "duplicate", run() {} },
      { caseId: "duplicate", run() {} },
    ],
    evidenceRefs: ["packages/textconformance/test/index.test.ts#duplicate-benchmark-case"],
    limitations: ["Duplicate-case negative control."],
  });
} catch (error) {
  duplicateBenchmarkCaseRejected =
    error instanceof TypeError && error.message === "textconformance benchmark case ids must be unique";
}
if (!duplicateBenchmarkCaseRejected) {
  throw new Error("benchmark runner should reject duplicate case ids");
}

const benchmarkThresholdPolicy = {
  schemaVersion: conformanceBenchmarkThresholdPolicySchemaVersion,
  policyId: "policy:textconformance-suite-runner",
  benchmarkId: "benchmark:textconformance-suite-runner",
  subject: {
    kind: "package",
    id: "@ismail-elkorchi/textconformance",
  },
  calibratedAt: "2026-04-23T00:00:00.000Z",
  thresholds: [
    {
      metricId: "suite-runner.duration-ms.mean",
      unit: "ms",
      max: 6,
      warnMax: 4,
      evidenceRefs: ["packages/textconformance/test/index.test.ts#threshold-mean"],
    },
    {
      metricId: "suite-runner.duration-ms.max",
      unit: "ms",
      max: 4,
      evidenceRefs: ["packages/textconformance/test/index.test.ts#threshold-max"],
    },
    {
      metricId: "suite-runner.duration-ms.p95",
      unit: "ms",
      max: 6,
      evidenceRefs: ["packages/textconformance/test/index.test.ts#threshold-missing"],
    },
    {
      metricId: "suite-runner.iterations",
      unit: "count",
      min: 3,
      evidenceRefs: ["packages/textconformance/test/index.test.ts#threshold-iterations"],
    },
  ],
  evidenceRefs: ["packages/textconformance/test/index.test.ts#benchmark-threshold-policy"],
  limitations: ["Synthetic threshold policy for deterministic unit testing."],
} as const;
if (!isTextConformanceBenchmarkThresholdPolicyV1(benchmarkThresholdPolicy)) {
  throw new Error("benchmark threshold policy should satisfy the runtime guard");
}
const benchmarkThresholdEvaluation = evaluateTextConformanceBenchmarkThresholds(
  executedBenchmarkReport,
  benchmarkThresholdPolicy,
  { generatedAt: "2026-04-23T00:00:00.000Z" },
);
const thresholdStatusByMetric = new Map(
  benchmarkThresholdEvaluation.rows.map((row) => [row.metricId, row.status]),
);
if (
  !isTextConformanceBenchmarkThresholdEvaluationReportV1(benchmarkThresholdEvaluation) ||
  benchmarkThresholdEvaluation.summary.pass !== 1 ||
  benchmarkThresholdEvaluation.summary.warn !== 1 ||
  benchmarkThresholdEvaluation.summary.fail !== 1 ||
  benchmarkThresholdEvaluation.summary.missing !== 1 ||
  thresholdStatusByMetric.get("suite-runner.duration-ms.mean") !== "warn" ||
  thresholdStatusByMetric.get("suite-runner.duration-ms.max") !== "fail" ||
  thresholdStatusByMetric.get("suite-runner.duration-ms.p95") !== "missing" ||
  thresholdStatusByMetric.get("suite-runner.iterations") !== "pass"
) {
  throw new Error("benchmark threshold evaluation should classify pass, warn, fail, and missing metrics");
}
const renderedThresholdEvaluation = renderTextConformanceBenchmarkThresholdEvaluationMarkdown(
  benchmarkThresholdEvaluation,
);
if (
  !renderedThresholdEvaluation.includes("- **Summary:** pass=1; warn=1; fail=1; missing=1") ||
  !renderedThresholdEvaluation.includes("| suite-runner.duration-ms.max | fail | 5 | ms | max=4 |")
) {
  throw new Error("benchmark threshold evaluation renderer should expose summary and row status");
}
let mismatchedBenchmarkPolicyRejected = false;
try {
  evaluateTextConformanceBenchmarkThresholds(executedBenchmarkReport, {
    ...benchmarkThresholdPolicy,
    benchmarkId: "benchmark:other",
  });
} catch (error) {
  mismatchedBenchmarkPolicyRejected =
    error instanceof TypeError &&
    error.message ===
      "benchmark threshold policy policy:textconformance-suite-runner targets benchmark:other; received benchmark:textconformance-suite-runner";
}
if (!mismatchedBenchmarkPolicyRejected) {
  throw new Error("benchmark threshold evaluation should reject mismatched policies");
}

const cliDir = mkdtempSync(path.join(tmpdir(), "textconformance-cli-"));
const reportPath = path.join(cliDir, "report.json");
const suitePath = path.join(cliDir, "suite.json");
const benchmarkReportPath = path.join(cliDir, "benchmark-report.json");
const benchmarkThresholdPolicyPath = path.join(cliDir, "benchmark-threshold-policy.json");
const invalidPath = path.join(cliDir, "invalid.json");
const repoRoot = path.resolve("../..");
writeFileSync(reportPath, `${JSON.stringify(suiteReport, null, 2)}\n`);
writeFileSync(suitePath, `${JSON.stringify(suite, null, 2)}\n`);
writeFileSync(benchmarkReportPath, `${JSON.stringify(executedBenchmarkReport, null, 2)}\n`);
writeFileSync(benchmarkThresholdPolicyPath, `${JSON.stringify(benchmarkThresholdPolicy, null, 2)}\n`);
writeFileSync(invalidPath, "{\"schemaVersion\":1}\n");
const cliPath = path.resolve("dist/cli.js");
const validateCli = execFileSync(process.execPath, [cliPath, "validate-report", reportPath], {
  encoding: "utf8",
});
if (!validateCli.includes("\"ok\":true") || !validateCli.includes("\"checkCount\":5")) {
  throw new Error("CLI should validate conformance reports with deterministic JSON output");
}
const renderCli = execFileSync(process.execPath, [cliPath, "render-report", reportPath], {
  encoding: "utf8",
});
if (!renderCli.includes("# Conformance report suite:suite:textconformance-unit")) {
  throw new Error("CLI should render conformance report Markdown");
}
const suiteCli = execFileSync(process.execPath, [cliPath, "validate-suite", suitePath], {
  encoding: "utf8",
});
if (!suiteCli.includes("\"reportId\":\"suite:suite:textconformance-unit\"")) {
  throw new Error("CLI should validate and execute suite files");
}
const runSuiteCli = execFileSync(
  process.execPath,
  [cliPath, "run-suite", suitePath, "--target-root", repoRoot],
  {
    encoding: "utf8",
  },
);
if (
  !runSuiteCli.includes("\"pass\":7") ||
  !runSuiteCli.includes("\"target:textconformance-consumer-example\"")
) {
  throw new Error("CLI should run suite files against declared filesystem targets");
}
const benchmarkCli = execFileSync(
  process.execPath,
  [cliPath, "run-benchmark", suitePath, "--target-root", repoRoot, "--iterations", "2", "--warmup", "1"],
  {
    encoding: "utf8",
  },
);
const benchmarkCliReport = JSON.parse(benchmarkCli);
if (
  !isTextConformanceBenchmarkReportV1(benchmarkCliReport) ||
  benchmarkCliReport.benchmarkId !== "benchmark:suite:textconformance-unit" ||
  benchmarkCliReport.metrics.find((metric) => metric.metricId === "suite:suite:textconformance-unit.iterations")
    ?.value !== 2
) {
  throw new Error("CLI should run benchmark reports over suite files");
}
const benchmarkThresholdCli = execFileSync(
  process.execPath,
  [cliPath, "evaluate-benchmark", benchmarkReportPath, benchmarkThresholdPolicyPath],
  {
    encoding: "utf8",
  },
);
const benchmarkThresholdCliReport = JSON.parse(benchmarkThresholdCli);
if (
  !isTextConformanceBenchmarkThresholdEvaluationReportV1(benchmarkThresholdCliReport) ||
  benchmarkThresholdCliReport.summary.fail !== 1 ||
  benchmarkThresholdCliReport.summary.missing !== 1
) {
  throw new Error("CLI should evaluate benchmark threshold policies");
}
const benchmarkThresholdMarkdownCli = execFileSync(
  process.execPath,
  [cliPath, "evaluate-benchmark", benchmarkReportPath, benchmarkThresholdPolicyPath, "--markdown"],
  {
    encoding: "utf8",
  },
);
if (!benchmarkThresholdMarkdownCli.includes("# Benchmark threshold evaluation benchmark:textconformance-suite-runner")) {
  throw new Error("CLI should render benchmark threshold evaluations as Markdown");
}
let invalidCliRejected = false;
try {
  execFileSync(process.execPath, [cliPath, "validate-report", invalidPath], {
    encoding: "utf8",
    stdio: "pipe",
  });
} catch {
  invalidCliRejected = true;
}
if (!invalidCliRejected) {
  throw new Error("CLI should reject malformed conformance reports");
}

void expectedPackageName;
