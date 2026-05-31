#!/usr/bin/env node
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import {
  inspectCorpusFixture,
  inspectConformanceReportDiff,
  inspectPackageManifest,
  inspectPackBackedRuleAnnotations,
  inspectReleaseReadiness,
  inspectRetrievalEvaluation,
  inspectRetrievalQrels,
  inspectTextdocDocument,
  inspectTextdocAnnotations,
  inspectTextPackManifest,
  inspectTextPackResourceList,
  inspectTextPackValidation,
  inspectTextPipelineTrace,
  renderCorpusFixtureInspection,
  renderConformanceDiffInspection,
  renderConformanceReportSummary,
  renderPackageInspection,
  renderPackBackedRuleInspection,
  renderReleaseReadinessInspection,
  renderRetrievalEvaluationInspection,
  renderRetrievalQrelsInspection,
  renderTextdocDocumentInspection,
  renderTextdocAnnotationInspection,
  renderTextPackInspection,
  renderTextPackResourceListInspection,
  renderTextPackValidationInspection,
  renderTextPipelineTraceInspection,
  summarizeConformanceReport,
  type TextlabAnnotationInspectionOptions,
  type TextlabPackBackedRuleInspectionOptions,
} from "./index.js";

export interface TextlabCliResult {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
}

function usage(): string {
  return [
    "Usage:",
    "  textlab package <path> [--json]",
    "  textlab pack <path> [--json]",
    "  textlab pack inspect <path> [--json]",
    "  textlab pack validate <path> [--json]",
    "  textlab pack list-resources <path> [--json]",
    "  textlab document <path> [--json]",
    "  textlab annotations <path> [--layer-kind kind] [--lifecycle state] [--annotation-id id] [--json]",
    "  textlab pipeline-trace <path> [--json]",
    "  textlab pack-backed-rules <textdoc-path> [--pack-id id] [--resource-id id] [--rule-kind kind] [--json]",
    "  textlab conformance-report <path> [--json]",
    "  textlab conformance-diff <expected-path> <actual-path> [--json]",
    "  textlab retrieval-qrels <path> [--json]",
    "  textlab retrieval-evaluation <path> [--json]",
    "  textlab release-readiness [path] [--json]",
    "  textlab corpus-fixture <path> [--json]",
    "  textlab --help",
    "",
    "Commands:",
    "  package         Inspect a package manifest.",
    "  pack            Inspect, validate, or list resources from a textpack manifest or pack directory.",
    "  document        Inspect a textdoc document summary.",
    "  annotations     Inspect or query a textdoc document annotation graph.",
    "  pipeline-trace  Inspect a textpipeline trace payload.",
    "  pack-backed-rules Inspect pack-backed textrules annotations in a textdoc document.",
    "  conformance-report  Render a deterministic summary of one conformance report.",
    "  conformance-diff    Render a deterministic diff between two conformance reports.",
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
    command !== "package" &&
    command !== "pack" &&
    command !== "document" &&
    command !== "conformance-report" &&
    command !== "conformance-diff" &&
    command !== "annotations" &&
    command !== "pipeline-trace" &&
    command !== "pack-backed-rules" &&
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

  if (command === "pack") {
    return runTextlabPackCli(pathArg, rest, json);
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
  let packBackedRuleOptions: TextlabPackBackedRuleInspectionOptions = {};
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
  } else if (command === "pack-backed-rules") {
    const parsedOptions = parsePackBackedRuleOptions(rest);
    if (typeof parsedOptions === "string") {
      return {
        exitCode: 2,
        stdout: "",
        stderr: `${parsedOptions}\n${usage()}`,
      };
    }
    packBackedRuleOptions = parsedOptions;
  } else if (rest.length > 0) {
    return {
      exitCode: 2,
      stdout: "",
      stderr: `Too many arguments for ${command}.\n${usage()}`,
    };
  }

  if (
    (command === "package" ||
      command === "document" ||
      command === "conformance-report" ||
      command === "annotations" ||
      command === "pipeline-trace" ||
      command === "pack-backed-rules" ||
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

  const inputPath = pathArg ?? (command === "release-readiness" ? "fixtures/package-release/gates.v1.json" : "");
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

  if (command === "pipeline-trace") {
    try {
      const inspection = inspectTextPipelineTrace(parsed);
      return {
        exitCode: 0,
        stdout: renderCliOutput(inspection, renderTextPipelineTraceInspection, json),
        stderr: "",
      };
    } catch {
      return {
        exitCode: 1,
        stdout: "",
        stderr: `Invalid textpipeline trace: ${inputPath}`,
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

  if (command === "pack-backed-rules") {
    try {
      const inspection = inspectPackBackedRuleAnnotations(parsed, packBackedRuleOptions);
      return {
        exitCode: 0,
        stdout: renderCliOutput(inspection, renderPackBackedRuleInspection, json),
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

async function readTextPackManifestInput(inputPath: string): Promise<{
  readonly manifestPath: string;
  readonly parsed: unknown;
}> {
  const inputStat = await stat(inputPath);
  const manifestPath = inputStat.isDirectory() ? path.join(inputPath, "pack.manifest.json") : inputPath;
  return {
    manifestPath,
    parsed: await readJson(manifestPath),
  };
}

async function runTextlabPackCli(
  firstArg: string | undefined,
  rest: readonly string[],
  json: boolean,
): Promise<TextlabCliResult> {
  if (firstArg === undefined) {
    return {
      exitCode: 2,
      stdout: "",
      stderr: `Missing path for pack.\n${usage()}`,
    };
  }

  const subcommands = new Set(["inspect", "validate", "list-resources"]);
  const subcommand = subcommands.has(firstArg) ? firstArg : "inspect";
  const targetPath = subcommand === "inspect" && !subcommands.has(firstArg) ? firstArg : rest[0];
  const extra = subcommand === "inspect" && !subcommands.has(firstArg) ? rest : rest.slice(1);
  if (targetPath === undefined) {
    return {
      exitCode: 2,
      stdout: "",
      stderr: `Missing path for pack ${subcommand}.\n${usage()}`,
    };
  }
  if (extra.length > 0) {
    return {
      exitCode: 2,
      stdout: "",
      stderr: `Too many arguments for pack ${subcommand}.\n${usage()}`,
    };
  }

  let parsed: unknown;
  let manifestPath: string;
  try {
    const input = await readTextPackManifestInput(targetPath);
    parsed = input.parsed;
    manifestPath = input.manifestPath;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      exitCode: 1,
      stdout: "",
      stderr: `Failed to read textpack manifest from ${targetPath}: ${message}`,
    };
  }

  if (subcommand === "validate") {
    const inspection = inspectTextPackValidation(parsed);
    return {
      exitCode: inspection.ok ? 0 : 1,
      stdout: renderCliOutput(inspection, renderTextPackValidationInspection, json),
      stderr: "",
    };
  }

  try {
    if (subcommand === "list-resources") {
      const inspection = inspectTextPackResourceList(parsed);
      return {
        exitCode: 0,
        stdout: renderCliOutput(inspection, renderTextPackResourceListInspection, json),
        stderr: "",
      };
    }

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
      stderr: `Invalid textpack manifest: ${manifestPath}`,
    };
  }
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

function parsePackBackedRuleOptions(args: readonly string[]): TextlabPackBackedRuleInspectionOptions | string {
  const packIds: string[] = [];
  const resourceIds: string[] = [];
  const ruleKinds: Array<NonNullable<TextlabPackBackedRuleInspectionOptions["ruleKinds"]>[number]> = [];
  for (let index = 0; index < args.length; index += 2) {
    const name = args[index];
    const value = args[index + 1];
    if (name === undefined || value === undefined) {
      return "Missing value for pack-backed-rules filter.";
    }
    if (name === "--pack-id") {
      packIds.push(value);
    } else if (name === "--resource-id") {
      resourceIds.push(value);
    } else if (name === "--rule-kind") {
      if (value !== "stopword" && value !== "lexicon" && value !== "gazetteer" && value !== "rule-list") {
        return `Invalid pack-backed rule kind: ${value}`;
      }
      ruleKinds.push(value);
    } else {
      return `Unknown pack-backed-rules option: ${name}`;
    }
  }
  return {
    ...(packIds.length > 0 ? { packIds } : {}),
    ...(resourceIds.length > 0 ? { resourceIds } : {}),
    ...(ruleKinds.length > 0 ? { ruleKinds } : {}),
  };
}

const isMain = process.argv[1] !== undefined && import.meta.url === new URL(`file://${process.argv[1]}`).href;

if (isMain) {
  const result = await runTextlabCli(process.argv.slice(2));
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  process.exitCode = result.exitCode;
}
