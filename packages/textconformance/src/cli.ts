#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import {
  diffTextConformanceReports,
  isTextConformanceCapabilityRegistryV1,
  isTextConformanceReportV1,
  isTextConformanceSuiteV1,
  renderTextConformanceReportMarkdown,
  runTextConformanceSuite,
  validateTextConformanceCapabilityRegistry,
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
