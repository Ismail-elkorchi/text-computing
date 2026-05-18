import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const WRITE_MODE = process.argv.includes("--write");

const DOCUMENTS = [
  {
    outputPath: "docs/specs/support-status.md",
    inputPaths: ["docs/specs/support-status.v1.json"],
    render: renderSupportStatus,
  },
  {
    outputPath: "docs/specs/toolkit-capability-scorecard.md",
    inputPaths: ["fixtures/capability-scorecard/toolkit-capability-scorecard.v1.json"],
    render: renderCapabilityScorecard,
  },
  {
    outputPath: "docs/specs/package-release-gates.md",
    inputPaths: ["fixtures/package-release/gates.v1.json"],
    render: renderPackageReleaseGates,
  },
  {
    outputPath: "docs/specs/foundation-release-candidates.md",
    inputPaths: ["fixtures/package-release/foundation-release-candidates.v1.json"],
    render: renderFoundationReleaseCandidates,
  },
  {
    outputPath: "docs/specs/performance-gates.md",
    inputPaths: ["fixtures/performance/gates.v1.json"],
    render: renderPerformanceGates,
  },
];

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(ROOT, relativePath), "utf8"));
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function cell(value) {
  return String(value)
    .replaceAll("|", "\\|")
    .replaceAll("\n", "<br>");
}

function list(items) {
  return items.length === 0 ? "—" : items.map((item) => formatValue(item)).join("<br>");
}

function mdList(items) {
  return items.map((item) => `- ${formatValue(item)}`).join("\n");
}

function formatValue(value) {
  if (Array.isArray(value)) return value.map((item) => formatValue(item)).join(", ");
  if (value && typeof value === "object") return Object.entries(value).map(([key, item]) => `${key}: ${formatValue(item)}`).join("; ");
  return String(value);
}

function thresholdsCell(thresholds) {
  return thresholds === undefined ? "—" : formatValue(thresholds);
}

function table(headers, rows) {
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map(cell).join(" | ")} |`),
  ].join("\n");
}

function renderGeneratedHeader(sourcePath) {
  return [
    "<!-- This file is generated. Do not edit it by hand. -->",
    `<!-- Source: ${sourcePath} -->`,
    "",
  ].join("\n");
}

function renderSupportStatus([status]) {
  const packageRows = status.packages.map((entry) => [
    `\`${entry.name}\``,
    `\`${entry.status}\``,
    entry.scope,
    list(entry.evidence),
    list(entry.limitations),
  ]);
  const taskRows = status.tasks.map((entry) => [
    `\`${entry.id}\``,
    `\`${entry.status}\``,
    entry.scope,
    list(entry.evidence),
    list(entry.limitations),
  ]);
  return [
    renderGeneratedHeader("docs/specs/support-status.v1.json"),
    "# Support status",
    "",
    "This document is generated from `docs/specs/support-status.v1.json`.",
    "",
    "## Status labels",
    "",
    mdList([
      "`scaffold` — workspace or package shell exists, but no ratified behavior exists yet.",
      "`readiness-only` — frozen artifacts exist, but behavior is not implemented yet.",
      "`slice-proven` — executable behavior exists only for declared frozen slices or fixtures.",
      "`beta` — broader package behavior exists with multi-runtime or conformance evidence, but production support is not yet claimed.",
      "`production-candidate` — broad support, conformance, packaging, and operational evidence are available for the declared scope.",
    ]),
    "",
    "## Package status",
    "",
    table(["Package", "Status", "Scope", "Evidence", "Limitations"], packageRows),
    "",
    "## Task status",
    "",
    table(["Task", "Status", "Scope", "Evidence", "Limitations"], taskRows),
    "",
  ].join("\n");
}

function renderCapabilityScorecard([scorecard]) {
  return [
    renderGeneratedHeader("fixtures/capability-scorecard/toolkit-capability-scorecard.v1.json"),
    "# Toolkit capability scorecard",
    "",
    "This document is generated from `fixtures/capability-scorecard/toolkit-capability-scorecard.v1.json`.",
    "",
    "## Claim policy",
    "",
    scorecard.claimPolicy.rule,
    "",
    `Blocked term set: \`${scorecard.claimPolicy.blockedTermSetId}\`.`,
    "",
    "## Axes",
    "",
    table(
      ["Axis", "Measurement", "Gate", "Evidence"],
      scorecard.axes.map((axis) => [`\`${axis.id}\` — ${axis.label}`, axis.measurement, axis.gate, axis.evidenceRequired]),
    ),
    "",
    "## Language tiers",
    "",
    table(
      ["Tier", "Description", "Minimum evidence"],
      scorecard.languageTiers.map((tier) => [`\`${tier.id}\``, tier.description, tier.minimumEvidence]),
    ),
    "",
    "## Package rows",
    "",
    table(
      ["Package", "Status", "Evidence", "Next gate"],
      scorecard.packageRows.map((row) => [
        `\`${row.packageName}\``,
        `\`${row.supportStatus}\``,
        list(row.evidenceRefs),
        row.nextGate,
      ]),
    ),
    "",
    "## Task rows",
    "",
    table(
      ["Task", "Status", "Language tier", "Evidence", "Next gate"],
      scorecard.taskRows.map((row) => [
        `\`${row.taskId}\``,
        `\`${row.supportStatus}\``,
        `\`${row.languageTier}\``,
        list(row.evidenceRefs),
        row.nextGate,
      ]),
    ),
    "",
    "## Release gates",
    "",
    table(
      ["Gate", "Description", "Evidence required"],
      scorecard.releaseGates.map((gate) => [`\`${gate.id}\``, gate.description, gate.evidenceRequired]),
    ),
    "",
    "## Verification",
    "",
    "Run `npm run -s check:status-docs` and `npm run -s check:fixtures`.",
    "",
  ].join("\n");
}

function renderPackageReleaseGates([gates]) {
  return [
    renderGeneratedHeader("fixtures/package-release/gates.v1.json"),
    "# Package release gates",
    "",
    "This document is generated from `fixtures/package-release/gates.v1.json`.",
    "",
    "## Why this document exists",
    "",
    "Package metadata can look releasable before support claims, tests, schemas, quality checks, and security checks are ready.",
    "",
    "## Gate list",
    "",
    "The gate list is the required checklist, not a release approval by itself.",
    "",
    "## Required gates",
    "",
    mdList(gates.requiredGates.map((gate) => `\`${gate}\``)),
    "",
    "## Package gates",
    "",
    table(
      ["Package", "Track", "Support", "Readiness", "Downstream API", "Blockers"],
      gates.packages.map((entry) => [
        `\`${entry.packageName}\``,
        `\`${entry.releaseTrack}\``,
        `\`${entry.supportStatus}\``,
        `\`${entry.releaseReadiness}\``,
        `\`${entry.downstreamApiStability.status}\``,
        list(entry.releaseBlockers),
      ]),
    ),
    "",
    "## Notes",
    "",
    mdList(gates.notes ?? []),
    "",
    "## Current boundary",
    "",
    "Release readiness is dependency-based. A non-public package remains private until its declared downstream API and release-gate evidence passes.",
    "",
    "## Verification",
    "",
    "Run `npm run -s check:release-gates` and `npm run -s check:status-docs`.",
    "",
  ].join("\n");
}

function renderFoundationReleaseCandidates([artifact]) {
  return [
    renderGeneratedHeader("fixtures/package-release/foundation-release-candidates.v1.json"),
    "# Foundation release candidates",
    "",
    "This document is generated from `fixtures/package-release/foundation-release-candidates.v1.json`.",
    "",
    "## Boundary",
    "",
    "Release-candidate work is not package publication. These packages remain private until blockers are removed by evidence and release gates are updated.",
    "",
    "## Gate order",
    "",
    mdList([
      "`textprotocol` and `textconformance` — interchange and report contracts.",
      "`textdoc` — document and annotation container contracts.",
      "`textpack` — resource manifest, loading, and registry contracts.",
      "Dependent packages move only after their required foundation API evidence passes.",
    ]),
    "",
    "## Package candidates",
    "",
    table(
      ["Package", "State", "Track", "Readiness", "Downstream dependents", "Blockers"],
      artifact.packages.map((entry) => [
        `\`${entry.packageName}\``,
        `\`${entry.candidateState}\``,
        `\`${entry.releaseTrack}\``,
        `\`${entry.releaseReadiness}\``,
        list(entry.downstreamDependents),
        list(entry.releaseBlockers),
      ]),
    ),
    "",
    "## Notes",
    "",
    mdList(artifact.notes),
    "",
    "## Verification",
    "",
    "Run `node tools/validate-foundation-release-candidates.mjs` and `npm run -s check:status-docs`.",
    "",
  ].join("\n");
}

function renderPerformanceGates([gates]) {
  return [
    renderGeneratedHeader("fixtures/performance/gates.v1.json"),
    "# Performance gates",
    "",
    "This document is generated from `fixtures/performance/gates.v1.json`.",
    "",
    "## Why this document exists",
    "",
    "Small fixture correctness can be mistaken for operational scale. This document keeps operational claims tied to measured gates.",
    "",
    "## Gate dimensions",
    "",
    mdList(["`throughput`", "`memory`", "`streaming`", "`large-corpus`", "`regression-threshold`"]),
    "",
    "## Current boundary",
    "",
    "The current manifest defines deterministic performance and scale gates. Broader operational claims require measured evidence against these gates.",
    "",
    "## Gates",
    "",
    table(
      ["Gate", "Package", "Surface", "Dimensions", "Thresholds", "Regression policy", "Limitations"],
      gates.gates.map((gate) => [
        `\`${gate.id}\``,
        `\`${gate.packageName}\``,
        gate.surface,
        list(gate.dimensions.map((dimension) => `\`${dimension}\``)),
        thresholdsCell(gate.thresholds),
        gate.regressionPolicy,
        list(gate.limitations),
      ]),
    ),
    "",
    "## Notes",
    "",
    mdList(gates.notes ?? []),
    "",
    "## Verification",
    "",
    "Run `node tools/validate-performance-gates.mjs` and `npm run -s check:status-docs`.",
    "",
  ].join("\n");
}

const failures = [];
for (const document of DOCUMENTS) {
  const inputs = [];
  for (const inputPath of document.inputPaths) inputs.push(await readJson(inputPath));
  const expected = document.render(inputs);
  const outputFullPath = path.join(ROOT, document.outputPath);
  if (WRITE_MODE) {
    await writeFile(outputFullPath, expected, "utf8");
    continue;
  }
  const actual = await readFile(outputFullPath, "utf8");
  if (actual !== expected) failures.push(document.outputPath);
}

if (failures.length > 0) {
  fail(`Generated status docs are stale; run npm run -s status:write. Stale files: ${failures.join(", ")}`);
}

console.log(`Generated status docs OK (${DOCUMENTS.length} files).`);
