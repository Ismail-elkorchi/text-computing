#!/usr/bin/env node
import { execFile } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import {
  inspectCorpusFixture,
  inspectEvidenceReplay,
  inspectTextdocAnnotations,
  isTextlabTaskEvidenceManifest,
  isTextlabSupportStatusDocument,
  renderCorpusFixtureInspection,
  renderConformanceReportSummary,
  renderEvidenceManifestSummary,
  renderEvidenceReplayInspection,
  renderSupportStatusSummary,
  renderTextdocAnnotationInspection,
  summarizeConformanceReport,
  summarizeEvidenceManifest,
  summarizeSupportStatus,
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
    "  textlab support-status [path]",
    "  textlab evidence [path]",
    "  textlab conformance-report <path>",
    "  textlab annotations <path>",
    "  textlab evidence-replay [path]",
    "  textlab evidence-run <replay|execute> [task]",
    "  textlab corpus-fixture <path>",
    "  textlab --help",
    "",
    "Commands:",
    "  support-status  Render a deterministic summary of docs/specs/support-status.v1.json.",
    "  evidence        Render a deterministic summary of fixtures/reports/task-evidence-manifest.v1.json.",
    "  conformance-report  Render a deterministic summary of one conformance report.",
    "  annotations     Inspect a textdoc document annotation graph.",
    "  evidence-replay Render comparator/replay status counts.",
    "  evidence-run    Run the repository evidence replay or execution command.",
    "  corpus-fixture  Inspect corpus or retrieval expected-output fixtures.",
    "",
  ].join("\n");
}

export async function runTextlabCli(argv: readonly string[]): Promise<TextlabCliResult> {
  const [command, pathArg, ...rest] = argv;
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
    command !== "conformance-report" &&
    command !== "annotations" &&
    command !== "evidence-replay" &&
    command !== "evidence-run" &&
    command !== "corpus-fixture"
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

  if (rest.length > 0) {
    return {
      exitCode: 2,
      stdout: "",
      stderr: `Too many arguments for ${command}.\n${usage()}`,
    };
  }

  if (command === "conformance-report" && pathArg === undefined) {
    return {
      exitCode: 2,
      stdout: "",
      stderr: `Missing path for conformance-report.\n${usage()}`,
    };
  }

  if (command === "annotations" && pathArg === undefined) {
    return {
      exitCode: 2,
      stdout: "",
      stderr: `Missing path for annotations.\n${usage()}`,
    };
  }

  if (command === "corpus-fixture" && pathArg === undefined) {
    return {
      exitCode: 2,
      stdout: "",
      stderr: `Missing path for corpus-fixture.\n${usage()}`,
    };
  }

  const path =
    pathArg ??
    (command === "support-status"
      ? "docs/specs/support-status.v1.json"
      : command === "evidence-replay"
        ? "fixtures/reports/evidence-replay.v1.json"
        : "fixtures/reports/task-evidence-manifest.v1.json");
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      exitCode: 1,
      stdout: "",
      stderr: `Failed to read ${command} from ${path}: ${message}`,
    };
  }

  if (command === "support-status") {
    if (!isTextlabSupportStatusDocument(parsed)) {
      return {
        exitCode: 1,
        stdout: "",
        stderr: `Invalid support status document: ${path}`,
      };
    }

    return {
      exitCode: 0,
      stdout: renderSupportStatusSummary(summarizeSupportStatus(parsed)),
      stderr: "",
    };
  }

  if (command === "evidence") {
    if (!isTextlabTaskEvidenceManifest(parsed)) {
      return {
        exitCode: 1,
        stdout: "",
        stderr: `Invalid task evidence manifest: ${path}`,
      };
    }

    return {
      exitCode: 0,
      stdout: renderEvidenceManifestSummary(summarizeEvidenceManifest(parsed)),
      stderr: "",
    };
  }

  if (command === "evidence-replay") {
    try {
      return {
        exitCode: 0,
        stdout: renderEvidenceReplayInspection(inspectEvidenceReplay(parsed)),
        stderr: "",
      };
    } catch {
      return {
        exitCode: 1,
        stdout: "",
        stderr: `Invalid evidence replay document: ${path}`,
      };
    }
  }

  if (command === "annotations") {
    try {
      return {
        exitCode: 0,
        stdout: renderTextdocAnnotationInspection(inspectTextdocAnnotations(parsed)),
        stderr: "",
      };
    } catch {
      return {
        exitCode: 1,
        stdout: "",
        stderr: `Invalid textdoc document: ${path}`,
      };
    }
  }

  if (command === "corpus-fixture") {
    try {
      return {
        exitCode: 0,
        stdout: renderCorpusFixtureInspection(inspectCorpusFixture(parsed)),
        stderr: "",
      };
    } catch {
      return {
        exitCode: 1,
        stdout: "",
        stderr: `Invalid corpus fixture: ${path}`,
      };
    }
  }

  try {
    return {
      exitCode: 0,
      stdout: renderConformanceReportSummary(summarizeConformanceReport(parsed)),
      stderr: "",
    };
  } catch {
    return {
      exitCode: 1,
      stdout: "",
      stderr: `Invalid conformance report: ${path}`,
    };
  }
}

const isMain = process.argv[1] !== undefined && import.meta.url === new URL(`file://${process.argv[1]}`).href;

if (isMain) {
  const result = await runTextlabCli(process.argv.slice(2));
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  process.exitCode = result.exitCode;
}
