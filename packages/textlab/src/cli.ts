#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import {
  isTextlabSupportStatusDocument,
  renderSupportStatusSummary,
  summarizeSupportStatus,
} from "./index.js";

export interface TextlabCliResult {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
}

function usage(): string {
  return [
    "Usage:",
    "  textlab support-status [path]",
    "  textlab --help",
    "",
    "Commands:",
    "  support-status  Render a deterministic summary of docs/specs/support-status.v1.json.",
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

  if (command !== "support-status") {
    return {
      exitCode: 2,
      stdout: "",
      stderr: `Unknown command: ${command}\n${usage()}`,
    };
  }

  if (rest.length > 0) {
    return {
      exitCode: 2,
      stdout: "",
      stderr: `Too many arguments for support-status.\n${usage()}`,
    };
  }

  const path = pathArg ?? "docs/specs/support-status.v1.json";
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      exitCode: 1,
      stdout: "",
      stderr: `Failed to read support status from ${path}: ${message}`,
    };
  }

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

const isMain = process.argv[1] !== undefined && import.meta.url === new URL(`file://${process.argv[1]}`).href;

if (isMain) {
  const result = await runTextlabCli(process.argv.slice(2));
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  process.exitCode = result.exitCode;
}
