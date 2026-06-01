#!/usr/bin/env node
import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  isTextPackManifestV1,
  planTextPackResourceTransaction,
  textPackReviewEvidenceKinds,
  textPackReviewStates,
  textPackResourceFamilies,
  type TextPackManifestV1,
  type TextPackReviewEvidenceKind,
  type TextPackReviewPolicy,
  type TextPackReviewState,
  type TextPackResourceFamily,
  type TextPackResourceTransactionAction,
  type TextPackResourceTransactionOperation,
  type TextPackResourceTransactionPlan,
} from "@ismail-elkorchi/textpack";
import {
  inspectCorpusFixture,
  inspectConformanceReportDiff,
  inspectPackageManifest,
  inspectPackBackedRuleAnnotations,
  inspectReleaseReadiness,
  inspectRetrievalEvaluation,
  inspectRetrievalQrels,
  inspectTextCorpusArtifact,
  inspectTextdocDocument,
  inspectTextdocAnnotations,
  inspectTextPackManifest,
  inspectTextPackResourceAudit,
  inspectTextPackResourceList,
  inspectTextPackReview,
  inspectTextPackValidation,
  inspectTextPipelineBatchReport,
  inspectTextPipelineTrace,
  inspectTextProtocolResultEnvelope,
  inspectTextProtocolSchemaFamilyEnvelope,
  inspectTextConformanceBenchmarkReport,
  renderCorpusFixtureInspection,
  renderConformanceDiffInspection,
  renderConformanceReportSummary,
  renderPackageInspection,
  renderPackBackedRuleInspection,
  renderReleaseReadinessInspection,
  renderRetrievalEvaluationInspection,
  renderRetrievalQrelsInspection,
  renderTextCorpusArtifactInspection,
  renderTextdocDocumentInspection,
  renderTextdocAnnotationInspection,
  renderTextPackInspection,
  renderTextPackAuditInspection,
  renderTextPackReviewInspection,
  renderTextPackResourceListInspection,
  renderTextPackValidationInspection,
  renderTextPipelineBatchReportInspection,
  renderTextPipelineTraceInspection,
  renderTextProtocolResultEnvelopeInspection,
  renderTextProtocolSchemaFamilyEnvelopeInspection,
  renderTextConformanceBenchmarkReportInspection,
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
    "  textlab pack audit <pack-root> [--json]",
    "  textlab pack review <pack-root> [--target-state state] [--engine package=version] [--required-profile id] [--mandatory-resource id] [--active-pack id] [--minimum-compatible-review-state state] [--require-compatibility true] [--required-evidence kind] [--reviewer id] [--conformance-ref ref] [--benchmark-ref ref] [--security-ref ref] [--migration-ref ref] [--json]",
    "  textlab pack list-resources <path> [--json]",
    "  textlab pack add-resource <pack-root> --family family --resource-id id --resource-path path --content text [--json]",
    "  textlab pack update-resource <pack-root> --resource-id id [--family family] [--next-resource-id id] [--resource-path path] [--content text] [--json]",
    "  textlab pack remove-resource <pack-root> --resource-id id [--json]",
    "  textlab document <path> [--json]",
    "  textlab annotations <path> [--layer-kind kind] [--lifecycle state] [--annotation-id id] [--json]",
    "  textlab result-envelope <path> [--json]",
    "  textlab schema-family-envelope <path> [--json]",
    "  textlab pipeline-trace <path> [--json]",
    "  textlab pipeline-batch-report <path> [--json]",
    "  textlab pack-backed-rules <textdoc-path> [--pack-id id] [--resource-id id] [--rule-kind kind] [--json]",
    "  textlab conformance-report <path> [--json]",
    "  textlab conformance-diff <expected-path> <actual-path> [--json]",
    "  textlab benchmark-report <path> [--json]",
    "  textlab retrieval-qrels <path> [--json]",
    "  textlab retrieval-evaluation <path> [--json]",
    "  textlab release-readiness [path] [--json]",
    "  textlab corpus-fixture <path> [--json]",
    "  textlab corpus-artifact <path> [--json]",
    "  textlab --help",
    "",
    "Commands:",
    "  package         Inspect a package manifest.",
    "  pack            Inspect, validate, audit, edit, or list resources from a textpack manifest or pack directory.",
    "  document        Inspect a textdoc document summary.",
    "  annotations     Inspect or query a textdoc document annotation graph.",
    "  result-envelope Inspect a textprotocol result envelope payload.",
    "  schema-family-envelope Inspect a textprotocol schema-family envelope payload.",
    "  pipeline-trace  Inspect a textpipeline trace payload.",
    "  pipeline-batch-report  Inspect a textpipeline batch run report payload.",
    "  pack-backed-rules Inspect pack-backed textrules annotations in a textdoc document.",
    "  conformance-report  Render a deterministic summary of one conformance report.",
    "  conformance-diff    Render a deterministic diff between two conformance reports.",
    "  benchmark-report    Inspect a textconformance benchmark report without treating it as conformance.",
    "  corpus-fixture  Inspect corpus or retrieval expected-output fixtures.",
    "  corpus-artifact Inspect a persisted textcorpus artifact or metric-envelope payload.",
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
    command !== "benchmark-report" &&
    command !== "annotations" &&
    command !== "result-envelope" &&
    command !== "schema-family-envelope" &&
    command !== "pipeline-trace" &&
    command !== "pipeline-batch-report" &&
    command !== "pack-backed-rules" &&
    command !== "corpus-fixture" &&
    command !== "corpus-artifact" &&
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
      command === "benchmark-report" ||
      command === "annotations" ||
      command === "result-envelope" ||
      command === "schema-family-envelope" ||
      command === "pipeline-trace" ||
      command === "pipeline-batch-report" ||
      command === "pack-backed-rules" ||
      command === "corpus-fixture" ||
      command === "corpus-artifact" ||
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

  if (command === "result-envelope") {
    try {
      const inspection = inspectTextProtocolResultEnvelope(parsed);
      return {
        exitCode: 0,
        stdout: renderCliOutput(inspection, renderTextProtocolResultEnvelopeInspection, json),
        stderr: "",
      };
    } catch {
      return {
        exitCode: 1,
        stdout: "",
        stderr: `Invalid textprotocol result envelope: ${inputPath}`,
      };
    }
  }

  if (command === "schema-family-envelope") {
    try {
      const inspection = inspectTextProtocolSchemaFamilyEnvelope(parsed);
      return {
        exitCode: 0,
        stdout: renderCliOutput(inspection, renderTextProtocolSchemaFamilyEnvelopeInspection, json),
        stderr: "",
      };
    } catch {
      return {
        exitCode: 1,
        stdout: "",
        stderr: `Invalid textprotocol schema-family envelope: ${inputPath}`,
      };
    }
  }

  if (command === "pipeline-batch-report") {
    try {
      const inspection = inspectTextPipelineBatchReport(parsed);
      return {
        exitCode: 0,
        stdout: renderCliOutput(inspection, renderTextPipelineBatchReportInspection, json),
        stderr: "",
      };
    } catch {
      return {
        exitCode: 1,
        stdout: "",
        stderr: `Invalid textpipeline batch report: ${inputPath}`,
      };
    }
  }

  if (command === "benchmark-report") {
    try {
      const inspection = inspectTextConformanceBenchmarkReport(parsed);
      return {
        exitCode: 0,
        stdout: renderCliOutput(inspection, renderTextConformanceBenchmarkReportInspection, json),
        stderr: "",
      };
    } catch {
      return {
        exitCode: 1,
        stdout: "",
        stderr: `Invalid textconformance benchmark report: ${inputPath}`,
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

  if (command === "corpus-artifact") {
    try {
      const inspection = inspectTextCorpusArtifact(parsed);
      return {
        exitCode: 0,
        stdout: renderCliOutput(inspection, renderTextCorpusArtifactInspection, json),
        stderr: "",
      };
    } catch {
      return {
        exitCode: 1,
        stdout: "",
        stderr: `Invalid textcorpus artifact: ${inputPath}`,
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
  readonly rootPath: string;
  readonly parsed: unknown;
}> {
  const inputStat = await stat(inputPath);
  const manifestPath = inputStat.isDirectory() ? path.join(inputPath, "pack.manifest.json") : inputPath;
  const rootPath = inputStat.isDirectory() ? inputPath : path.dirname(inputPath);
  return {
    manifestPath,
    rootPath,
    parsed: await readJson(manifestPath),
  };
}

async function listTextPackResourceInventory(packRoot: string): Promise<readonly string[]> {
  const resourcesRoot = path.join(packRoot, "resources");
  try {
    const resourcesStat = await stat(resourcesRoot);
    if (!resourcesStat.isDirectory()) return [];
  } catch {
    return [];
  }

  const paths: string[] = [];
  const stack = [resourcesRoot];
  while (stack.length > 0) {
    const current = stack.pop();
    if (current === undefined) continue;
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const absolutePath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(absolutePath);
      } else if (entry.isFile()) {
        paths.push(path.relative(packRoot, absolutePath).split(path.sep).join("/"));
      }
    }
  }
  return paths.sort((left, right) => left.localeCompare(right));
}

interface TextlabPackAuthoringOptionMap {
  readonly family?: string;
  readonly resourceId?: string;
  readonly nextResourceId?: string;
  readonly resourcePath?: string;
  readonly content?: string;
}

interface TextlabPackAuthoringInspection {
  readonly schemaVersion: 1;
  readonly ok: boolean;
  readonly action: TextPackResourceTransactionAction;
  readonly packRoot: string;
  readonly manifestPath: string;
  readonly changedResourcePaths: readonly string[];
  readonly removedResourcePaths: readonly string[];
  readonly plan: TextPackResourceTransactionPlan;
  readonly audit: ReturnType<typeof inspectTextPackResourceAudit>;
}

function parsePackAuthoringOptions(args: readonly string[]): TextlabPackAuthoringOptionMap | string {
  const values: Record<string, string> = {};
  for (let index = 0; index < args.length; index += 2) {
    const name = args[index];
    const value = args[index + 1];
    if (name === undefined || value === undefined) return "Missing value for pack resource option.";
    if (!name.startsWith("--")) return `Unknown pack resource option: ${name}`;
    const key = name.slice(2);
    if (
      key !== "family" &&
      key !== "resource-id" &&
      key !== "next-resource-id" &&
      key !== "resource-path" &&
      key !== "content"
    ) {
      return `Unknown pack resource option: ${name}`;
    }
    values[key] = value;
  }
  return {
    ...(values["family"] === undefined ? {} : { family: values["family"] }),
    ...(values["resource-id"] === undefined ? {} : { resourceId: values["resource-id"] }),
    ...(values["next-resource-id"] === undefined ? {} : { nextResourceId: values["next-resource-id"] }),
    ...(values["resource-path"] === undefined ? {} : { resourcePath: values["resource-path"] }),
    ...(values["content"] === undefined ? {} : { content: values["content"] }),
  };
}

function parseTextPackResourceFamily(value: string | undefined): {
  readonly ok: true;
  readonly family: TextPackResourceFamily;
} | {
  readonly ok: false;
  readonly message: string;
} {
  if (value === undefined) return { ok: false, message: "Missing --family." };
  if (textPackResourceFamilies.includes(value as TextPackResourceFamily)) {
    return { ok: true, family: value as TextPackResourceFamily };
  }
  return { ok: false, message: `Unsupported textpack resource family: ${value}` };
}

function parseTextPackReviewState(value: string | undefined, optionName: string): {
  readonly ok: true;
  readonly state: TextPackReviewState;
} | {
  readonly ok: false;
  readonly message: string;
} {
  if (value === undefined) return { ok: false, message: `Missing value for ${optionName}.` };
  if (textPackReviewStates.includes(value as TextPackReviewState)) {
    return { ok: true, state: value as TextPackReviewState };
  }
  return { ok: false, message: `Unsupported textpack review state for ${optionName}: ${value}` };
}

function parseTextPackReviewEvidenceKind(value: string | undefined): {
  readonly ok: true;
  readonly kind: TextPackReviewEvidenceKind;
} | {
  readonly ok: false;
  readonly message: string;
} {
  if (value === undefined) return { ok: false, message: "Missing value for --required-evidence." };
  if (textPackReviewEvidenceKinds.includes(value as TextPackReviewEvidenceKind)) {
    return { ok: true, kind: value as TextPackReviewEvidenceKind };
  }
  return { ok: false, message: `Unsupported textpack review evidence kind: ${value}` };
}

function parseBooleanOption(value: string | undefined, optionName: string): boolean | string {
  if (value === undefined) return `Missing value for ${optionName}.`;
  if (value === "true") return true;
  if (value === "false") return false;
  return `${optionName} must be true or false.`;
}

function parseEngineVersionOption(value: string | undefined): {
  readonly packageName: string;
  readonly version: string;
} | string {
  if (value === undefined) return "Missing value for --engine.";
  const separatorIndex = value.lastIndexOf("=");
  if (separatorIndex <= 0 || separatorIndex === value.length - 1) {
    return "--engine must use package=version.";
  }
  return {
    packageName: value.slice(0, separatorIndex),
    version: value.slice(separatorIndex + 1),
  };
}

function parsePackReviewOptions(args: readonly string[]): TextPackReviewPolicy | string {
  let targetReviewState: TextPackReviewState | undefined;
  let minimumCompatibleReviewState: Exclude<TextPackReviewState, "deprecated"> | undefined;
  let requireCompatibility: boolean | undefined;
  const packageVersions: Record<string, string> = {};
  const requiredProfiles: string[] = [];
  const mandatoryResources: string[] = [];
  const activePackIds: string[] = [];
  const requiredEvidence: TextPackReviewEvidenceKind[] = [];
  const reviewerIds: string[] = [];
  const conformanceRefs: string[] = [];
  const benchmarkRefs: string[] = [];
  const securityRefs: string[] = [];
  const migrationRefs: string[] = [];

  for (let index = 0; index < args.length; index += 2) {
    const name = args[index];
    const value = args[index + 1];
    if (name === undefined || value === undefined) return "Missing value for pack review option.";
    if (!name.startsWith("--")) return `Unknown pack review option: ${name}`;
    if (name === "--target-state") {
      const parsed = parseTextPackReviewState(value, name);
      if (!parsed.ok) return parsed.message;
      targetReviewState = parsed.state;
    } else if (name === "--minimum-compatible-review-state") {
      const parsed = parseTextPackReviewState(value, name);
      if (!parsed.ok) return parsed.message;
      if (parsed.state === "deprecated") return "--minimum-compatible-review-state cannot be deprecated.";
      minimumCompatibleReviewState = parsed.state;
    } else if (name === "--require-compatibility") {
      const parsed = parseBooleanOption(value, name);
      if (typeof parsed === "string") return parsed;
      requireCompatibility = parsed;
    } else if (name === "--engine") {
      const parsed = parseEngineVersionOption(value);
      if (typeof parsed === "string") return parsed;
      packageVersions[parsed.packageName] = parsed.version;
    } else if (name === "--required-profile") {
      requiredProfiles.push(value);
    } else if (name === "--mandatory-resource") {
      mandatoryResources.push(value);
    } else if (name === "--active-pack") {
      activePackIds.push(value);
    } else if (name === "--required-evidence") {
      const parsed = parseTextPackReviewEvidenceKind(value);
      if (!parsed.ok) return parsed.message;
      requiredEvidence.push(parsed.kind);
    } else if (name === "--reviewer") {
      reviewerIds.push(value);
    } else if (name === "--conformance-ref") {
      conformanceRefs.push(value);
    } else if (name === "--benchmark-ref") {
      benchmarkRefs.push(value);
    } else if (name === "--security-ref") {
      securityRefs.push(value);
    } else if (name === "--migration-ref") {
      migrationRefs.push(value);
    } else {
      return `Unknown pack review option: ${name}`;
    }
  }

  return {
    ...(targetReviewState === undefined ? {} : { targetReviewState }),
    ...(Object.keys(packageVersions).length === 0 ? {} : { packageVersions }),
    ...(requiredProfiles.length === 0 ? {} : { requiredProfiles: [...new Set(requiredProfiles)].sort() }),
    ...(mandatoryResources.length === 0 ? {} : { mandatoryResources: [...new Set(mandatoryResources)].sort() }),
    ...(activePackIds.length === 0 ? {} : { activePackIds: [...new Set(activePackIds)].sort() }),
    ...(minimumCompatibleReviewState === undefined ? {} : { minimumCompatibleReviewState }),
    ...(requireCompatibility === undefined ? {} : { requireCompatibility }),
    ...(requiredEvidence.length === 0 ? {} : { requiredEvidence: [...new Set(requiredEvidence)].sort() }),
    ...(reviewerIds.length === 0 &&
    conformanceRefs.length === 0 &&
    benchmarkRefs.length === 0 &&
    securityRefs.length === 0 &&
    migrationRefs.length === 0
      ? {}
      : {
          evidence: {
            ...(reviewerIds.length === 0 ? {} : { reviewerIds: [...new Set(reviewerIds)].sort() }),
            ...(conformanceRefs.length === 0 ? {} : { conformanceRefs: [...new Set(conformanceRefs)].sort() }),
            ...(benchmarkRefs.length === 0 ? {} : { benchmarkRefs: [...new Set(benchmarkRefs)].sort() }),
            ...(securityRefs.length === 0 ? {} : { securityRefs: [...new Set(securityRefs)].sort() }),
            ...(migrationRefs.length === 0 ? {} : { migrationRefs: [...new Set(migrationRefs)].sort() }),
          },
        }),
  };
}

function manifestResourcePathForId(manifest: TextPackManifestV1, resourceId: string): string | undefined {
  for (const family of textPackResourceFamilies) {
    const index = (manifest.provides[family] ?? []).indexOf(resourceId);
    if (index < 0) continue;
    return manifest.resources[family]?.[index];
  }
  return undefined;
}

function buildPackAuthoringOperation(
  subcommand: string,
  manifest: TextPackManifestV1,
  args: readonly string[],
): TextPackResourceTransactionOperation | string {
  const options = parsePackAuthoringOptions(args);
  if (typeof options === "string") return options;

  if (subcommand === "add-resource") {
    const family = parseTextPackResourceFamily(options.family);
    if (!family.ok) return family.message;
    if (options.resourceId === undefined) return "Missing --resource-id.";
    if (options.resourcePath === undefined) return "Missing --resource-path.";
    if (options.content === undefined) return "Missing --content.";
    return {
      action: "add-resource",
      resource: {
        family: family.family,
        resourceId: options.resourceId,
        resourcePath: options.resourcePath,
      },
    };
  }

  if (subcommand === "update-resource") {
    if (options.resourceId === undefined) return "Missing --resource-id.";
    if (
      options.family === undefined &&
      options.nextResourceId === undefined &&
      options.resourcePath === undefined &&
      options.content === undefined
    ) {
      return "Missing update option; provide --family, --next-resource-id, --resource-path, or --content.";
    }
    const family = options.family === undefined ? undefined : parseTextPackResourceFamily(options.family);
    if (family !== undefined && !family.ok) return family.message;
    if (options.resourcePath !== undefined && options.content === undefined) {
      return "Changing --resource-path requires --content so the new resource file can be written.";
    }
    if (
      options.content !== undefined &&
      options.resourcePath === undefined &&
      manifestResourcePathForId(manifest, options.resourceId) === undefined
    ) {
      return `Textpack manifest resource ${options.resourceId} was not found.`;
    }
    return {
      action: "update-resource",
      resourceId: options.resourceId,
      update: {
        ...(family === undefined ? {} : { family: family.family }),
        ...(options.resourcePath === undefined ? {} : { resourcePath: options.resourcePath }),
        ...(options.nextResourceId === undefined ? {} : { resourceId: options.nextResourceId }),
      },
    };
  }

  if (subcommand === "remove-resource") {
    if (options.resourceId === undefined) return "Missing --resource-id.";
    return {
      action: "remove-resource",
      resourceId: options.resourceId,
    };
  }

  return `Unsupported pack authoring command: ${subcommand}`;
}

function canonicalPackRelativePath(resourcePath: string): string {
  return resourcePath.startsWith("./") ? resourcePath.slice(2) : resourcePath;
}

function resolvePackRelativePath(packRoot: string, resourcePath: string): string {
  const normalizedRoot = path.resolve(packRoot);
  const resolved = path.resolve(normalizedRoot, canonicalPackRelativePath(resourcePath));
  if (resolved !== normalizedRoot && !resolved.startsWith(`${normalizedRoot}${path.sep}`)) {
    throw new Error(`Resource path escapes pack root: ${resourcePath}`);
  }
  return resolved;
}

async function writeTextFileAtomic(filePath: string, content: string): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  try {
    await writeFile(tempPath, content, "utf8");
    await rename(tempPath, filePath);
  } catch (error) {
    await rm(tempPath, { force: true });
    throw error;
  }
}

function renderPackAuthoringInspection(inspection: TextlabPackAuthoringInspection): string {
  return [
    "# textlab pack authoring",
    "",
    `Action: ${inspection.action}`,
    `Status: ${inspection.ok ? "valid" : "invalid"}`,
    `Pack root: ${inspection.packRoot}`,
    `Manifest: ${inspection.manifestPath}`,
    `Changed resources: ${inspection.changedResourcePaths.join(",") || "none"}`,
    `Removed resources: ${inspection.removedResourcePaths.join(",") || "none"}`,
    "",
    renderTextPackAuditInspection(inspection.audit).trimEnd(),
    "",
  ].join("\n");
}

async function runTextlabPackAuthoringCli(
  subcommand: string,
  targetPath: string,
  extra: readonly string[],
  json: boolean,
): Promise<TextlabCliResult> {
  let parsed: unknown;
  let manifestPath: string;
  let rootPath: string;
  try {
    const input = await readTextPackManifestInput(targetPath);
    parsed = input.parsed;
    manifestPath = input.manifestPath;
    rootPath = input.rootPath;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      exitCode: 1,
      stdout: "",
      stderr: `Failed to read textpack manifest from ${targetPath}: ${message}`,
    };
  }

  if (!isTextPackManifestV1(parsed)) {
    return {
      exitCode: 1,
      stdout: "",
      stderr: `Invalid textpack manifest: ${manifestPath}`,
    };
  }

  const operation = buildPackAuthoringOperation(subcommand, parsed, extra);
  if (typeof operation === "string") {
    return {
      exitCode: 2,
      stdout: "",
      stderr: `${operation}\n${usage()}`,
    };
  }
  const authoringOptions = parsePackAuthoringOptions(extra);
  if (typeof authoringOptions === "string") {
    return {
      exitCode: 2,
      stdout: "",
      stderr: `${authoringOptions}\n${usage()}`,
    };
  }

  const inventoryResourcePaths = await listTextPackResourceInventory(rootPath);
  const plan = planTextPackResourceTransaction({
    manifest: parsed,
    operation,
    inventoryResourcePaths,
  });
  const plannedAudit = inspectTextPackResourceAudit(plan.nextManifest, plan.expectedInventoryResourcePaths);
  if (!plan.ok) {
    const inspection: TextlabPackAuthoringInspection = {
      schemaVersion: 1,
      ok: false,
      action: plan.action,
      packRoot: rootPath,
      manifestPath,
      changedResourcePaths: plan.changedResourcePaths,
      removedResourcePaths: plan.removedResourcePaths,
      plan,
      audit: plannedAudit,
    };
    return {
      exitCode: 1,
      stdout: renderCliOutput(inspection, renderPackAuthoringInspection, json),
      stderr: "",
    };
  }

  try {
    if (operation.action === "add-resource") {
      await writeTextFileAtomic(
        resolvePackRelativePath(rootPath, operation.resource.resourcePath),
        authoringOptions.content ?? "",
      );
      await writeTextFileAtomic(manifestPath, `${JSON.stringify(plan.nextManifest, null, 2)}\n`);
    } else if (operation.action === "update-resource") {
      if (authoringOptions.content !== undefined) {
        const resourcePath = operation.update.resourcePath ?? manifestResourcePathForId(parsed, operation.resourceId);
        if (resourcePath === undefined) {
          throw new Error(`Textpack manifest resource ${operation.resourceId} was not found.`);
        }
        await writeTextFileAtomic(resolvePackRelativePath(rootPath, resourcePath), authoringOptions.content);
      }
      await writeTextFileAtomic(manifestPath, `${JSON.stringify(plan.nextManifest, null, 2)}\n`);
      for (const removedPath of plan.removedResourcePaths) {
        await rm(resolvePackRelativePath(rootPath, removedPath), { force: true });
      }
    } else {
      await writeTextFileAtomic(manifestPath, `${JSON.stringify(plan.nextManifest, null, 2)}\n`);
      for (const removedPath of plan.removedResourcePaths) {
        await rm(resolvePackRelativePath(rootPath, removedPath), { force: true });
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      exitCode: 1,
      stdout: "",
      stderr: `Failed to apply textpack resource transaction: ${message}`,
    };
  }

  const audit = inspectTextPackResourceAudit(plan.nextManifest, await listTextPackResourceInventory(rootPath));
  const inspection: TextlabPackAuthoringInspection = {
    schemaVersion: 1,
    ok: audit.ok,
    action: plan.action,
    packRoot: rootPath,
    manifestPath,
    changedResourcePaths: plan.changedResourcePaths,
    removedResourcePaths: plan.removedResourcePaths,
    plan,
    audit,
  };
  return {
    exitCode: inspection.ok ? 0 : 1,
    stdout: renderCliOutput(inspection, renderPackAuthoringInspection, json),
    stderr: "",
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

  const authoringSubcommands = new Set(["add-resource", "update-resource", "remove-resource"]);
  const subcommands = new Set(["inspect", "validate", "audit", "review", "list-resources", ...authoringSubcommands]);
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
  if (!authoringSubcommands.has(subcommand) && subcommand !== "review" && extra.length > 0) {
    return {
      exitCode: 2,
      stdout: "",
      stderr: `Too many arguments for pack ${subcommand}.\n${usage()}`,
    };
  }

  if (authoringSubcommands.has(subcommand)) {
    return runTextlabPackAuthoringCli(subcommand, targetPath, extra, json);
  }

  let parsed: unknown;
  let manifestPath: string;
  let rootPath: string;
  try {
    const input = await readTextPackManifestInput(targetPath);
    parsed = input.parsed;
    manifestPath = input.manifestPath;
    rootPath = input.rootPath;
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

  if (subcommand === "audit") {
    const inventoryResourcePaths = await listTextPackResourceInventory(rootPath);
    const inspection = inspectTextPackResourceAudit(parsed, inventoryResourcePaths);
    return {
      exitCode: inspection.ok ? 0 : 1,
      stdout: renderCliOutput(inspection, renderTextPackAuditInspection, json),
      stderr: "",
    };
  }

  if (subcommand === "review") {
    const reviewPolicy = parsePackReviewOptions(extra);
    if (typeof reviewPolicy === "string") {
      return {
        exitCode: 2,
        stdout: "",
        stderr: `${reviewPolicy}\n${usage()}`,
      };
    }
    const inventoryResourcePaths = await listTextPackResourceInventory(rootPath);
    const inspection = inspectTextPackReview(parsed, inventoryResourcePaths, reviewPolicy);
    return {
      exitCode: inspection.ok ? 0 : 1,
      stdout: renderCliOutput(inspection, renderTextPackReviewInspection, json),
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
