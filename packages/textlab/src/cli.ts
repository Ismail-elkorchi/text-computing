#!/usr/bin/env node
import { execFile } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import {
  inspectCorpusFixture,
  inspectComparatorDrift,
  inspectConformanceReportDiff,
  inspectEvidenceReplay,
  inspectPackageManifest,
  inspectReleaseReadiness,
  inspectRetrievalEvaluation,
  inspectRetrievalQrels,
  inspectTextdocDocument,
  inspectTextdocAnnotations,
  inspectTextPackManifest,
  isTextlabTaskEvidenceManifest,
  isTextlabSupportStatusDocument,
  renderComparatorDriftInspection,
  renderCorpusFixtureInspection,
  renderConformanceDiffInspection,
  renderConformanceReportSummary,
  renderEvidenceManifestSummary,
  renderEvidenceReplayInspection,
  renderPackageInspection,
  renderReleaseReadinessInspection,
  renderRetrievalEvaluationInspection,
  renderRetrievalQrelsInspection,
  renderSupportStatusSummary,
  renderTextdocDocumentInspection,
  renderTextdocAnnotationInspection,
  renderTextPackInspection,
  summarizeConformanceReport,
  summarizeEvidenceManifest,
  summarizeSupportStatus,
  type TextlabAnnotationInspectionOptions,
} from "./index.js";

export interface TextlabCliResult {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
}

function execFileText(binary: string, args: readonly string[], cwd: string): Promise<TextlabCliResult> {
  return new Promise((resolve) => {
    execFile(binary, [...args], { cwd, encoding: "utf8" }, (error, stdout, stderr) => {
      const exitCode =
        error !== null && typeof error === "object" && "code" in error && typeof error.code === "number"
          ? error.code
          : error === null
            ? 0
            : 1;
      resolve({
        exitCode,
        stdout,
        stderr,
      });
    });
  });
}

async function pathExists(candidate: string): Promise<boolean> {
  try {
    await access(candidate);
    return true;
  } catch {
    return false;
  }
}

async function findRepositoryRoot(startDirectory = process.cwd()): Promise<string | undefined> {
  let current = path.resolve(startDirectory);
  while (true) {
    const packagePath = path.join(current, "package.json");
    const comparePath = path.join(current, "tools", "compare", "run.mjs");
    if ((await pathExists(packagePath)) && (await pathExists(comparePath))) {
      try {
        const packageJson = JSON.parse(await readFile(packagePath, "utf8")) as { readonly name?: unknown };
        if (packageJson.name === "text-computing") return current;
      } catch {
        return undefined;
      }
    }
    const parent = path.dirname(current);
    if (parent === current) return undefined;
    current = parent;
  }
}

function usage(): string {
  return [
    "Usage:",
    "  textlab package <path> [--json]",
    "  textlab pack <path> [--json]",
    "  textlab document <path> [--json]",
    "  textlab annotations <path> [--layer-kind kind] [--lifecycle state] [--annotation-id id] [--json]",
    "  textlab conformance-report <path> [--json]",
    "  textlab conformance-diff <expected-path> <actual-path> [--json]",
    "  textlab comparator-drift [path] [--json]",
    "  textlab retrieval-qrels <path> [--json]",
    "  textlab retrieval-evaluation <path> [--json]",
    "  textlab release-readiness [path] [--json]",
    "  textlab support-status [path] [--json]",
    "  textlab evidence [path] [--json]",
    "  textlab evidence-replay [path] [--json]",
    "  textlab evidence-run <replay|execute> [task]",
    "  textlab corpus-fixture <path> [--json]",
    "  textlab --help",
    "",
    "Commands:",
    "  package         Inspect a package manifest.",
    "  pack            Inspect a textpack manifest.",
    "  document        Inspect a textdoc document summary.",
    "  annotations     Inspect or query a textdoc document annotation graph.",
    "  support-status  Render a deterministic summary of docs/specs/support-status.v1.json.",
    "  evidence        Render a deterministic summary of fixtures/reports/task-evidence-manifest.v1.json.",
    "  conformance-report  Render a deterministic summary of one conformance report.",
    "  conformance-diff    Render a deterministic diff between two conformance reports.",
    "  evidence-replay Render comparator/replay status counts.",
    "  comparator-drift    Render comparator drift and not-run rows from evidence replay.",
    "  evidence-run    Run the repository evidence replay or execution command.",
    "  corpus-fixture  Inspect corpus or retrieval expected-output fixtures.",
    "  retrieval-qrels Inspect retrieval relevance judgments.",
    "  retrieval-evaluation Inspect retrieval metric output.",
    "  release-readiness Inspect package release gate readiness.",
    "",
  ].join("\n");
}

export async function runTextlabCli(argv: readonly string[]): Promise<TextlabCliResult> {
  const json = argv.includes("--json");
  const normalizedArgs = argv.filter((arg) => arg !== "--json");
  const [command, pathArg, ...rest] = normalizedArgs;
  if (command === undefined || command === "--help" || command === "-h") {
    return {
      exitCode: 0,
      stdout: usage(),
      stderr: "",
    };
  }

  if (
    command !== "support-status" &&
    command !== "evidence" &&
    command !== "package" &&
    command !== "pack" &&
    command !== "document" &&
    command !== "conformance-report" &&
    command !== "conformance-diff" &&
    command !== "annotations" &&
    command !== "evidence-replay" &&
    command !== "comparator-drift" &&
    command !== "evidence-run" &&
    command !== "corpus-fixture" &&
    command !== "retrieval-qrels" &&
    command !== "retrieval-evaluation" &&
    command !== "release-readiness"
  ) {
    return {
      exitCode: 2,
      stdout: "",
      stderr: `Unknown command: ${command}\n${usage()}`,
    };
  }

  if (command === "evidence-run") {
    const [modeArg, taskArg = "all", ...extra] = [pathArg, ...rest];
    if (modeArg !== "replay" && modeArg !== "execute") {
      return {
        exitCode: 2,
        stdout: "",
        stderr: `Missing or invalid evidence-run mode.\n${usage()}`,
      };
    }
    if (extra.length > 0) {
      return {
        exitCode: 2,
        stdout: "",
        stderr: `Too many arguments for ${command}.\n${usage()}`,
      };
    }
    const root = await findRepositoryRoot();
    if (root === undefined) {
      return {
        exitCode: 1,
        stdout: "",
        stderr: "Could not find text-computing repository root for evidence-run.\n",
      };
    }
    return execFileText(process.execPath, ["tools/compare/run.mjs", modeArg, taskArg], root);
  }

  if (command === "conformance-diff") {
    const [actualPath, ...extra] = rest;
    if (pathArg === undefined || actualPath === undefined) {
      return {
        exitCode: 2,
        stdout: "",
        stderr: `Missing paths for conformance-diff.\n${usage()}`,
      };
    }
    if (extra.length > 0) {
      return {
        exitCode: 2,
        stdout: "",
        stderr: `Too many arguments for ${command}.\n${usage()}`,
      };
    }
    try {
      const expected = await readJson(pathArg);
      const actual = await readJson(actualPath);
      const inspection = inspectConformanceReportDiff(expected, actual);
      return {
        exitCode: 0,
        stdout: renderCliOutput(inspection, renderConformanceDiffInspection, json),
        stderr: "",
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        exitCode: 1,
        stdout: "",
        stderr: `Invalid conformance report diff input: ${message}`,
      };
    }
  }

  let annotationOptions: TextlabAnnotationInspectionOptions = {};
  if (command === "annotations") {
    const parsedOptions = parseAnnotationOptions(rest);
    if (typeof parsedOptions === "string") {
      return {
        exitCode: 2,
        stdout: "",
        stderr: `${parsedOptions}\n${usage()}`,
      };
    }
    annotationOptions = parsedOptions;
  } else if (rest.length > 0) {
    return {
      exitCode: 2,
      stdout: "",
      stderr: `Too many arguments for ${command}.\n${usage()}`,
    };
  }

  if (
    (command === "package" ||
      command === "pack" ||
      command === "document" ||
      command === "conformance-report" ||
      command === "annotations" ||
      command === "corpus-fixture" ||
      command === "retrieval-qrels" ||
      command === "retrieval-evaluation") &&
    pathArg === undefined
  ) {
    return {
      exitCode: 2,
      stdout: "",
      stderr: `Missing path for ${command}.\n${usage()}`,
    };
  }

  const inputPath =
    pathArg ??
    (command === "support-status"
      ? "docs/specs/support-status.v1.json"
      : command === "evidence-replay"
        ? "fixtures/reports/evidence-replay.v1.json"
        : command === "comparator-drift"
          ? "fixtures/reports/evidence-replay.v1.json"
          : command === "release-readiness"
            ? "fixtures/package-release/gates.v1.json"
            : "fixtures/reports/task-evidence-manifest.v1.json");
  let parsed: unknown;
  try {
    parsed = await readJson(inputPath);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      exitCode: 1,
      stdout: "",
      stderr: `Failed to read ${command} from ${inputPath}: ${message}`,
    };
  }

  if (command === "package") {
    try {
      const inspection = inspectPackageManifest(parsed);
      return {
        exitCode: 0,
        stdout: renderCliOutput(inspection, renderPackageInspection, json),
        stderr: "",
      };
    } catch {
      return {
        exitCode: 1,
        stdout: "",
        stderr: `Invalid package manifest: ${inputPath}`,
      };
    }
  }

  if (command === "pack") {
    try {
      const inspection = inspectTextPackManifest(parsed);
      return {
        exitCode: 0,
        stdout: renderCliOutput(inspection, renderTextPackInspection, json),
        stderr: "",
      };
    } catch {
      return {
        exitCode: 1,
        stdout: "",
        stderr: `Invalid textpack manifest: ${inputPath}`,
      };
    }
  }

  if (command === "document") {
    try {
      const inspection = inspectTextdocDocument(parsed);
      return {
        exitCode: 0,
        stdout: renderCliOutput(inspection, renderTextdocDocumentInspection, json),
        stderr: "",
      };
    } catch {
      return {
        exitCode: 1,
        stdout: "",
        stderr: `Invalid textdoc document: ${inputPath}`,
      };
    }
  }

  if (command === "support-status") {
    if (!isTextlabSupportStatusDocument(parsed)) {
      return {
        exitCode: 1,
        stdout: "",
        stderr: `Invalid support status document: ${inputPath}`,
      };
    }

    const summary = summarizeSupportStatus(parsed);
    return {
      exitCode: 0,
      stdout: renderCliOutput(summary, renderSupportStatusSummary, json),
      stderr: "",
    };
  }

  if (command === "evidence") {
    if (!isTextlabTaskEvidenceManifest(parsed)) {
      return {
        exitCode: 1,
        stdout: "",
        stderr: `Invalid task evidence manifest: ${inputPath}`,
      };
    }

    const summary = summarizeEvidenceManifest(parsed);
    return {
      exitCode: 0,
      stdout: renderCliOutput(summary, renderEvidenceManifestSummary, json),
      stderr: "",
    };
  }

  if (command === "evidence-replay") {
    try {
      const inspection = inspectEvidenceReplay(parsed);
      return {
        exitCode: 0,
        stdout: renderCliOutput(inspection, renderEvidenceReplayInspection, json),
        stderr: "",
      };
    } catch {
      return {
        exitCode: 1,
        stdout: "",
        stderr: `Invalid evidence replay document: ${inputPath}`,
      };
    }
  }

  if (command === "comparator-drift") {
    try {
      const inspection = inspectComparatorDrift(parsed);
      return {
        exitCode: 0,
        stdout: renderCliOutput(inspection, renderComparatorDriftInspection, json),
        stderr: "",
      };
    } catch {
      return {
        exitCode: 1,
        stdout: "",
        stderr: `Invalid evidence replay document: ${inputPath}`,
      };
    }
  }

  if (command === "annotations") {
    try {
      const inspection = inspectTextdocAnnotations(parsed, annotationOptions);
      return {
        exitCode: 0,
        stdout: renderCliOutput(inspection, renderTextdocAnnotationInspection, json),
        stderr: "",
      };
    } catch {
      return {
        exitCode: 1,
        stdout: "",
        stderr: `Invalid textdoc document: ${inputPath}`,
      };
    }
  }

  if (command === "corpus-fixture") {
    try {
      const inspection = inspectCorpusFixture(parsed);
      return {
        exitCode: 0,
        stdout: renderCliOutput(inspection, renderCorpusFixtureInspection, json),
        stderr: "",
      };
    } catch {
      return {
        exitCode: 1,
        stdout: "",
        stderr: `Invalid corpus fixture: ${inputPath}`,
      };
    }
  }

  if (command === "retrieval-qrels") {
    try {
      const inspection = inspectRetrievalQrels(parsed);
      return {
        exitCode: 0,
        stdout: renderCliOutput(inspection, renderRetrievalQrelsInspection, json),
        stderr: "",
      };
    } catch {
      return {
        exitCode: 1,
        stdout: "",
        stderr: `Invalid retrieval qrels document: ${inputPath}`,
      };
    }
  }

  if (command === "retrieval-evaluation") {
    try {
      const inspection = inspectRetrievalEvaluation(parsed);
      return {
        exitCode: 0,
        stdout: renderCliOutput(inspection, renderRetrievalEvaluationInspection, json),
        stderr: "",
      };
    } catch {
      return {
        exitCode: 1,
        stdout: "",
        stderr: `Invalid retrieval evaluation document: ${inputPath}`,
      };
    }
  }

  if (command === "release-readiness") {
    try {
      const inspection = inspectReleaseReadiness(parsed);
      return {
        exitCode: 0,
        stdout: renderCliOutput(inspection, renderReleaseReadinessInspection, json),
        stderr: "",
      };
    } catch {
      return {
        exitCode: 1,
        stdout: "",
        stderr: `Invalid release readiness document: ${inputPath}`,
      };
    }
  }

  try {
    const summary = summarizeConformanceReport(parsed);
    return {
      exitCode: 0,
      stdout: renderCliOutput(summary, renderConformanceReportSummary, json),
      stderr: "",
    };
  } catch {
    return {
      exitCode: 1,
      stdout: "",
      stderr: `Invalid conformance report: ${inputPath}`,
    };
  }
}

async function readJson(filePath: string): Promise<unknown> {
  return JSON.parse(await readFile(filePath, "utf8")) as unknown;
}

function renderCliOutput<T>(
  value: T,
  render: (value: T) => string,
  json: boolean,
): string {
  return json ? `${JSON.stringify(value, null, 2)}\n` : render(value);
}

function parseAnnotationOptions(args: readonly string[]): TextlabAnnotationInspectionOptions | string {
  const layerKinds: string[] = [];
  const lifecycleStates: string[] = [];
  const annotationIds: string[] = [];
  for (let index = 0; index < args.length; index += 2) {
    const name = args[index];
    const value = args[index + 1];
    if (name === undefined || value === undefined) {
      return "Missing value for annotations filter.";
    }
    if (name === "--layer-kind") {
      layerKinds.push(value);
    } else if (name === "--lifecycle") {
      lifecycleStates.push(value);
    } else if (name === "--annotation-id") {
      annotationIds.push(value);
    } else {
      return `Unknown annotations option: ${name}`;
    }
  }
  return {
    ...(layerKinds.length > 0 ? { layerKinds } : {}),
    ...(lifecycleStates.length > 0 ? { lifecycleStates } : {}),
    ...(annotationIds.length > 0 ? { annotationIds } : {}),
  };
}

const isMain = process.argv[1] !== undefined && import.meta.url === new URL(`file://${process.argv[1]}`).href;

if (isMain) {
  const result = await runTextlabCli(process.argv.slice(2));
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  process.exitCode = result.exitCode;
}
