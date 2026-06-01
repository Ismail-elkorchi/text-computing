#!/usr/bin/env node
import {
  conformanceSuiteSchemaId,
  conformanceSuiteSchemaVersion,
  isTextConformanceReportV1,
  runTextConformanceSuiteWithTargets,
} from "@ismail-elkorchi/textconformance";

const suite = {
  schemaId: conformanceSuiteSchemaId,
  schemaVersion: conformanceSuiteSchemaVersion,
  suiteId: "suite:example:textconformance-targets",
  suiteVersion: "1.0.0",
  suiteClass: "workflow",
  subject: {
    kind: "package",
    id: "@ismail-elkorchi/textconformance",
    version: "0.1.0",
  },
  scopeBoundary: "Example suite for package fixture, generated artifact, and consumer evidence targets.",
  fixtures: [
    {
      role: "validation",
      ref: "packages/textconformance/test/index.test.ts",
    },
    {
      role: "holdout",
      ref: "fixtures/conformance/package-suites.v1.json",
    },
    {
      role: "negative-control",
      ref: "packages/textconformance/test/index.test.ts#invalid-cli",
    },
  ],
  oracles: [
    {
      oracleId: "example-target-oracle",
      kind: "runtime-guard",
      ref: "examples/textconformance-suite-target-consumer.mjs",
    },
  ],
  targets: [
    {
      targetId: "package-fixture",
      kind: "package-fixture",
      ref: "packages/textconformance/test/index.test.ts",
    },
    {
      targetId: "generated-cli",
      kind: "generated-package-artifact",
      ref: "packages/textconformance/dist/cli.js",
    },
    {
      targetId: "consumer-script",
      kind: "external-consumer-project",
      ref: "examples/textconformance-suite-target-consumer.mjs",
    },
  ],
  checks: [
    {
      checkId: "example-target-runner",
      oracleId: "example-target-oracle",
      expectedStatus: "pass",
      evidenceRefs: ["examples/textconformance-suite-target-consumer.mjs"],
    },
  ],
  limitations: ["Example suite only; repository release gates remain the release oracle."],
};

const report = runTextConformanceSuiteWithTargets(suite, {
  generatedAt: "2026-05-31T00:00:00.000Z",
  fixturePolicy: { requireHoldout: true },
  targets: suite.targets.map((target) => ({
    targetId: target.targetId,
    kind: target.kind,
    ref: target.ref,
    status: "pass",
    evidenceRefs: [target.ref],
  })),
});

if (!isTextConformanceReportV1(report) || report.summary.fail !== 0) {
  throw new Error("textconformance target suite example produced an invalid report");
}

console.log(JSON.stringify({
  reportId: report.reportId,
  pass: report.summary.pass,
  fail: report.summary.fail,
  notRun: report.summary.notRun,
  targetChecks: report.checks
    .filter((check) => check.checkId.startsWith("target:"))
    .map((check) => check.checkId),
}, null, 2));
