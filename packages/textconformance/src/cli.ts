#!/usr/bin/env node
import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import {
  diffTextConformanceReports,
  isTextConformanceBenchmarkReportV1,
  isTextConformanceCapabilityRegistryV1,
  isTextConformanceReportV1,
  isTextConformanceSuiteV1,
  isTextConformanceSuiteTargetProbeV1,
  renderTextConformanceReportMarkdown,
  runTextConformanceBenchmark,
  runTextConformanceSuite,
  runTextConformanceSuiteWithTargets,
  validateTextConformanceCapabilityRegistry,
} from "./index.js";
import type {
  TextConformanceSuiteTargetProbeV1,
  TextConformanceSuiteV1,
} from "./index.js";

export interface TextConformanceCliResult {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
}

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, "utf8"));
}

function jsonLine(value: unknown): string {
  return `${JSON.stringify(value)}\n`;
}

function isSuiteCatalog(value: unknown): value is { readonly suites: readonly unknown[] } {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Array.isArray((value as { readonly suites?: unknown }).suites)
  );
}

function targetProbePayloadToArray(value: unknown): readonly unknown[] {
  if (Array.isArray(value)) return value;
  if (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Array.isArray((value as { readonly targets?: unknown }).targets)
  ) {
    return (value as { readonly targets: readonly unknown[] }).targets;
  }
  return [];
}

async function readTargetProbes(path: string): Promise<readonly TextConformanceSuiteTargetProbeV1[]> {
  const payload = await readJson(path);
  const probes = targetProbePayloadToArray(payload);
  if (!probes.every((probe) => isTextConformanceSuiteTargetProbeV1(probe))) {
    throw new TypeError(`Invalid conformance suite target probes: ${path}`);
  }
  return probes;
}

async function targetExists(root: string, ref: string): Promise<boolean> {
  try {
    const entry = await stat(resolve(root, ref));
    return entry.isFile() || entry.isDirectory();
  } catch {
    return false;
  }
}

async function probeSuiteTargetsFromFilesystem(
  suite: TextConformanceSuiteV1,
  root: string,
): Promise<readonly TextConformanceSuiteTargetProbeV1[]> {
  return Promise.all(
    (suite.targets ?? []).map(async (target) => {
      const exists = await targetExists(root, target.ref);
      return {
        targetId: target.targetId,
        kind: target.kind,
        ref: target.ref,
        status: exists ? "pass" : "fail",
        message: exists
          ? `Declared ${target.kind} target exists at ${target.ref}.`
          : `Declared ${target.kind} target is missing at ${target.ref}.`,
        evidenceRefs: [target.ref],
      };
    }),
  );
}

interface RunSuiteCliOptions {
  readonly suitePath: string;
  readonly targetRoot: string;
  readonly targetResultsPath?: string;
}

interface RunBenchmarkCliOptions extends RunSuiteCliOptions {
  readonly iterations: number;
  readonly warmupIterations: number;
}

function parsePositiveIntegerArg(value: string | undefined): number | undefined {
  if (value === undefined || !/^[1-9][0-9]*$/u.test(value)) return undefined;
  return Number(value);
}

function parseNonNegativeIntegerArg(value: string | undefined): number | undefined {
  if (value === undefined || !/^(0|[1-9][0-9]*)$/u.test(value)) return undefined;
  return Number(value);
}

function parseRunSuiteArgs(args: readonly string[]): RunSuiteCliOptions | undefined {
  let suitePath: string | undefined;
  let targetRoot = process.cwd();
  let targetResultsPath: string | undefined;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--target-root") {
      const value = args[index + 1];
      if (value === undefined) return undefined;
      targetRoot = value;
      index += 1;
    } else if (arg === "--target-results") {
      const value = args[index + 1];
      if (value === undefined) return undefined;
      targetResultsPath = value;
      index += 1;
    } else if (suitePath === undefined) {
      suitePath = arg;
    } else {
      return undefined;
    }
  }
  if (suitePath === undefined) return undefined;
  return { suitePath, targetRoot, ...(targetResultsPath ? { targetResultsPath } : {}) };
}

function parseRunBenchmarkArgs(args: readonly string[]): RunBenchmarkCliOptions | undefined {
  let suitePath: string | undefined;
  let targetRoot = process.cwd();
  let targetResultsPath: string | undefined;
  let iterations = 1;
  let warmupIterations = 0;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--target-root") {
      const value = args[index + 1];
      if (value === undefined) return undefined;
      targetRoot = value;
      index += 1;
    } else if (arg === "--target-results") {
      const value = args[index + 1];
      if (value === undefined) return undefined;
      targetResultsPath = value;
      index += 1;
    } else if (arg === "--iterations") {
      const value = parsePositiveIntegerArg(args[index + 1]);
      if (value === undefined) return undefined;
      iterations = value;
      index += 1;
    } else if (arg === "--warmup") {
      const value = parseNonNegativeIntegerArg(args[index + 1]);
      if (value === undefined) return undefined;
      warmupIterations = value;
      index += 1;
    } else if (suitePath === undefined) {
      suitePath = arg;
    } else {
      return undefined;
    }
  }
  if (suitePath === undefined) return undefined;
  return {
    suitePath,
    targetRoot,
    iterations,
    warmupIterations,
    ...(targetResultsPath ? { targetResultsPath } : {}),
  };
}

function suiteEvidenceRefs(suite: TextConformanceSuiteV1, suitePath: string): readonly string[] {
  return [
    suitePath,
    ...suite.fixtures.map((fixture) => fixture.ref),
    ...suite.oracles.flatMap((oracle) => (oracle.ref === undefined ? [] : [oracle.ref])),
    ...(suite.targets ?? []).map((target) => target.ref),
  ].sort();
}

async function runSuiteBenchmark(
  suite: TextConformanceSuiteV1,
  options: RunBenchmarkCliOptions,
) {
  const targets =
    options.targetResultsPath === undefined
      ? await probeSuiteTargetsFromFilesystem(suite, options.targetRoot)
      : await readTargetProbes(options.targetResultsPath);
  const report = await runTextConformanceBenchmark({
    benchmarkId: `benchmark:${suite.suiteId}`,
    subject: suite.subject,
    iterations: options.iterations,
    warmupIterations: options.warmupIterations,
    evidenceRefs: suiteEvidenceRefs(suite, options.suitePath),
    limitations: [
      "Benchmark metrics measure suite runner execution in the current runtime; they are not pass/fail conformance results.",
    ],
    cases: [
      {
        caseId: `suite:${suite.suiteId}`,
        evidenceRefs: targets.flatMap((target) => target.evidenceRefs ?? [target.ref]),
        run() {
          runTextConformanceSuiteWithTargets(suite, { targets });
        },
      },
    ],
  });
  if (!isTextConformanceBenchmarkReportV1(report)) {
    throw new TypeError("textconformance benchmark CLI produced an invalid report");
  }
  return report;
}

function usage(): TextConformanceCliResult {
  return {
    exitCode: 1,
    stdout: "",
    stderr: [
      "Usage:",
      "  textconformance validate-report <report.json>",
      "  textconformance render-report <report.json>",
      "  textconformance diff-reports <expected-report.json> <actual-report.json>",
      "  textconformance validate-suite <suite.json>",
      "  textconformance run-suite <suite.json> [--target-root <repo>] [--target-results <targets.json>]",
      "  textconformance run-benchmark <suite.json> [--target-root <repo>] [--target-results <targets.json>] [--iterations <n>] [--warmup <n>]",
      "  textconformance validate-capability-registry <registry.json>",
      "",
    ].join("\n"),
  };
}

export async function runTextConformanceCli(args: readonly string[]): Promise<TextConformanceCliResult> {
  const [command, first, second] = args;
  try {
    if (command === "validate-report" && first !== undefined && second === undefined) {
      const report = await readJson(first);
      if (!isTextConformanceReportV1(report)) {
        return { exitCode: 1, stdout: "", stderr: `Invalid conformance report: ${first}\n` };
      }
      return {
        exitCode: 0,
        stdout: jsonLine({ ok: true, reportId: report.reportId, checkCount: report.checks.length }),
        stderr: "",
      };
    }
    if (command === "render-report" && first !== undefined && second === undefined) {
      const report = await readJson(first);
      if (!isTextConformanceReportV1(report)) {
        return { exitCode: 1, stdout: "", stderr: `Invalid conformance report: ${first}\n` };
      }
      return { exitCode: 0, stdout: renderTextConformanceReportMarkdown(report), stderr: "" };
    }
    if (command === "diff-reports" && first !== undefined && second !== undefined) {
      const expected = await readJson(first);
      const actual = await readJson(second);
      if (!isTextConformanceReportV1(expected)) {
        return { exitCode: 1, stdout: "", stderr: `Invalid expected conformance report: ${first}\n` };
      }
      if (!isTextConformanceReportV1(actual)) {
        return { exitCode: 1, stdout: "", stderr: `Invalid actual conformance report: ${second}\n` };
      }
      return { exitCode: 0, stdout: jsonLine(diffTextConformanceReports(expected, actual)), stderr: "" };
    }
    if (command === "validate-suite" && first !== undefined && second === undefined) {
      const suite = await readJson(first);
      if (isSuiteCatalog(suite)) {
        const reports = [];
        for (const entry of suite.suites) {
          if (!isTextConformanceSuiteV1(entry)) {
            return { exitCode: 1, stdout: "", stderr: `Invalid conformance suite in catalog: ${first}\n` };
          }
          reports.push(runTextConformanceSuite(entry));
        }
        return { exitCode: 0, stdout: jsonLine({ ok: true, reportCount: reports.length, reports }), stderr: "" };
      }
      if (!isTextConformanceSuiteV1(suite)) {
        return { exitCode: 1, stdout: "", stderr: `Invalid conformance suite: ${first}\n` };
      }
      return { exitCode: 0, stdout: jsonLine(runTextConformanceSuite(suite)), stderr: "" };
    }
    if (command === "run-suite") {
      const parsed = parseRunSuiteArgs(args.slice(1));
      if (parsed === undefined) return usage();
      const suite = await readJson(parsed.suitePath);
      if (isSuiteCatalog(suite)) {
        const reports = [];
        for (const entry of suite.suites) {
          if (!isTextConformanceSuiteV1(entry)) {
            return {
              exitCode: 1,
              stdout: "",
              stderr: `Invalid conformance suite in catalog: ${parsed.suitePath}\n`,
            };
          }
          const targets =
            parsed.targetResultsPath === undefined
              ? await probeSuiteTargetsFromFilesystem(entry, parsed.targetRoot)
              : await readTargetProbes(parsed.targetResultsPath);
          reports.push(runTextConformanceSuiteWithTargets(entry, { targets }));
        }
        return { exitCode: 0, stdout: jsonLine({ ok: true, reportCount: reports.length, reports }), stderr: "" };
      }
      if (!isTextConformanceSuiteV1(suite)) {
        return { exitCode: 1, stdout: "", stderr: `Invalid conformance suite: ${parsed.suitePath}\n` };
      }
      const targets =
        parsed.targetResultsPath === undefined
          ? await probeSuiteTargetsFromFilesystem(suite, parsed.targetRoot)
          : await readTargetProbes(parsed.targetResultsPath);
      return { exitCode: 0, stdout: jsonLine(runTextConformanceSuiteWithTargets(suite, { targets })), stderr: "" };
    }
    if (command === "run-benchmark") {
      const parsed = parseRunBenchmarkArgs(args.slice(1));
      if (parsed === undefined) return usage();
      const suite = await readJson(parsed.suitePath);
      if (isSuiteCatalog(suite)) {
        const reports = [];
        for (const entry of suite.suites) {
          if (!isTextConformanceSuiteV1(entry)) {
            return {
              exitCode: 1,
              stdout: "",
              stderr: `Invalid conformance suite in catalog: ${parsed.suitePath}\n`,
            };
          }
          reports.push(await runSuiteBenchmark(entry, parsed));
        }
        return { exitCode: 0, stdout: jsonLine({ ok: true, reportCount: reports.length, reports }), stderr: "" };
      }
      if (!isTextConformanceSuiteV1(suite)) {
        return { exitCode: 1, stdout: "", stderr: `Invalid conformance suite: ${parsed.suitePath}\n` };
      }
      return { exitCode: 0, stdout: jsonLine(await runSuiteBenchmark(suite, parsed)), stderr: "" };
    }
    if (command === "validate-capability-registry" && first !== undefined && second === undefined) {
      const registry = await readJson(first);
      if (!isTextConformanceCapabilityRegistryV1(registry)) {
        return { exitCode: 1, stdout: "", stderr: `Invalid capability registry: ${first}\n` };
      }
      return { exitCode: 0, stdout: jsonLine(validateTextConformanceCapabilityRegistry(registry)), stderr: "" };
    }
    return usage();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { exitCode: 1, stdout: "", stderr: `${message}\n` };
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await runTextConformanceCli(process.argv.slice(2));
  if (result.stdout.length > 0) process.stdout.write(result.stdout);
  if (result.stderr.length > 0) process.stderr.write(result.stderr);
  process.exitCode = result.exitCode;
}
