import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createTextPackReviewReport } from "@ismail-elkorchi/textpack";
import {
  resultEnvelopeSchemaId,
  resultEnvelopeSchemaVersion,
  textProtocolDocumentBundleSchemaId,
  textProtocolPackManifestSchemaId,
  textProtocolPayloadKindTextpipelineBatchRunReportV1,
  textProtocolSchemaVersion,
} from "@ismail-elkorchi/textprotocol";
import {
  applyTextlabInspectionSessionCommand,
  createTextlabInspectionSession,
  executeTextlabExternalTool,
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
  inspectTextPackReviewReport,
  inspectTextPackValidation,
  inspectTextPipelineBatchReport,
  inspectTextPipelineTrace,
  inspectTextProtocolResultEnvelope,
  inspectTextProtocolSchemaFamilyEnvelope,
  inspectTextConformanceBenchmarkReport,
  isTextlabInspectionSessionV1,
  isTextlabExternalToolExecutionReportV1,
  packageName,
  renderCorpusFixtureInspection,
  renderConformanceDiffInspection,
  renderConformanceReportSummary,
  renderPackageInspection,
  renderPackBackedRuleInspection,
  renderReleaseReadinessInspection,
  renderRetrievalEvaluationInspection,
  renderRetrievalQrelsInspection,
  renderTextCorpusArtifactInspection,
  renderTextdocAnnotationInspection,
  renderTextdocDocumentInspection,
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
  renderTextlabInspectionSession,
  renderTextlabExternalToolExecutionReport,
  summarizeConformanceReport,
  textlabInspectionSessionSchemaVersion,
  textlabExternalToolExecutionReportSchemaVersion,
} from "../dist/index.js";
import { runTextlabCli } from "../dist/cli.js";

async function fileExists(filePath) {
  try {
    await readFile(filePath, "utf8");
    return true;
  } catch {
    return false;
  }
}

if (packageName !== "@ismail-elkorchi/textlab") {
  throw new Error("package name should remain stable");
}

const inspectionRows = [
  { id: "alpha", status: "pass" },
  { id: "beta", status: "fail" },
  { id: "gamma", status: "pass" },
];
const inspectionSession = createTextlabInspectionSession(inspectionRows, {
  sessionId: "session:fixture",
  subjectId: "artifact:fixture",
  title: "Fixture artifact",
  pageSize: 2,
});
if (
  !isTextlabInspectionSessionV1(inspectionSession) ||
  inspectionSession.schemaVersion !== textlabInspectionSessionSchemaVersion ||
  inspectionSession.pageIndex !== 0 ||
  inspectionSession.pageCount !== 2 ||
  inspectionSession.pageRows.map((row) => row.id).join(",") !== "alpha,beta" ||
  !inspectionSession.hasNextPage ||
  !renderTextlabInspectionSession(inspectionSession).includes("Page: 1 / 2")
) {
  throw new Error("inspection session should expose the first deterministic page");
}
const nextInspectionSession = applyTextlabInspectionSessionCommand(
  inspectionSession,
  inspectionRows,
  { command: "next-page" },
);
if (
  nextInspectionSession.pageIndex !== 1 ||
  nextInspectionSession.pageRows.map((row) => row.id).join(",") !== "gamma" ||
  nextInspectionSession.commandHistory[0]?.command !== "next-page" ||
  nextInspectionSession.commandHistory[0]?.fromPageIndex !== 0 ||
  nextInspectionSession.commandHistory[0]?.toPageIndex !== 1
) {
  throw new Error("inspection session should apply next-page commands deterministically");
}
const clampedInspectionSession = applyTextlabInspectionSessionCommand(
  nextInspectionSession,
  inspectionRows,
  { command: "goto-page", pageIndex: 9 },
);
if (
  clampedInspectionSession.pageIndex !== 1 ||
  clampedInspectionSession.commandHistory[1]?.command !== "goto-page" ||
  clampedInspectionSession.commandHistory[1]?.pageIndex !== 9
) {
  throw new Error("inspection session goto-page should record requested and clamped pages");
}
let invalidSessionPageSizeRejected = false;
try {
  createTextlabInspectionSession(inspectionRows, {
    sessionId: "session:invalid",
    subjectId: "artifact:fixture",
    pageSize: 0,
  });
} catch (error) {
  invalidSessionPageSizeRejected =
    error instanceof RangeError &&
    error.message === "textlab inspection session pageSize must be a positive integer";
}
if (!invalidSessionPageSizeRejected) {
  throw new Error("inspection session should reject invalid page sizes");
}
let mismatchedSessionRowsRejected = false;
try {
  applyTextlabInspectionSessionCommand(inspectionSession, inspectionRows.slice(0, 2), { command: "next-page" });
} catch (error) {
  mismatchedSessionRowsRejected =
    error instanceof Error &&
    error.message === "textlab inspection session rows must match the session row count";
}
if (!mismatchedSessionRowsRejected) {
  throw new Error("inspection session should reject row-count mismatches");
}

const externalToolReport = await executeTextlabExternalTool({
  toolId: "fixture-node-stdout",
  command: process.execPath,
  args: ["-e", "process.stdout.write('alpha\\n'); process.stderr.write('beta\\n');"],
  maxOutputChars: 3,
  evidenceRefs: ["packages/textlab/test/index.test.mjs#external-tool"],
  limitations: ["Package test executes the current Node binary with explicit arguments."],
});
if (
  !isTextlabExternalToolExecutionReportV1(externalToolReport) ||
  externalToolReport.schemaVersion !== textlabExternalToolExecutionReportSchemaVersion ||
  externalToolReport.status !== "passed" ||
  externalToolReport.exitCode !== 0 ||
  externalToolReport.stdoutPreview !== "alp" ||
  !externalToolReport.stdoutTruncated ||
  externalToolReport.stderrPreview !== "bet" ||
  !renderTextlabExternalToolExecutionReport(externalToolReport).includes("Status: passed")
) {
  throw new Error("external tool execution should report bounded stdout and stderr previews");
}
const failedExternalToolReport = await executeTextlabExternalTool({
  toolId: "fixture-node-failure",
  command: process.execPath,
  args: ["-e", "process.stderr.write('failure\\n'); process.exit(7);"],
  evidenceRefs: ["packages/textlab/test/index.test.mjs#external-tool-failure"],
  limitations: ["Package test executes a failing command to validate report status."],
});
if (
  !isTextlabExternalToolExecutionReportV1(failedExternalToolReport) ||
  failedExternalToolReport.status !== "failed" ||
  failedExternalToolReport.exitCode !== 7 ||
  !failedExternalToolReport.stderrPreview.includes("failure")
) {
  throw new Error("external tool execution should report non-zero exit status");
}

const conformanceReport = {
  schemaId: "urn:ismail-elkorchi:textconformance:report:v1",
  schemaVersion: 1,
  reportId: "conformance:nlp-rule-backed-ner",
  subject: {
    kind: "task",
    id: "nlp-rule-backed-ner",
    schemaId: "schemas/textconformance-report-v1.schema.json",
  },
  generatedAt: "2026-05-10T00:00:00.000Z",
  summary: {
    pass: 3,
    fail: 1,
    notRun: 2,
  },
  checks: [
    { checkId: "fixture", status: "pass" },
    { checkId: "expected", status: "pass" },
    { checkId: "replay", status: "pass" },
    { checkId: "negative", status: "fail" },
    { checkId: "future-a", status: "not-run" },
    { checkId: "future-b", status: "not-run" },
  ],
};

const conformanceSummary = summarizeConformanceReport(conformanceReport);

if (
  conformanceSummary.reportId !== "conformance:nlp-rule-backed-ner" ||
  conformanceSummary.subject !== "task:nlp-rule-backed-ner" ||
  conformanceSummary.pass !== 3 ||
  conformanceSummary.fail !== 1 ||
  conformanceSummary.notRun !== 2 ||
  conformanceSummary.checkCount !== 6
) {
  throw new Error("conformance report summary should preserve report counts and subject identity");
}

if (!renderConformanceReportSummary(conformanceSummary).includes("Fail: 1")) {
  throw new Error("conformance report renderer should include failure counts");
}

let invalidReportRejected = false;
try {
  summarizeConformanceReport({ schemaVersion: 1, reportId: "bad", subject: { kind: "task", id: "x" }, checks: [] });
} catch (error) {
  invalidReportRejected = error instanceof TypeError && error.message === "conformance report is invalid";
}

if (!invalidReportRejected) {
  throw new Error("invalid conformance report should be rejected");
}

const changedConformanceReport = {
  ...conformanceReport,
  reportId: "conformance:nlp-rule-backed-ner:actual",
  summary: {
    pass: 4,
    fail: 1,
    notRun: 1,
  },
  checks: [
    { checkId: "fixture", status: "pass" },
    { checkId: "expected", status: "pass" },
    { checkId: "replay", status: "fail", message: "Replay drift detected." },
    { checkId: "negative", status: "fail" },
    { checkId: "future-a", status: "not-run" },
    { checkId: "new-check", status: "pass" },
  ],
};

const conformanceDiff = inspectConformanceReportDiff(conformanceReport, changedConformanceReport);

if (
  conformanceDiff.expectedReportId !== "conformance:nlp-rule-backed-ner" ||
  conformanceDiff.actualReportId !== "conformance:nlp-rule-backed-ner:actual" ||
  conformanceDiff.changed !== 1 ||
  conformanceDiff.added !== 1 ||
  conformanceDiff.removed !== 1 ||
  conformanceDiff.changedCheckIds.join(",") !== "future-b,new-check,replay"
) {
  throw new Error("conformance diff inspection should expose changed, added, and removed checks");
}

if (!renderConformanceDiffInspection(conformanceDiff).includes("Changed: 1")) {
  throw new Error("conformance diff renderer should include changed count");
}

const benchmarkReport = {
  schemaId: "urn:ismail-elkorchi:textconformance:benchmark-report:v1",
  schemaVersion: 1,
  benchmarkId: "benchmark:textlab-inspection",
  subject: {
    kind: "package",
    id: "@ismail-elkorchi/textlab",
    version: "0.1.0",
  },
  generatedAt: "2026-05-31T00:00:00.000Z",
  metrics: [
    {
      metricId: "throughput-docs-per-second",
      value: 42,
      unit: "docs/s",
      higherIsPreferred: true,
    },
    {
      metricId: "latency-ms",
      value: 12,
      unit: "ms",
      higherIsPreferred: false,
    },
  ],
  evidenceRefs: ["packages/textlab/test/index.test.mjs#benchmark"],
  limitations: ["Synthetic benchmark report fixture; it is not a conformance result."],
  notes: ["Used to verify textlab benchmark report inspection only."],
};
const benchmarkInspection = inspectTextConformanceBenchmarkReport(benchmarkReport);
if (
  benchmarkInspection.benchmarkId !== "benchmark:textlab-inspection" ||
  benchmarkInspection.subject !== "package:@ismail-elkorchi/textlab" ||
  benchmarkInspection.metricCount !== 2 ||
  benchmarkInspection.metrics[0]?.metricId !== "latency-ms" ||
  benchmarkInspection.metrics[0]?.preference !== "lower" ||
  benchmarkInspection.metrics[1]?.preference !== "higher"
) {
  throw new Error("benchmark report inspection should expose deterministic metric rows");
}
if (
  !renderTextConformanceBenchmarkReportInspection(benchmarkInspection).includes(
    "preference=lower",
  )
) {
  throw new Error("benchmark report renderer should include metric preference");
}
let invalidBenchmarkRejected = false;
try {
  inspectTextConformanceBenchmarkReport(conformanceReport);
} catch (error) {
  invalidBenchmarkRejected = error instanceof TypeError && error.message === "benchmark report is invalid";
}
if (!invalidBenchmarkRejected) {
  throw new Error("benchmark report inspection should reject conformance reports");
}

const packageManifest = {
  name: "@ismail-elkorchi/textlab",
  version: "0.1.0",
  type: "module",
  exports: {
    ".": { types: "./dist/index.d.ts", import: "./dist/index.js" },
    "./cli": { types: "./dist/cli.d.ts", import: "./dist/cli.js" },
  },
  bin: { textlab: "./dist/cli.js" },
  files: ["dist", "README.md", "CHANGELOG.md"],
  scripts: { build: "tsc -p tsconfig.build.json" },
  dependencies: { "@ismail-elkorchi/textdoc": "0.1.0" },
};

const packageInspection = inspectPackageManifest(packageManifest);

if (
  packageInspection.name !== "@ismail-elkorchi/textlab" ||
  packageInspection.exportPaths.join(",") !== ".,./cli" ||
  packageInspection.dependencyNames.join(",") !== "@ismail-elkorchi/textdoc"
) {
  throw new Error("package inspection should summarize exported package surfaces");
}

if (!renderPackageInspection(packageInspection).includes("Exports: 2")) {
  throw new Error("package renderer should include export counts");
}

const packManifest = {
  manifestVersion: "1.0.0",
  id: "textpack-reference-smoke",
  packageName: "@ismail-elkorchi/textpack-reference-smoke",
  version: "0.1.0",
  kind: ["language"],
  targets: {
    languages: ["en"],
    scripts: ["Latn"],
    profiles: ["uax29-default"],
    domains: ["smoke"],
  },
  engines: { textpack: "^0.1.0" },
  externalData: {},
  capabilities: { lexicons: true, stopwords: true },
  resources: {
    lexicons: ["resources/lexicon.tsv"],
    stopwords: ["resources/stopwords.tsv"],
  },
  provides: {
    lexicons: ["lexicon:smoke"],
    stopwords: ["stopwords:smoke"],
  },
  entrypoints: { manifest: "textpack.manifest.json", load: "dist/index.js" },
  licenses: { code: ["MIT"], data: ["CC0-1.0"] },
  provenance: { sources: ["fixture:pack-smoke"], generated: false },
  tests: { smoke: ["tests/smoke.json"], negative: ["tests/negative.json"], representative: ["tests/representative.json"] },
  reviewState: "experimental",
  composition: { overlayPrecedence: 10 },
  limitations: ["Fixture-scale pack only."],
};

const packInspection = inspectTextPackManifest(packManifest);

if (
  packInspection.id !== "textpack-reference-smoke" ||
  packInspection.resourceFamilies.map((entry) => `${entry.id}:${entry.count}`).join(",") !== "lexicons:1,stopwords:1" ||
  packInspection.provenanceSourceCount !== 1
) {
  throw new Error("textpack manifest inspection should summarize resources and provenance");
}

if (!renderTextPackInspection(packInspection).includes("Review state: experimental")) {
  throw new Error("textpack renderer should include review state");
}

const packValidationInspection = inspectTextPackValidation(packManifest);
if (!packValidationInspection.ok || packValidationInspection.diagnosticCount !== 0) {
  throw new Error("textpack validation inspection should accept valid pack metadata");
}

if (!renderTextPackValidationInspection(packValidationInspection).includes("Status: valid")) {
  throw new Error("textpack validation renderer should include validation status");
}

const invalidPackValidationInspection = inspectTextPackValidation({
  ...packManifest,
  licenses: {
    code: [],
    data: [],
  },
});
if (
  invalidPackValidationInspection.ok ||
  !invalidPackValidationInspection.diagnostics.some((entry) => entry.code === "missing-license")
) {
  throw new Error("textpack validation inspection should expose missing license diagnostics");
}

const packResourceList = inspectTextPackResourceList(packManifest);
if (
  packResourceList.resourceCount !== 2 ||
  packResourceList.resources.map((entry) => entry.resourceId).join(",") !== "lexicon:smoke,stopwords:smoke"
) {
  throw new Error("textpack resource list inspection should expose deterministic resource rows");
}

if (!renderTextPackResourceListInspection(packResourceList).includes("Resources: 2")) {
  throw new Error("textpack resource list renderer should include resource count");
}

const packAudit = inspectTextPackResourceAudit(packManifest, [
  "resources/lexicon.tsv",
  "resources/stopwords.tsv",
]);
if (
  !packAudit.ok ||
  !packAudit.manifestValid ||
  packAudit.declaredResourceCount !== 2 ||
  packAudit.inventoryResourceCount !== 2 ||
  packAudit.resourceFamilies.map((entry) => `${entry.id}:${entry.count}`).join(",") !== "lexicons:1,stopwords:1"
) {
  throw new Error("textpack audit inspection should accept matching manifest and resource inventory");
}

if (!renderTextPackAuditInspection(packAudit).includes("Status: valid")) {
  throw new Error("textpack audit renderer should include status");
}

const missingPackAudit = inspectTextPackResourceAudit(packManifest, ["resources/lexicon.tsv"]);
if (
  missingPackAudit.ok ||
  missingPackAudit.missingResourceCount !== 1 ||
  missingPackAudit.diagnostics[0]?.code !== "missing-resource-file"
) {
  throw new Error("textpack audit inspection should report missing declared resources");
}

const orphanPackAudit = inspectTextPackResourceAudit(packManifest, [
  "resources/lexicon.tsv",
  "resources/orphan.tsv",
  "resources/stopwords.tsv",
]);
if (
  orphanPackAudit.ok ||
  orphanPackAudit.orphanResourceCount !== 1 ||
  !orphanPackAudit.diagnostics.some((entry) => entry.code === "orphan-resource-file" && entry.path === "resources/orphan.tsv")
) {
  throw new Error("textpack audit inspection should report orphan resource files");
}

const duplicatePackAudit = inspectTextPackResourceAudit(
  {
    ...packManifest,
    provides: {
      ...packManifest.provides,
      stopwords: ["lexicon:smoke"],
    },
  },
  ["resources/lexicon.tsv", "resources/stopwords.tsv"],
);
if (
  duplicatePackAudit.ok ||
  duplicatePackAudit.duplicateProvidedIdCount !== 1 ||
  !duplicatePackAudit.diagnostics.some((entry) => entry.code === "duplicate-provides-id")
) {
  throw new Error("textpack audit inspection should report duplicate provided ids");
}

const packReview = inspectTextPackReview(
  {
    ...packManifest,
    reviewState: "candidate",
  },
  ["resources/lexicon.tsv", "resources/stopwords.tsv"],
  {
    targetReviewState: "candidate",
    packageVersions: { textpack: "0.1.0" },
    mandatoryResources: ["lexicon:smoke", "stopwords:smoke"],
    requireCompatibility: true,
  },
);
if (
  !packReview.ok ||
  packReview.decision !== "accepted" ||
  packReview.transition !== "retain" ||
  packReview.resourceInventoryOk !== true ||
  packReview.compatibilityOk !== true ||
  packReview.failedRequirementCount !== 0
) {
  throw new Error("textpack review inspection should accept a vetted candidate pack");
}

if (!renderTextPackReviewInspection(packReview).includes("Decision: accepted")) {
  throw new Error("textpack review renderer should include review decision");
}

const rawPackReviewReport = createTextPackReviewReport(packManifest, {
  targetReviewState: "candidate",
  inventoryResourcePaths: ["resources/lexicon.tsv", "resources/stopwords.tsv"],
  requiredEvidence: ["reviewer"],
});
const blockedPackReview = inspectTextPackReviewReport(rawPackReviewReport);
if (
  blockedPackReview.ok ||
  blockedPackReview.transition !== "promote" ||
  !blockedPackReview.diagnostics.some((entry) => entry.code === "missing-reviewer-evidence")
) {
  throw new Error("textpack review report inspection should expose required evidence failures");
}

let invalidPackReviewReportRejected = false;
try {
  inspectTextPackReviewReport({ schemaVersion: 1 });
} catch (error) {
  invalidPackReviewReportRejected = error instanceof TypeError && error.message === "textpack review report is invalid";
}
if (!invalidPackReviewReportRejected) {
  throw new Error("textpack review report inspection should reject invalid report payloads");
}

const stalePairPackAudit = inspectTextPackResourceAudit(
  {
    ...packManifest,
    resources: {
      ...packManifest.resources,
      stopwords: ["resources/stopwords.tsv", "resources/stale.tsv"],
    },
  },
  ["resources/lexicon.tsv", "resources/orphan.tsv"],
);
if (
  stalePairPackAudit.stalePairCount !== 1 ||
  stalePairPackAudit.diagnostics.map((entry) => `${entry.code}:${entry.path ?? entry.ref ?? ""}`).join(",") !==
    "missing-resource-file:resources/stale.tsv,missing-resource-file:resources/stopwords.tsv,orphan-resource-file:resources/orphan.tsv,resource-provides-length-mismatch:stopwords"
) {
  throw new Error("textpack audit inspection should return deterministic stale-pair diagnostics");
}

const textdocDocument = {
  schemaVersion: 1,
  documentId: "doc:inspection",
  revision: "1",
  textLengthCU: 18,
  text: "Alice knows Alice.",
  units: { text: "utf16-code-unit" },
  views: [{ id: "analysis", kind: "raw" }],
  layers: [
    {
      id: "layer-token",
      kind: "token",
      viewId: "analysis",
      annotations: [
        {
          id: "token-1",
          kind: "token",
          lifecycle: { state: "active" },
          targets: [{ kind: "span", viewId: "analysis", startCU: 0, endCU: 5 }],
          tokenKind: "lexical-token",
          text: "Alice",
        },
        {
          id: "token-2",
          kind: "token",
          lifecycle: { state: "active" },
          targets: [{ kind: "span", viewId: "analysis", startCU: 6, endCU: 11 }],
          tokenKind: "lexical-token",
          text: "knows",
        },
      ],
    },
    {
      id: "layer-entity",
      kind: "entity",
      viewId: "analysis",
      annotations: [
        {
          id: "ent-1",
          kind: "entity",
          lifecycle: { state: "active" },
          targets: [{ kind: "span", viewId: "analysis", startCU: 0, endCU: 5 }],
          label: "PER",
        },
        {
          id: "ent-2",
          kind: "entity",
          lifecycle: { state: "active" },
          targets: [{ kind: "span", viewId: "analysis", startCU: 12, endCU: 17 }],
          label: "PER",
        },
      ],
    },
    {
      id: "layer-relation",
      kind: "relation",
      viewId: "analysis",
      annotations: [
        {
          id: "rel-1",
          kind: "relation",
          lifecycle: { state: "active" },
          targets: [{ kind: "annotation", annotationId: "ent-1" }],
          relationType: "knows",
          arguments: [
            { role: "subject", annotationId: "ent-1" },
            { role: "object", annotationId: "ent-2" },
          ],
        },
      ],
    },
    {
      id: "layer-coreference-mention",
      kind: "coreference-mention",
      viewId: "analysis",
      annotations: [
        {
          id: "mention-1",
          kind: "coreference-mention",
          lifecycle: { state: "active" },
          targets: [{ kind: "annotation", annotationId: "ent-1" }],
          mentionType: "proper-name",
        },
        {
          id: "mention-2",
          kind: "coreference-mention",
          lifecycle: { state: "active" },
          targets: [{ kind: "annotation", annotationId: "ent-2" }],
          mentionType: "proper-name",
        },
      ],
    },
    {
      id: "layer-coreference-chain",
      kind: "coreference-chain",
      viewId: "analysis",
      annotations: [
        {
          id: "chain-1",
          kind: "coreference-chain",
          lifecycle: { state: "active" },
          targets: [{ kind: "annotation", annotationId: "mention-1" }],
          mentionIds: ["mention-1", "mention-2"],
          representativeMentionId: "mention-1",
        },
      ],
    },
    {
      id: "layer-dependency-node",
      kind: "dependency-node",
      viewId: "analysis",
      annotations: [
        {
          id: "node-1",
          kind: "dependency-node",
          lifecycle: { state: "active" },
          targets: [{ kind: "annotation", annotationId: "token-2" }],
          nodeKind: "word",
          sentenceId: "sent-1",
          sourceOrder: 1,
          fields: {
            id: "1",
            form: "knows",
            lemma: "know",
            upos: "VERB",
            xpos: "_",
            feats: "_",
            head: "0",
            deprel: "root",
            deps: "_",
            misc: "_",
          },
        },
      ],
    },
    {
      id: "layer-dependency",
      kind: "dependency",
      viewId: "analysis",
      annotations: [
        {
          id: "dep-1",
          kind: "dependency",
          lifecycle: { state: "active" },
          targets: [{ kind: "annotation", annotationId: "node-1" }],
          dependentNodeId: "node-1",
          headNodeId: null,
          relation: "root",
          source: {
            sentenceId: "sent-1",
            conlluId: "1",
            conlluHead: "0",
            conlluDeprel: "root",
            conlluDeps: "_",
          },
        },
      ],
    },
  ],
};

const annotationInspection = inspectTextdocAnnotations(textdocDocument, {
  layerKinds: ["relation", "coreference-chain", "dependency"],
});

if (
  annotationInspection.documentId !== "doc:inspection" ||
  annotationInspection.layerCount !== 7 ||
  annotationInspection.annotationCount !== 10 ||
  annotationInspection.rows.map((row) => row.annotationId).join(",") !== "chain-1,dep-1,rel-1" ||
  annotationInspection.graphEdgeCount !== 5
) {
  throw new Error("textdoc annotation inspection should count and query graph annotations deterministically");
}

if (!renderTextdocAnnotationInspection(annotationInspection).includes("relation:rel-1")) {
  throw new Error("textdoc annotation renderer should include queried relation rows");
}

const documentInspection = inspectTextdocDocument(textdocDocument);

if (
  documentInspection.documentId !== "doc:inspection" ||
  documentInspection.viewCount !== 1 ||
  documentInspection.layerCount !== 7 ||
  documentInspection.annotationCount !== 10
) {
  throw new Error("textdoc document inspection should summarize views, layers, and annotations");
}

if (!renderTextdocDocumentInspection(documentInspection).includes("Annotations: 10")) {
  throw new Error("textdoc document renderer should include annotation counts");
}

let invalidDocumentRejected = false;
try {
  inspectTextdocAnnotations({ schemaVersion: 1, documentId: "bad", layers: [{ id: "", annotations: [] }] });
} catch (error) {
  invalidDocumentRejected = error instanceof TypeError && error.message === "textdoc document is invalid";
}

if (!invalidDocumentRejected) {
  throw new Error("invalid textdoc documents should be rejected before inspection");
}

const pipelineTrace = {
  schemaVersion: 1,
  documentId: "doc:inspection",
  finalRevision: "1>textrules.textpack-rules",
  executionMode: "sync",
  runStatus: "complete",
  processorOrder: ["textrules.textpack-rules"],
  contextFingerprint: "fnv1a32:pipeline-inspection",
  cachePolicy: "none",
  entries: [
    {
      processorId: "textrules.textpack-rules",
      version: "0.1.0",
      status: "applied",
      emittedViews: [],
      emittedLayers: ["textrules:textpack-rule-outputs"],
      inputRevision: "1",
      outputRevision: "1>textrules.textpack-rules",
    },
  ],
};

const pipelineTraceInspection = inspectTextPipelineTrace(pipelineTrace);
if (
  pipelineTraceInspection.documentId !== "doc:inspection" ||
  pipelineTraceInspection.processorCount !== 1 ||
  pipelineTraceInspection.emittedLayerCount !== 1 ||
  pipelineTraceInspection.rows.map((row) => `${row.processorId}:${row.status}`).join(",") !==
    "textrules.textpack-rules:applied"
) {
  throw new Error("pipeline trace inspection should summarize deterministic processor trace output");
}

if (!renderTextPipelineTraceInspection(pipelineTraceInspection).includes("Run status: complete")) {
  throw new Error("pipeline trace renderer should include run status");
}

let invalidPipelineTraceRejected = false;
try {
  inspectTextPipelineTrace({ schemaVersion: 1, entries: [] });
} catch (error) {
  invalidPipelineTraceRejected = error instanceof TypeError && error.message === "textpipeline trace is invalid";
}

if (!invalidPipelineTraceRejected) {
  throw new Error("invalid textpipeline traces should be rejected before inspection");
}

const pipelineBatchReport = {
  schemaVersion: 1,
  documentCount: 2,
  completeCount: 1,
  partialCount: 1,
  executionModes: ["async", "sync"],
  cachePolicies: ["none", "read-through"],
  contextFingerprints: ["fnv1a32:batch-a", "fnv1a32:batch-b"],
  items: [
    {
      inputIndex: 0,
      documentId: "doc:inspection:batch:complete",
      finalRevision: "1>normalize>annotate",
      runStatus: "complete",
      executionMode: "sync",
      cachePolicy: "none",
      processorOrder: ["annotate", "normalize"],
      traceEntryCount: 2,
    },
    {
      inputIndex: 1,
      documentId: "doc:inspection:batch:partial",
      finalRevision: "1>failing",
      runStatus: "partial",
      executionMode: "async",
      cachePolicy: "read-through",
      processorOrder: ["blocked", "failing"],
      traceEntryCount: 2,
    },
  ],
};

const pipelineBatchReportInspection = inspectTextPipelineBatchReport(pipelineBatchReport);
if (
  pipelineBatchReportInspection.documentCount !== 2 ||
  pipelineBatchReportInspection.completeCount !== 1 ||
  pipelineBatchReportInspection.partialCount !== 1 ||
  pipelineBatchReportInspection.contextFingerprintCount !== 2 ||
  pipelineBatchReportInspection.processorIds.join(",") !== "annotate,blocked,failing,normalize" ||
  pipelineBatchReportInspection.rows.map((row) => `${row.inputIndex}:${row.runStatus}:${row.traceEntryCount}`).join(",") !==
    "0:complete:2,1:partial:2"
) {
  throw new Error("pipeline batch report inspection should summarize deterministic batch execution output");
}

if (!renderTextPipelineBatchReportInspection(pipelineBatchReportInspection).includes("Partial: 1")) {
  throw new Error("pipeline batch report renderer should include partial count");
}

let invalidPipelineBatchReportRejected = false;
try {
  inspectTextPipelineBatchReport({ schemaVersion: 1, items: [] });
} catch (error) {
  invalidPipelineBatchReportRejected =
    error instanceof TypeError && error.message === "textpipeline batch report is invalid";
}

if (!invalidPipelineBatchReportRejected) {
  throw new Error("invalid textpipeline batch reports should be rejected before inspection");
}

const resultEnvelope = {
  schemaId: resultEnvelopeSchemaId,
  schemaVersion: resultEnvelopeSchemaVersion,
  producer: {
    package: "@ismail-elkorchi/textpipeline",
    version: "0.1.0",
  },
  payloadKind: textProtocolPayloadKindTextpipelineBatchRunReportV1,
  payload: pipelineBatchReport,
  provenance: {
    references: [{ kind: "fixture", id: "textlab-result-envelope" }],
  },
  diagnostics: [
    {
      code: "textlab.fixture",
      severity: "info",
      message: "result envelope fixture",
    },
  ],
  scopeBoundary: "Textlab result-envelope inspection fixture.",
  limitations: ["The fixture validates envelope inspection, not broad payload behavior."],
};

const resultEnvelopeInspection = inspectTextProtocolResultEnvelope(resultEnvelope);
if (
  resultEnvelopeInspection.payloadKind !== textProtocolPayloadKindTextpipelineBatchRunReportV1 ||
  !resultEnvelopeInspection.registeredPayloadKind ||
  resultEnvelopeInspection.payloadOwnerPackage !== "@ismail-elkorchi/textpipeline" ||
  resultEnvelopeInspection.provenanceReferenceCount !== 1 ||
  resultEnvelopeInspection.diagnosticCount !== 1 ||
  !resultEnvelopeInspection.compatibilityOk
) {
  throw new Error("result-envelope inspection should summarize registered envelope metadata");
}

if (!renderTextProtocolResultEnvelopeInspection(resultEnvelopeInspection).includes("Compatibility: pass")) {
  throw new Error("result-envelope renderer should include compatibility state");
}

let invalidResultEnvelopeRejected = false;
try {
  inspectTextProtocolResultEnvelope({ schemaVersion: 1, payloadKind: "bad" });
} catch (error) {
  invalidResultEnvelopeRejected =
    error instanceof TypeError && error.message === "textprotocol result envelope is invalid";
}

if (!invalidResultEnvelopeRejected) {
  throw new Error("invalid textprotocol result envelopes should be rejected before inspection");
}

const schemaFamilyEnvelope = {
  schemaId: textProtocolDocumentBundleSchemaId,
  schemaVersion: textProtocolSchemaVersion,
  producer: {
    package: "@ismail-elkorchi/textdoc",
    version: "0.1.0",
  },
  payload: {
    documents: [
      {
        documentId: textdocDocument.documentId,
        revision: textdocDocument.revision,
        document: textdocDocument,
      },
    ],
  },
  provenance: {
    references: [{ kind: "fixture", id: "textlab-schema-family-envelope" }],
  },
  diagnostics: [
    {
      code: "textlab.schema-family.fixture",
      severity: "info",
      message: "schema family envelope fixture",
    },
  ],
  limitations: ["The fixture validates schema-family envelope inspection."],
  extensions: {
    fixture: true,
  },
};

const schemaFamilyEnvelopeInspection = inspectTextProtocolSchemaFamilyEnvelope(schemaFamilyEnvelope);
if (
  schemaFamilyEnvelopeInspection.family !== "document-bundle" ||
  !schemaFamilyEnvelopeInspection.registeredSchemaFamily ||
  schemaFamilyEnvelopeInspection.ownerPackage !== "@ismail-elkorchi/textprotocol" ||
  schemaFamilyEnvelopeInspection.schemaPath !== "schemas/textprotocol-document-bundle-v1.schema.json" ||
  schemaFamilyEnvelopeInspection.producerPackage !== "@ismail-elkorchi/textdoc" ||
  schemaFamilyEnvelopeInspection.payloadShape !== "object:documents" ||
  schemaFamilyEnvelopeInspection.payloadKeys.join(",") !== "documents" ||
  schemaFamilyEnvelopeInspection.provenanceReferenceCount !== 1 ||
  schemaFamilyEnvelopeInspection.diagnosticCount !== 1 ||
  schemaFamilyEnvelopeInspection.limitationCount !== 1 ||
  schemaFamilyEnvelopeInspection.extensionKeyCount !== 1 ||
  !schemaFamilyEnvelopeInspection.compatibilityOk
) {
  throw new Error("schema-family envelope inspection should summarize registered protocol metadata");
}

if (!renderTextProtocolSchemaFamilyEnvelopeInspection(schemaFamilyEnvelopeInspection).includes("Family: document-bundle")) {
  throw new Error("schema-family envelope renderer should include family metadata");
}

const packManifestEnvelope = {
  schemaId: textProtocolPackManifestSchemaId,
  schemaVersion: textProtocolSchemaVersion,
  producer: {
    package: "@ismail-elkorchi/textpack",
    version: "0.1.0",
  },
  payload: {
    manifestVersion: "1.0.0",
    id: "pack:textlab-schema-family",
  },
  provenance: {
    references: [{ kind: "fixture", id: "textlab-pack-manifest-schema-family" }],
  },
  limitations: ["The fixture validates externally owned schema-family inspection."],
};
const packManifestEnvelopeInspection = inspectTextProtocolSchemaFamilyEnvelope(packManifestEnvelope, {
  expectedFamily: "pack-manifest",
  expectedProducerPackage: "@ismail-elkorchi/textpack",
  requireProvenance: true,
  requireLimitations: true,
  externallyValidatedFamilies: ["pack-manifest"],
});
if (
  packManifestEnvelopeInspection.family !== "pack-manifest" ||
  packManifestEnvelopeInspection.ownerPackage !== "@ismail-elkorchi/textpack" ||
  packManifestEnvelopeInspection.schemaPath !== "schemas/textpack-manifest-v1.schema.json" ||
  !packManifestEnvelopeInspection.compatibilityOk ||
  !packManifestEnvelopeInspection.compatibilityDiagnosticCounts.some(
    (entry) => entry.id === "textprotocol.schema-family-external-validation" && entry.count === 1,
  )
) {
  throw new Error("schema-family envelope inspection should accept externally validated pack manifests");
}

let invalidSchemaFamilyEnvelopeRejected = false;
try {
  inspectTextProtocolSchemaFamilyEnvelope({
    schemaId: textProtocolDocumentBundleSchemaId,
    schemaVersion: textProtocolSchemaVersion,
    payload: {},
  });
} catch (error) {
  invalidSchemaFamilyEnvelopeRejected =
    error instanceof TypeError && error.message === "textprotocol schema-family envelope is invalid";
}

if (!invalidSchemaFamilyEnvelopeRejected) {
  throw new Error("invalid textprotocol schema-family envelopes should be rejected before inspection");
}

const packBackedRuleDocument = {
  ...textdocDocument,
  revision: "1>textrules.textpack-rules",
  layers: [
    ...textdocDocument.layers,
    {
      id: "textrules:textpack-rule-outputs",
      kind: "extension",
      viewId: "analysis",
      annotations: [
        {
          id: "textrules:textpack:lexicon:match-1",
          kind: "extension",
          extensionId: "textrules:textpack-lexicon",
          lifecycle: { state: "active" },
          targets: [{ kind: "span", viewId: "analysis", startCU: 0, endCU: 5 }],
          confidence: { value: 1, method: "textrules.textpack.exact-match.v1" },
          provenance: {
            references: [
              { kind: "textpack-pack", id: "pack:en-core" },
              { kind: "textpack-resource", id: "pack:en-core#lexicon-en-core" },
              { kind: "textpack-entry", id: "pack:en-core#lexicon-en-core:3" },
              { kind: "textrules-rule", id: "textpack:lexicon:lexicon-en-core:3" },
            ],
          },
          data: {
            kind: "lexicon",
            packId: "pack:en-core",
            resourceId: "lexicon-en-core",
            ruleId: "textpack:lexicon:lexicon-en-core:3",
            line: 3,
            value: "Alice",
            matchedText: "Alice",
            tokenIds: ["token-1"],
            lookupKey: "Alice",
            resourceKind: "lexicon",
            resourceFamily: "lexicons",
            attributes: { pos: "PROPN" },
          },
        },
        {
          id: "textrules:textpack:stopword:match-2",
          kind: "extension",
          extensionId: "textrules:textpack-stopword",
          lifecycle: { state: "active" },
          targets: [{ kind: "span", viewId: "analysis", startCU: 6, endCU: 11 }],
          confidence: { value: 1, method: "textrules.textpack.exact-match.v1" },
          provenance: {
            references: [
              { kind: "textpack-pack", id: "pack:en-core" },
              { kind: "textpack-resource", id: "pack:en-core#stopwords-en-core" },
              { kind: "textpack-entry", id: "pack:en-core#stopwords-en-core:5" },
              { kind: "textrules-rule", id: "textpack:stopword:stopwords-en-core:5" },
            ],
          },
          data: {
            kind: "stopword",
            packId: "pack:en-core",
            resourceId: "stopwords-en-core",
            ruleId: "textpack:stopword:stopwords-en-core:5",
            line: 5,
            value: "knows",
            matchedText: "knows",
            tokenIds: ["token-2"],
            lookupKey: "knows",
            resourceKind: "stopwords",
            resourceFamily: "stopwords",
            attributes: {},
          },
        },
      ],
    },
  ],
};

const packBackedRuleInspection = inspectPackBackedRuleAnnotations(packBackedRuleDocument);
if (
  packBackedRuleInspection.sourcePackage !== "@ismail-elkorchi/textrules" ||
  packBackedRuleInspection.ruleAnnotationCount !== 2 ||
  packBackedRuleInspection.rows.map((row) => `${row.ruleKind}:${row.resourceId}:${row.line}`).join(",") !==
    "lexicon:lexicon-en-core:3,stopword:stopwords-en-core:5"
) {
  throw new Error("pack-backed rule inspection should summarize textrules annotations deterministically");
}

const filteredPackBackedRuleInspection = inspectPackBackedRuleAnnotations(packBackedRuleDocument, {
  resourceIds: ["stopwords-en-core"],
  ruleKinds: ["stopword"],
});
if (
  filteredPackBackedRuleInspection.filteredAnnotationCount !== 1 ||
  filteredPackBackedRuleInspection.rows[0]?.annotationId !== "textrules:textpack:stopword:match-2"
) {
  throw new Error("pack-backed rule inspection should support deterministic resource and kind filtering");
}

if (!renderPackBackedRuleInspection(packBackedRuleInspection).includes("resource=lexicon-en-core")) {
  throw new Error("pack-backed rule renderer should include resource identifiers");
}


const corpusFixture = {
  schemaVersion: 1,
  corpusId: "corpus-smoke",
  formulaSet: ["tf.raw-count", "bm25.okapi.k1-1.5.b-0.75"],
  documentOrder: ["doc-a", "doc-empty"],
  termOrder: ["alpha", "beta"],
  tolerance: 1e-12,
  documents: [
    { id: "doc-a", length: 2, tf: [{ term: "alpha", value: 1 }], tfidf: [] },
    { id: "doc-empty", length: 0, tf: [], tfidf: [] },
  ],
  queries: [
    {
      id: "alpha",
      bm25: [
        { docId: "doc-a", score: 0.5 },
        { docId: "doc-empty", score: 0 },
      ],
    },
  ],
};

const corpusInspection = inspectCorpusFixture(corpusFixture);

if (
  corpusInspection.corpusId !== "corpus-smoke" ||
  corpusInspection.documentCount !== 2 ||
  corpusInspection.emptyDocumentCount !== 1 ||
  corpusInspection.termCount !== 2 ||
  corpusInspection.queryCount !== 1 ||
  corpusInspection.scoredHitCount !== 1
) {
  throw new Error("corpus fixture inspection should count documents, terms, queries, and scored hits");
}

if (!renderCorpusFixtureInspection(corpusInspection).includes("Empty documents: 1")) {
  throw new Error("corpus fixture renderer should include empty-document count");
}

const corpusSelection = {
  schemaVersion: 1,
  corpusId: "corpus-artifact-smoke",
  tokenSource: "explicit-textdoc-token-layer",
  units: "utf16-code-unit",
  documentOrder: ["doc-a", "doc-b"],
  tokenCount: 4,
  documents: [
    {
      id: "doc-a",
      documentId: "doc:a",
      revision: "r1",
      viewId: "source",
      tokenLayerId: "tokens",
      tokenCount: 2,
    },
    {
      id: "doc-b",
      documentId: "doc:b",
      revision: "r1",
      viewId: "source",
      tokenLayerId: "tokens",
      tokenCount: 2,
    },
  ],
};
const corpusArtifact = {
  schemaVersion: 1,
  corpusId: "corpus-artifact-smoke",
  tokenSource: "explicit-textdoc-token-layer",
  evidenceClass: "E2",
  selection: corpusSelection,
  rows: [
    {
      term: "alpha",
      count: 2,
      documentFrequency: 2,
      relativeFrequency: 0.5,
    },
    {
      term: "beta",
      count: 1,
      documentFrequency: 1,
      relativeFrequency: 0.25,
    },
    {
      term: "delta",
      count: 1,
      documentFrequency: 1,
      relativeFrequency: 0.25,
    },
    {
      term: "gamma",
      count: 1,
      documentFrequency: 1,
      relativeFrequency: 0.25,
    },
  ],
};
const corpusArtifactInspection = inspectTextCorpusArtifact(corpusArtifact);
if (
  corpusArtifactInspection.artifactKind !== "frequency" ||
  corpusArtifactInspection.documentCount !== 2 ||
  corpusArtifactInspection.tokenCount !== 4 ||
  corpusArtifactInspection.rowCount !== 4 ||
  corpusArtifactInspection.pageOffset !== 0 ||
  corpusArtifactInspection.pageLimit !== 20 ||
  corpusArtifactInspection.pageRowCount !== 4 ||
  corpusArtifactInspection.hasNextPage !== false ||
  corpusArtifactInspection.evidenceClass !== "E2"
) {
  throw new Error("textcorpus artifact inspection should summarize frequency artifacts");
}
if (!renderTextCorpusArtifactInspection(corpusArtifactInspection).includes("Kind: frequency")) {
  throw new Error("textcorpus artifact renderer should include artifact kind");
}
const pagedCorpusArtifactInspection = inspectTextCorpusArtifact(corpusArtifact, { offset: 1, limit: 2 });
if (
  pagedCorpusArtifactInspection.rowCount !== 4 ||
  pagedCorpusArtifactInspection.pageOffset !== 1 ||
  pagedCorpusArtifactInspection.pageLimit !== 2 ||
  pagedCorpusArtifactInspection.pageRowCount !== 2 ||
  pagedCorpusArtifactInspection.pageEnd !== 3 ||
  pagedCorpusArtifactInspection.hasNextPage !== true ||
  pagedCorpusArtifactInspection.pageRows[0]?.term !== "beta" ||
  pagedCorpusArtifactInspection.pageRows[1]?.term !== "delta"
) {
  throw new Error("textcorpus artifact inspection should expose deterministic page windows");
}
if (!renderTextCorpusArtifactInspection(pagedCorpusArtifactInspection).includes("Page rows: 2")) {
  throw new Error("textcorpus artifact renderer should include page metadata");
}
const emptyCorpusArtifactPage = inspectTextCorpusArtifact(corpusArtifact, { offset: 10, limit: 2 });
if (
  emptyCorpusArtifactPage.pageRowCount !== 0 ||
  emptyCorpusArtifactPage.pageEnd !== 10 ||
  emptyCorpusArtifactPage.hasNextPage !== false
) {
  throw new Error("textcorpus artifact inspection should expose empty out-of-range pages");
}
let invalidCorpusArtifactPageRejected = false;
try {
  inspectTextCorpusArtifact(corpusArtifact, { offset: -1 });
} catch (error) {
  invalidCorpusArtifactPageRejected =
    error instanceof TypeError && error.message === "textcorpus artifact offset must be a non-negative integer";
}
if (!invalidCorpusArtifactPageRejected) {
  throw new Error("textcorpus artifact inspection should reject invalid page options");
}
const corpusMetricPayload = {
  corpusId: "corpus-artifact-smoke",
  metricSetId: "metrics:corpus-artifact-smoke",
  metrics: [
    {
      metricId: "frequency.term-count",
      kind: "frequency",
      value: 2,
      unit: "terms",
    },
  ],
};
const corpusMetricInspection = inspectTextCorpusArtifact(corpusMetricPayload);
if (
  corpusMetricInspection.artifactKind !== "metric-envelope-payload" ||
  corpusMetricInspection.metricSetId !== "metrics:corpus-artifact-smoke" ||
  corpusMetricInspection.metricCount !== 1
) {
  throw new Error("textcorpus artifact inspection should summarize metric-envelope payloads");
}
const corpusRetrievalIndexStorageRef = {
  schemaVersion: 1,
  artifactType: "textcorpus-retrieval-index-storage-ref-v1",
  key: "file://indexes/corpus-artifact-smoke/bm25.json",
  checksum: {
    algorithm: "fnv1a64-utf8",
    value: "0000000000000001",
  },
  byteLength: 2048,
  corpusId: "corpus-artifact-smoke",
  tokenSource: "explicit-textdoc-token-layer",
  evidenceClass: "E2",
  formula: "bm25.okapi.k1-1.5.b-0.75",
  documentCount: 2,
  termCount: 3,
  fieldCount: 0,
};
const corpusStorageRefInspection = inspectTextCorpusArtifact(corpusRetrievalIndexStorageRef);
if (
  corpusStorageRefInspection.artifactKind !== "retrieval-index-storage-ref" ||
  corpusStorageRefInspection.storageKey !== "file://indexes/corpus-artifact-smoke/bm25.json" ||
  corpusStorageRefInspection.byteLength !== 2048 ||
  corpusStorageRefInspection.checksum !== "0000000000000001" ||
  corpusStorageRefInspection.documentCount !== 2 ||
  corpusStorageRefInspection.formulaIds.join(",") !== "bm25.okapi.k1-1.5.b-0.75"
) {
  throw new Error("textcorpus artifact inspection should summarize retrieval-index storage refs");
}
if (!renderTextCorpusArtifactInspection(corpusStorageRefInspection).includes("Storage key: file://indexes/corpus-artifact-smoke/bm25.json")) {
  throw new Error("textcorpus artifact renderer should include storage-ref key");
}
const corpusRetrievalCalibrationReport = {
  schemaVersion: 1,
  taskId: "nlp-retrieval",
  reportId: "calibration:corpus-artifact-smoke",
  corpusId: "corpus-artifact-smoke",
  evidenceClass: "E2",
  selection: {
    schemaVersion: 1,
    corpusId: "corpus-artifact-smoke",
    tokenSource: "explicit-textdoc-token-layer",
    units: "utf16-code-unit",
    documentOrder: ["doc-a", "doc-b"],
    tokenCount: 4,
    documents: [
      {
        id: "doc-a",
        documentId: "doc:corpus-artifact-a",
        revision: "r1",
        viewId: "analysis-view",
        tokenLayerId: "tokens",
        tokenCount: 2,
      },
      {
        id: "doc-b",
        documentId: "doc:corpus-artifact-b",
        revision: "r1",
        viewId: "analysis-view",
        tokenLayerId: "tokens",
        tokenCount: 2,
      },
    ],
  },
  formula: "bm25f.k1-1.2.b-0.75.fielded",
  k: 2,
  relevantGradeThreshold: 1,
  tolerance: 1e-12,
  optimizeMetric: "ndcgAtK",
  baselineCandidateId: "baseline",
  selectedCandidateId: "baseline",
  candidateOrder: ["baseline", "profile:zero"],
  candidates: [
    {
      candidateId: "baseline",
      rank: 1,
      selected: true,
      formula: "bm25f.k1-1.2.b-0.75.fielded",
      summary: {
        precisionAtK: 0.5,
        recallAtK: 1,
        mrr: 1,
        ndcgAtK: 1,
      },
      deltasFromBaseline: {
        precisionAtK: 0,
        recallAtK: 0,
        mrr: 0,
        ndcgAtK: 0,
      },
      metricScore: 1,
      withinToleranceOfSelected: true,
    },
    {
      candidateId: "profile:zero",
      rank: 2,
      selected: false,
      formula: "bm25f.k1-1.2.b-0.75.fielded",
      summary: {
        precisionAtK: 0,
        recallAtK: 0,
        mrr: 0,
        ndcgAtK: 0,
      },
      deltasFromBaseline: {
        precisionAtK: -0.5,
        recallAtK: -1,
        mrr: -1,
        ndcgAtK: -1,
      },
      metricScore: 0,
      withinToleranceOfSelected: false,
    },
  ],
};
const corpusCalibrationInspection = inspectTextCorpusArtifact(corpusRetrievalCalibrationReport, {
  offset: 1,
  limit: 1,
});
if (
  corpusCalibrationInspection.artifactKind !== "retrieval-calibration" ||
  corpusCalibrationInspection.rowCount !== 2 ||
  corpusCalibrationInspection.pageRows[0]?.candidateId !== "profile:zero" ||
  corpusCalibrationInspection.formulaIds.join(",") !== "bm25f.k1-1.2.b-0.75.fielded"
) {
  throw new Error("textcorpus artifact inspection should summarize retrieval calibration reports");
}
if (!renderTextCorpusArtifactInspection(corpusCalibrationInspection).includes("Kind: retrieval-calibration")) {
  throw new Error("textcorpus artifact renderer should include calibration artifact kind");
}
let invalidCorpusArtifactRejected = false;
try {
  inspectTextCorpusArtifact(corpusFixture);
} catch (error) {
  invalidCorpusArtifactRejected = error instanceof TypeError && error.message === "textcorpus artifact is invalid";
}
if (!invalidCorpusArtifactRejected) {
  throw new Error("textcorpus artifact inspection should reject non-artifact corpus fixtures");
}

const retrievalQrels = {
  schemaVersion: 1,
  taskId: "nlp-retrieval",
  corpusId: "corpus-smoke",
  judgments: [
    {
      queryId: "alpha",
      ratings: [
        { docId: "doc-a", grade: 2 },
        { docId: "doc-empty", grade: 0 },
      ],
    },
  ],
};

const qrelsInspection = inspectRetrievalQrels(retrievalQrels);

if (
  qrelsInspection.taskId !== "nlp-retrieval" ||
  qrelsInspection.queryCount !== 1 ||
  qrelsInspection.ratingCount !== 2 ||
  qrelsInspection.relevantRatingCount !== 1 ||
  qrelsInspection.maxGrade !== 2
) {
  throw new Error("retrieval qrels inspection should count relevance judgments");
}

if (!renderRetrievalQrelsInspection(qrelsInspection).includes("Relevant ratings: 1")) {
  throw new Error("retrieval qrels renderer should include relevant judgment count");
}

const retrievalEvaluation = {
  schemaVersion: 1,
  taskId: "nlp-retrieval",
  corpusId: "corpus-smoke",
  evidenceClass: "E2",
  selection: {
    schemaVersion: 1,
    corpusId: "corpus-smoke",
    tokenSource: "explicit-textdoc-token-layer",
    units: "utf16-code-unit",
    documentOrder: ["doc-a", "doc-empty"],
    tokenCount: 2,
    documents: [
      {
        id: "doc-a",
        documentId: "doc:a",
        revision: "r1",
        viewId: "analysis-view",
        tokenLayerId: "tokens",
        tokenCount: 2,
      },
      {
        id: "doc-empty",
        documentId: "doc:empty",
        revision: "r1",
        viewId: "analysis-view",
        tokenLayerId: "tokens",
        tokenCount: 0,
      },
    ],
  },
  formula: "bm25.okapi.k1-1.5.b-0.75",
  k: 2,
  relevantGradeThreshold: 1,
  tolerance: 1e-12,
  summary: { precisionAtK: 0.5, recallAtK: 1, mrr: 1, ndcgAtK: 1 },
  queries: [
    {
      queryId: "alpha",
      retrieved: ["doc-a", "doc-empty"],
      relevant: ["doc-a"],
      precisionAtK: 0.5,
      recallAtK: 1,
      reciprocalRank: 1,
      ndcgAtK: 1,
    },
  ],
};

const retrievalEvaluationInspection = inspectRetrievalEvaluation(retrievalEvaluation);

if (
  retrievalEvaluationInspection.formula !== "bm25.okapi.k1-1.5.b-0.75" ||
  retrievalEvaluationInspection.queryCount !== 1 ||
  retrievalEvaluationInspection.precisionAtK !== 0.5 ||
  retrievalEvaluationInspection.ndcgAtK !== 1
) {
  throw new Error("retrieval evaluation inspection should expose metric summaries");
}

if (!renderRetrievalEvaluationInspection(retrievalEvaluationInspection).includes("Precision@K: 0.5")) {
  throw new Error("retrieval evaluation renderer should include metric summaries");
}

const releaseReadiness = {
  schemaVersion: 1,
  scope: "package-release-gates",
  dependencyReleaseOrder: [
    { stage: 1, packages: ["@ismail-elkorchi/textfacts"] },
    { stage: 2, packages: ["@ismail-elkorchi/textdoc"] },
  ],
  packages: [
    {
      packageName: "@ismail-elkorchi/textfacts",
      releaseTrack: "alpha",
      releaseReadiness: "candidate",
      downstreamApiStability: { status: "stable", downstreamDependents: ["@ismail-elkorchi/textdoc"] },
      releaseBlockers: [],
      limitations: ["Alpha surface only."],
    },
    {
      packageName: "@ismail-elkorchi/textdoc",
      releaseTrack: "alpha",
      releaseReadiness: "blocked",
      downstreamApiStability: { status: "provisional", downstreamDependents: [] },
      releaseBlockers: ["missing downstream consumer"],
      limitations: ["Fixture-scale only."],
    },
  ],
};

const releaseReadinessInspection = inspectReleaseReadiness(releaseReadiness);

if (
  releaseReadinessInspection.packageCount !== 2 ||
  releaseReadinessInspection.stageCount !== 2 ||
  releaseReadinessInspection.blockerCount !== 1 ||
  releaseReadinessInspection.readinessCounts.map((entry) => `${entry.id}:${entry.count}`).join(",") !== "blocked:1,candidate:1"
) {
  throw new Error("release-readiness inspection should summarize package gates");
}

if (!renderReleaseReadinessInspection(releaseReadinessInspection).includes("Blockers: 1")) {
  throw new Error("release-readiness renderer should include blocker count");
}

const dir = await mkdtemp(path.join(tmpdir(), "textlab-inspection-"));
const reportPath = path.join(dir, "conformance-report.json");
await writeFile(reportPath, `${JSON.stringify(conformanceReport, null, 2)}\n`, "utf8");
const textdocPath = path.join(dir, "document.json");
await writeFile(textdocPath, `${JSON.stringify(textdocDocument, null, 2)}\n`, "utf8");
const pipelineTracePath = path.join(dir, "pipeline-trace.json");
await writeFile(pipelineTracePath, `${JSON.stringify(pipelineTrace, null, 2)}\n`, "utf8");
const pipelineBatchReportPath = path.join(dir, "pipeline-batch-report.json");
await writeFile(pipelineBatchReportPath, `${JSON.stringify(pipelineBatchReport, null, 2)}\n`, "utf8");
const resultEnvelopePath = path.join(dir, "result-envelope.json");
await writeFile(resultEnvelopePath, `${JSON.stringify(resultEnvelope, null, 2)}\n`, "utf8");
const schemaFamilyEnvelopePath = path.join(dir, "schema-family-envelope.json");
await writeFile(schemaFamilyEnvelopePath, `${JSON.stringify(schemaFamilyEnvelope, null, 2)}\n`, "utf8");
const packBackedRuleDocumentPath = path.join(dir, "pack-backed-rules-document.json");
await writeFile(packBackedRuleDocumentPath, `${JSON.stringify(packBackedRuleDocument, null, 2)}\n`, "utf8");
const corpusPath = path.join(dir, "corpus-fixture.json");
await writeFile(corpusPath, `${JSON.stringify(corpusFixture, null, 2)}\n`, "utf8");
const corpusArtifactPath = path.join(dir, "corpus-artifact.json");
await writeFile(corpusArtifactPath, `${JSON.stringify(corpusArtifact, null, 2)}\n`, "utf8");
const corpusMetricPayloadPath = path.join(dir, "corpus-metric-payload.json");
await writeFile(corpusMetricPayloadPath, `${JSON.stringify(corpusMetricPayload, null, 2)}\n`, "utf8");
const corpusStorageRefPath = path.join(dir, "corpus-retrieval-index-storage-ref.json");
await writeFile(corpusStorageRefPath, `${JSON.stringify(corpusRetrievalIndexStorageRef, null, 2)}\n`, "utf8");
const changedReportPath = path.join(dir, "conformance-report-actual.json");
await writeFile(changedReportPath, `${JSON.stringify(changedConformanceReport, null, 2)}\n`, "utf8");
const benchmarkReportPath = path.join(dir, "benchmark-report.json");
await writeFile(benchmarkReportPath, `${JSON.stringify(benchmarkReport, null, 2)}\n`, "utf8");
const externalToolSpecPath = path.join(dir, "external-tool.json");
await writeFile(
  externalToolSpecPath,
  `${JSON.stringify({
    toolId: "fixture-cli-node",
    command: process.execPath,
    args: ["-e", "process.stdout.write('cli-alpha\\n');"],
    maxOutputChars: 20,
    evidenceRefs: ["packages/textlab/test/index.test.mjs#external-tool-cli"],
    limitations: ["CLI test executes the current Node binary with explicit arguments."],
  }, null, 2)}\n`,
  "utf8",
);
const packagePath = path.join(dir, "package.json");
await writeFile(packagePath, `${JSON.stringify(packageManifest, null, 2)}\n`, "utf8");
const packPath = path.join(dir, "textpack.manifest.json");
await writeFile(packPath, `${JSON.stringify(packManifest, null, 2)}\n`, "utf8");
const packDirectoryManifestPath = path.join(dir, "pack.manifest.json");
await writeFile(packDirectoryManifestPath, `${JSON.stringify(packManifest, null, 2)}\n`, "utf8");
await mkdir(path.join(dir, "resources"), { recursive: true });
await writeFile(path.join(dir, "resources", "lexicon.tsv"), "Alice\tpos=PROPN\n", "utf8");
await writeFile(path.join(dir, "resources", "stopwords.tsv"), "the\n", "utf8");
const qrelsPath = path.join(dir, "qrels.json");
await writeFile(qrelsPath, `${JSON.stringify(retrievalQrels, null, 2)}\n`, "utf8");
const retrievalEvaluationPath = path.join(dir, "retrieval-evaluation.json");
await writeFile(retrievalEvaluationPath, `${JSON.stringify(retrievalEvaluation, null, 2)}\n`, "utf8");
const releaseReadinessPath = path.join(dir, "release-readiness.json");
await writeFile(releaseReadinessPath, `${JSON.stringify(releaseReadiness, null, 2)}\n`, "utf8");


const reportCliResult = await runTextlabCli(["conformance-report", reportPath]);

if (reportCliResult.exitCode !== 0 || reportCliResult.stderr !== "") {
  throw new Error(`conformance-report CLI should pass: ${reportCliResult.stderr}`);
}

if (!reportCliResult.stdout.includes("Subject: task:nlp-rule-backed-ner")) {
  throw new Error("conformance-report CLI should render the report subject");
}

const reportJsonCliResult = await runTextlabCli(["conformance-report", reportPath, "--json"]);

if (
  reportJsonCliResult.exitCode !== 0 ||
  !JSON.parse(reportJsonCliResult.stdout).reportId.includes("nlp-rule-backed-ner")
) {
  throw new Error("conformance-report CLI should support stable JSON output");
}

const conformanceDiffCliResult = await runTextlabCli(["conformance-diff", reportPath, changedReportPath]);

if (conformanceDiffCliResult.exitCode !== 0 || conformanceDiffCliResult.stderr !== "") {
  throw new Error(`conformance-diff CLI should pass: ${conformanceDiffCliResult.stderr}`);
}

if (!conformanceDiffCliResult.stdout.includes("Removed: 1")) {
  throw new Error("conformance-diff CLI should render removed check counts");
}

const benchmarkReportCliResult = await runTextlabCli(["benchmark-report", benchmarkReportPath]);

if (benchmarkReportCliResult.exitCode !== 0 || benchmarkReportCliResult.stderr !== "") {
  throw new Error(`benchmark-report CLI should pass: ${benchmarkReportCliResult.stderr}`);
}

if (!benchmarkReportCliResult.stdout.includes("Benchmark: benchmark:textlab-inspection")) {
  throw new Error("benchmark-report CLI should render benchmark identity");
}

const benchmarkReportJsonCliResult = await runTextlabCli(["benchmark-report", benchmarkReportPath, "--json"]);

if (
  benchmarkReportJsonCliResult.exitCode !== 0 ||
  JSON.parse(benchmarkReportJsonCliResult.stdout).metrics[0].metricId !== "latency-ms"
) {
  throw new Error("benchmark-report CLI should support stable JSON output");
}
const externalToolCliResult = await runTextlabCli(["external-tool", externalToolSpecPath, "--json"]);
const externalToolCliReport = externalToolCliResult.exitCode === 0 ? JSON.parse(externalToolCliResult.stdout) : {};
if (
  externalToolCliResult.exitCode !== 0 ||
  externalToolCliReport.status !== "passed" ||
  externalToolCliReport.stdoutPreview !== "cli-alpha\n" ||
  externalToolCliReport.toolId !== "fixture-cli-node"
) {
  throw new Error(`external-tool CLI should execute command specs: ${externalToolCliResult.stderr}`);
}

const packageCliResult = await runTextlabCli(["package", packagePath]);

if (packageCliResult.exitCode !== 0 || packageCliResult.stderr !== "") {
  throw new Error(`package CLI should pass: ${packageCliResult.stderr}`);
}

if (!packageCliResult.stdout.includes("Package: @ismail-elkorchi/textlab")) {
  throw new Error("package CLI should render package identity");
}

const packCliResult = await runTextlabCli(["pack", packPath, "--json"]);

if (packCliResult.exitCode !== 0 || JSON.parse(packCliResult.stdout).id !== "textpack-reference-smoke") {
  throw new Error(`pack CLI should support JSON output: ${packCliResult.stderr}`);
}

const packInspectCliResult = await runTextlabCli(["pack", "inspect", dir]);
if (packInspectCliResult.exitCode !== 0 || !packInspectCliResult.stdout.includes("Pack: textpack-reference-smoke")) {
  throw new Error(`pack inspect CLI should accept a pack directory: ${packInspectCliResult.stderr}`);
}

const packValidateCliResult = await runTextlabCli(["pack", "validate", dir, "--json"]);
if (packValidateCliResult.exitCode !== 0 || JSON.parse(packValidateCliResult.stdout).ok !== true) {
  throw new Error(`pack validate CLI should validate pack metadata: ${packValidateCliResult.stderr}`);
}

const invalidPackPath = path.join(dir, "invalid-pack.manifest.json");
await writeFile(
  invalidPackPath,
  `${JSON.stringify({ ...packManifest, provenance: { ...packManifest.provenance, sources: [] } }, null, 2)}\n`,
  "utf8",
);
const invalidPackValidateCliResult = await runTextlabCli(["pack", "validate", invalidPackPath, "--json"]);
if (
  invalidPackValidateCliResult.exitCode !== 1 ||
  !JSON.parse(invalidPackValidateCliResult.stdout).diagnostics.some((entry) => entry.code === "missing-provenance")
) {
  throw new Error("pack validate CLI should fail invalid provenance metadata");
}

const packAuditCliResult = await runTextlabCli(["pack", "audit", dir]);
if (
  packAuditCliResult.exitCode !== 0 ||
  packAuditCliResult.stderr !== "" ||
  !packAuditCliResult.stdout.includes("Status: valid")
) {
  throw new Error(`pack audit CLI should accept a matching pack directory: ${packAuditCliResult.stderr}`);
}

const packAuditJsonCliResult = await runTextlabCli(["pack", "audit", dir, "--json"]);
const packAuditJson = JSON.parse(packAuditJsonCliResult.stdout);
if (
  packAuditJsonCliResult.exitCode !== 0 ||
  packAuditJson.declaredResourceCount !== 2 ||
  packAuditJson.inventoryResourceCount !== 2
) {
  throw new Error("pack audit CLI should support deterministic JSON output");
}

const packReviewJsonCliResult = await runTextlabCli([
  "pack",
  "review",
  dir,
  "--target-state",
  "candidate",
  "--engine",
  "textpack=0.1.0",
  "--mandatory-resource",
  "lexicon:smoke",
  "--mandatory-resource",
  "stopwords:smoke",
  "--require-compatibility",
  "true",
  "--json",
]);
const packReviewCliJson = JSON.parse(packReviewJsonCliResult.stdout);
if (
  packReviewJsonCliResult.exitCode !== 0 ||
  packReviewCliJson.decision !== "accepted" ||
  packReviewCliJson.transition !== "promote" ||
  packReviewCliJson.compatibilityChecked !== true
) {
  throw new Error("pack review CLI should validate inventory, compatibility policy, and candidate evidence");
}

const blockedPackReviewCliResult = await runTextlabCli([
  "pack",
  "review",
  dir,
  "--target-state",
  "candidate",
  "--required-evidence",
  "reviewer",
  "--json",
]);
const blockedPackReviewCliJson = JSON.parse(blockedPackReviewCliResult.stdout);
if (
  blockedPackReviewCliResult.exitCode !== 1 ||
  !blockedPackReviewCliJson.diagnostics.some((entry) => entry.code === "missing-reviewer-evidence")
) {
  throw new Error("pack review CLI should fail when required review evidence is missing");
}

const orphanPackRoot = path.join(dir, "pack-orphan");
await mkdir(path.join(orphanPackRoot, "resources"), { recursive: true });
await writeFile(path.join(orphanPackRoot, "pack.manifest.json"), `${JSON.stringify(packManifest, null, 2)}\n`, "utf8");
await writeFile(path.join(orphanPackRoot, "resources", "lexicon.tsv"), "Alice\tpos=PROPN\n", "utf8");
await writeFile(path.join(orphanPackRoot, "resources", "orphan.tsv"), "orphan\n", "utf8");
await writeFile(path.join(orphanPackRoot, "resources", "stopwords.tsv"), "the\n", "utf8");
const orphanPackAuditCliResult = await runTextlabCli(["pack", "audit", orphanPackRoot, "--json"]);
const orphanPackAuditCliJson = JSON.parse(orphanPackAuditCliResult.stdout);
if (
  orphanPackAuditCliResult.exitCode !== 1 ||
  orphanPackAuditCliJson.orphanResourceCount !== 1 ||
  !orphanPackAuditCliJson.diagnostics.some((entry) => entry.code === "orphan-resource-file")
) {
  throw new Error("pack audit CLI should fail when resource inventory contains orphan files");
}

const missingPackRoot = path.join(dir, "pack-missing");
await mkdir(path.join(missingPackRoot, "resources"), { recursive: true });
await writeFile(path.join(missingPackRoot, "pack.manifest.json"), `${JSON.stringify(packManifest, null, 2)}\n`, "utf8");
await writeFile(path.join(missingPackRoot, "resources", "lexicon.tsv"), "Alice\tpos=PROPN\n", "utf8");
const missingPackAuditCliResult = await runTextlabCli(["pack", "audit", missingPackRoot, "--json"]);
const missingPackAuditCliJson = JSON.parse(missingPackAuditCliResult.stdout);
if (
  missingPackAuditCliResult.exitCode !== 1 ||
  missingPackAuditCliJson.missingResourceCount !== 1 ||
  missingPackAuditCliJson.diagnostics[0]?.code !== "missing-resource-file"
) {
  throw new Error("pack audit CLI should fail when a declared resource file is missing");
}

const authoringRoot = path.join(dir, "pack-authoring");
const authoringManifest = {
  ...packManifest,
  id: "textpack-authoring-smoke",
  packageName: "@ismail-elkorchi/textpack-authoring-smoke",
  capabilities: {},
  resources: {},
  provides: {},
};
await mkdir(authoringRoot, { recursive: true });
await writeFile(path.join(authoringRoot, "pack.manifest.json"), `${JSON.stringify(authoringManifest, null, 2)}\n`, "utf8");

const addResourceCliResult = await runTextlabCli([
  "pack",
  "add-resource",
  authoringRoot,
  "--family",
  "stopwords",
  "--resource-id",
  "stopwords:authoring",
  "--resource-path",
  "resources/stopwords.authoring.txt",
  "--content",
  "the\nand\n",
  "--json",
]);
const addResourceCliJson = JSON.parse(addResourceCliResult.stdout);
const addedManifest = JSON.parse(await readFile(path.join(authoringRoot, "pack.manifest.json"), "utf8"));
if (
  addResourceCliResult.exitCode !== 0 ||
  addResourceCliJson.ok !== true ||
  addResourceCliJson.audit.ok !== true ||
  addResourceCliJson.changedResourcePaths.join(",") !== "resources/stopwords.authoring.txt" ||
  addedManifest.provides.stopwords.join(",") !== "stopwords:authoring" ||
  await readFile(path.join(authoringRoot, "resources/stopwords.authoring.txt"), "utf8") !== "the\nand\n"
) {
  throw new Error("pack add-resource CLI should write resource content, update the manifest, and audit after write");
}

const updateResourceCliResult = await runTextlabCli([
  "pack",
  "update-resource",
  authoringRoot,
  "--resource-id",
  "stopwords:authoring",
  "--next-resource-id",
  "stopwords:authoring:v2",
  "--resource-path",
  "resources/stopwords.authoring.v2.txt",
  "--content",
  "the\nor\n",
  "--json",
]);
const updateResourceCliJson = JSON.parse(updateResourceCliResult.stdout);
const updatedAuthoringManifest = JSON.parse(await readFile(path.join(authoringRoot, "pack.manifest.json"), "utf8"));
if (
  updateResourceCliResult.exitCode !== 0 ||
  updateResourceCliJson.ok !== true ||
  updateResourceCliJson.removedResourcePaths.join(",") !== "resources/stopwords.authoring.txt" ||
  updateResourceCliJson.changedResourcePaths.join(",") !== "resources/stopwords.authoring.v2.txt" ||
  updatedAuthoringManifest.provides.stopwords.join(",") !== "stopwords:authoring:v2" ||
  await fileExists(path.join(authoringRoot, "resources/stopwords.authoring.txt")) ||
  await readFile(path.join(authoringRoot, "resources/stopwords.authoring.v2.txt"), "utf8") !== "the\nor\n"
) {
  throw new Error("pack update-resource CLI should update manifest pairs, replace resource files, and audit after write");
}

const removeResourceCliResult = await runTextlabCli([
  "pack",
  "remove-resource",
  authoringRoot,
  "--resource-id",
  "stopwords:authoring:v2",
  "--json",
]);
const removeResourceCliJson = JSON.parse(removeResourceCliResult.stdout);
const removedAuthoringManifest = JSON.parse(await readFile(path.join(authoringRoot, "pack.manifest.json"), "utf8"));
if (
  removeResourceCliResult.exitCode !== 0 ||
  removeResourceCliJson.ok !== true ||
  removeResourceCliJson.removedResourcePaths.join(",") !== "resources/stopwords.authoring.v2.txt" ||
  removedAuthoringManifest.resources.stopwords !== undefined ||
  await fileExists(path.join(authoringRoot, "resources/stopwords.authoring.v2.txt"))
) {
  throw new Error("pack remove-resource CLI should remove manifest pairs and resource files before audit");
}

const duplicateAuthoringRoot = path.join(dir, "pack-authoring-duplicate");
await mkdir(path.join(duplicateAuthoringRoot, "resources"), { recursive: true });
await writeFile(path.join(duplicateAuthoringRoot, "pack.manifest.json"), `${JSON.stringify(packManifest, null, 2)}\n`, "utf8");
await writeFile(path.join(duplicateAuthoringRoot, "resources", "lexicon.tsv"), "Alice\tpos=PROPN\n", "utf8");
await writeFile(path.join(duplicateAuthoringRoot, "resources", "stopwords.tsv"), "the\n", "utf8");
const duplicateAddCliResult = await runTextlabCli([
  "pack",
  "add-resource",
  duplicateAuthoringRoot,
  "--family",
  "stopwords",
  "--resource-id",
  "lexicon:smoke",
  "--resource-path",
  "resources/duplicate.tsv",
  "--content",
  "duplicate\n",
  "--json",
]);
const duplicateAddCliJson = JSON.parse(duplicateAddCliResult.stdout);
if (
  duplicateAddCliResult.exitCode !== 1 ||
  !duplicateAddCliJson.plan.diagnostics.some((entry) => entry.code === "duplicate-provides-id") ||
  await fileExists(path.join(duplicateAuthoringRoot, "resources/duplicate.tsv"))
) {
  throw new Error("pack add-resource CLI should reject duplicate provided ids before writing files");
}

const invalidMetadataRoot = path.join(dir, "pack-authoring-invalid-metadata");
const invalidMetadataManifest = {
  ...authoringManifest,
  reviewState: "deprecated",
};
await mkdir(invalidMetadataRoot, { recursive: true });
await writeFile(path.join(invalidMetadataRoot, "pack.manifest.json"), `${JSON.stringify(invalidMetadataManifest, null, 2)}\n`, "utf8");
const invalidMetadataCliResult = await runTextlabCli([
  "pack",
  "add-resource",
  invalidMetadataRoot,
  "--family",
  "stopwords",
  "--resource-id",
  "stopwords:invalid",
  "--resource-path",
  "resources/invalid.txt",
  "--content",
  "invalid\n",
  "--json",
]);
const invalidMetadataCliJson = JSON.parse(invalidMetadataCliResult.stdout);
if (
  invalidMetadataCliResult.exitCode !== 1 ||
  !invalidMetadataCliJson.plan.diagnostics.some((entry) => entry.code === "deprecated-review-state") ||
  await fileExists(path.join(invalidMetadataRoot, "resources/invalid.txt"))
) {
  throw new Error("pack add-resource CLI should reject metadata failures before writing files");
}

const staleAuthoringRoot = path.join(dir, "pack-authoring-stale");
await mkdir(path.join(staleAuthoringRoot, "resources"), { recursive: true });
await writeFile(path.join(staleAuthoringRoot, "pack.manifest.json"), `${JSON.stringify(authoringManifest, null, 2)}\n`, "utf8");
await writeFile(path.join(staleAuthoringRoot, "resources", "orphan.txt"), "stale\n", "utf8");
const staleAuthoringCliResult = await runTextlabCli([
  "pack",
  "add-resource",
  staleAuthoringRoot,
  "--family",
  "stopwords",
  "--resource-id",
  "stopwords:stale",
  "--resource-path",
  "resources/stale.txt",
  "--content",
  "stale\n",
  "--json",
]);
const staleAuthoringCliJson = JSON.parse(staleAuthoringCliResult.stdout);
if (
  staleAuthoringCliResult.exitCode !== 1 ||
  staleAuthoringCliJson.plan.diagnostics.map((entry) => entry.code).join(",") !== "orphan-resource-file" ||
  await fileExists(path.join(staleAuthoringRoot, "resources/stale.txt"))
) {
  throw new Error("pack add-resource CLI should reject stale resource inventory before writing files");
}

const packResourcesCliResult = await runTextlabCli(["pack", "list-resources", packPath, "--json"]);
const packResourcesCliJson = JSON.parse(packResourcesCliResult.stdout);
if (
  packResourcesCliResult.exitCode !== 0 ||
  packResourcesCliJson.resources.map((entry) => entry.resourceId).join(",") !== "lexicon:smoke,stopwords:smoke"
) {
  throw new Error(`pack list-resources CLI should emit deterministic resource rows: ${packResourcesCliResult.stderr}`);
}

const documentCliResult = await runTextlabCli(["document", textdocPath]);

if (documentCliResult.exitCode !== 0 || documentCliResult.stderr !== "") {
  throw new Error(`document CLI should pass: ${documentCliResult.stderr}`);
}

if (!documentCliResult.stdout.includes("Annotations: 10")) {
  throw new Error("document CLI should render annotation counts");
}

const annotationCliResult = await runTextlabCli(["annotations", textdocPath]);

if (annotationCliResult.exitCode !== 0 || annotationCliResult.stderr !== "") {
  throw new Error(`annotations CLI should pass: ${annotationCliResult.stderr}`);
}

if (!annotationCliResult.stdout.includes("Graph edges: 5")) {
  throw new Error("annotations CLI should render graph edge counts");
}

const filteredAnnotationCliResult = await runTextlabCli(["annotations", textdocPath, "--layer-kind", "relation"]);

if (
  filteredAnnotationCliResult.exitCode !== 0 ||
  !filteredAnnotationCliResult.stdout.includes("relation:rel-1") ||
  filteredAnnotationCliResult.stdout.includes("coreference-chain:chain-1")
) {
  throw new Error("annotations CLI should support deterministic layer-kind filtering");
}

const pipelineTraceCliResult = await runTextlabCli(["pipeline-trace", pipelineTracePath]);

if (pipelineTraceCliResult.exitCode !== 0 || pipelineTraceCliResult.stderr !== "") {
  throw new Error(`pipeline-trace CLI should pass: ${pipelineTraceCliResult.stderr}`);
}

if (!pipelineTraceCliResult.stdout.includes("Processors: 1")) {
  throw new Error("pipeline-trace CLI should render processor counts");
}

const pipelineTraceJsonCliResult = await runTextlabCli(["pipeline-trace", pipelineTracePath, "--json"]);

if (
  pipelineTraceJsonCliResult.exitCode !== 0 ||
  JSON.parse(pipelineTraceJsonCliResult.stdout).rows[0]?.processorId !== "textrules.textpack-rules"
) {
  throw new Error("pipeline-trace CLI should support stable JSON output");
}

const invalidPipelineTracePath = path.join(dir, "invalid-pipeline-trace.json");
await writeFile(invalidPipelineTracePath, `${JSON.stringify({ schemaVersion: 1, entries: [] }, null, 2)}\n`, "utf8");
const invalidPipelineTraceCliResult = await runTextlabCli(["pipeline-trace", invalidPipelineTracePath]);
if (invalidPipelineTraceCliResult.exitCode !== 1 || !invalidPipelineTraceCliResult.stderr.includes("Invalid textpipeline trace")) {
  throw new Error("pipeline-trace CLI should reject invalid trace input");
}

const resultEnvelopeCliResult = await runTextlabCli(["result-envelope", resultEnvelopePath]);

if (resultEnvelopeCliResult.exitCode !== 0 || resultEnvelopeCliResult.stderr !== "") {
  throw new Error(`result-envelope CLI should pass: ${resultEnvelopeCliResult.stderr}`);
}

if (!resultEnvelopeCliResult.stdout.includes("Payload kind: textpipeline-batch-run-report-v1")) {
  throw new Error("result-envelope CLI should render payload kind");
}

const resultEnvelopeJsonCliResult = await runTextlabCli(["result-envelope", resultEnvelopePath, "--json"]);

if (
  resultEnvelopeJsonCliResult.exitCode !== 0 ||
  JSON.parse(resultEnvelopeJsonCliResult.stdout).payloadOwnerPackage !== "@ismail-elkorchi/textpipeline"
) {
  throw new Error("result-envelope CLI should support stable JSON output");
}

const invalidResultEnvelopePath = path.join(dir, "invalid-result-envelope.json");
await writeFile(
  invalidResultEnvelopePath,
  `${JSON.stringify({ schemaVersion: 1, payloadKind: "bad" }, null, 2)}\n`,
  "utf8",
);
const invalidResultEnvelopeCliResult = await runTextlabCli(["result-envelope", invalidResultEnvelopePath]);
if (
  invalidResultEnvelopeCliResult.exitCode !== 1 ||
  !invalidResultEnvelopeCliResult.stderr.includes("Invalid textprotocol result envelope")
) {
  throw new Error("result-envelope CLI should reject invalid envelope input");
}

const schemaFamilyEnvelopeCliResult = await runTextlabCli([
  "schema-family-envelope",
  schemaFamilyEnvelopePath,
]);

if (schemaFamilyEnvelopeCliResult.exitCode !== 0 || schemaFamilyEnvelopeCliResult.stderr !== "") {
  throw new Error(`schema-family-envelope CLI should pass: ${schemaFamilyEnvelopeCliResult.stderr}`);
}

if (!schemaFamilyEnvelopeCliResult.stdout.includes("Family: document-bundle")) {
  throw new Error("schema-family-envelope CLI should render family metadata");
}

const schemaFamilyEnvelopeJsonCliResult = await runTextlabCli([
  "schema-family-envelope",
  schemaFamilyEnvelopePath,
  "--json",
]);

if (
  schemaFamilyEnvelopeJsonCliResult.exitCode !== 0 ||
  JSON.parse(schemaFamilyEnvelopeJsonCliResult.stdout).ownerPackage !== "@ismail-elkorchi/textprotocol"
) {
  throw new Error("schema-family-envelope CLI should support stable JSON output");
}

const invalidSchemaFamilyEnvelopePath = path.join(dir, "invalid-schema-family-envelope.json");
await writeFile(
  invalidSchemaFamilyEnvelopePath,
  `${JSON.stringify({ schemaId: textProtocolDocumentBundleSchemaId, schemaVersion: textProtocolSchemaVersion, payload: {} }, null, 2)}\n`,
  "utf8",
);
const invalidSchemaFamilyEnvelopeCliResult = await runTextlabCli([
  "schema-family-envelope",
  invalidSchemaFamilyEnvelopePath,
]);
if (
  invalidSchemaFamilyEnvelopeCliResult.exitCode !== 1 ||
  !invalidSchemaFamilyEnvelopeCliResult.stderr.includes("Invalid textprotocol schema-family envelope")
) {
  throw new Error("schema-family-envelope CLI should reject invalid envelope input");
}

const pipelineBatchReportCliResult = await runTextlabCli(["pipeline-batch-report", pipelineBatchReportPath]);

if (pipelineBatchReportCliResult.exitCode !== 0 || pipelineBatchReportCliResult.stderr !== "") {
  throw new Error(`pipeline-batch-report CLI should pass: ${pipelineBatchReportCliResult.stderr}`);
}

if (!pipelineBatchReportCliResult.stdout.includes("Documents: 2")) {
  throw new Error("pipeline-batch-report CLI should render document counts");
}

const pipelineBatchReportJsonCliResult = await runTextlabCli(["pipeline-batch-report", pipelineBatchReportPath, "--json"]);

if (
  pipelineBatchReportJsonCliResult.exitCode !== 0 ||
  JSON.parse(pipelineBatchReportJsonCliResult.stdout).rows[1]?.runStatus !== "partial"
) {
  throw new Error("pipeline-batch-report CLI should support stable JSON output");
}

const invalidPipelineBatchReportPath = path.join(dir, "invalid-pipeline-batch-report.json");
await writeFile(
  invalidPipelineBatchReportPath,
  `${JSON.stringify({ schemaVersion: 1, documentCount: 0, items: [] }, null, 2)}\n`,
  "utf8",
);
const invalidPipelineBatchReportCliResult = await runTextlabCli([
  "pipeline-batch-report",
  invalidPipelineBatchReportPath,
]);
if (
  invalidPipelineBatchReportCliResult.exitCode !== 1 ||
  !invalidPipelineBatchReportCliResult.stderr.includes("Invalid textpipeline batch report")
) {
  throw new Error("pipeline-batch-report CLI should reject invalid batch report input");
}

const packBackedRulesCliResult = await runTextlabCli(["pack-backed-rules", packBackedRuleDocumentPath]);

if (packBackedRulesCliResult.exitCode !== 0 || packBackedRulesCliResult.stderr !== "") {
  throw new Error(`pack-backed-rules CLI should pass: ${packBackedRulesCliResult.stderr}`);
}

if (!packBackedRulesCliResult.stdout.includes("Rule annotations: 2")) {
  throw new Error("pack-backed-rules CLI should render rule annotation counts");
}

const filteredPackBackedRulesCliResult = await runTextlabCli([
  "pack-backed-rules",
  packBackedRuleDocumentPath,
  "--resource-id",
  "stopwords-en-core",
  "--rule-kind",
  "stopword",
  "--json",
]);
const filteredPackBackedRulesCliJson = JSON.parse(filteredPackBackedRulesCliResult.stdout);
if (
  filteredPackBackedRulesCliResult.exitCode !== 0 ||
  filteredPackBackedRulesCliJson.filteredAnnotationCount !== 1 ||
  filteredPackBackedRulesCliJson.rows[0]?.resourceId !== "stopwords-en-core"
) {
  throw new Error("pack-backed-rules CLI should support deterministic filters and JSON output");
}

const invalidPackBackedRuleFilterCliResult = await runTextlabCli([
  "pack-backed-rules",
  packBackedRuleDocumentPath,
  "--rule-kind",
  "invalid-kind",
]);
if (
  invalidPackBackedRuleFilterCliResult.exitCode !== 2 ||
  !invalidPackBackedRuleFilterCliResult.stderr.includes("Invalid pack-backed rule kind")
) {
  throw new Error("pack-backed-rules CLI should reject invalid rule-kind filters");
}


const corpusCliResult = await runTextlabCli(["corpus-fixture", corpusPath]);

if (corpusCliResult.exitCode !== 0 || corpusCliResult.stderr !== "") {
  throw new Error(`corpus-fixture CLI should pass: ${corpusCliResult.stderr}`);
}

if (!corpusCliResult.stdout.includes("Corpus: corpus-smoke")) {
  throw new Error("corpus-fixture CLI should render corpus identity");
}

const corpusArtifactCliResult = await runTextlabCli(["corpus-artifact", corpusArtifactPath]);

if (corpusArtifactCliResult.exitCode !== 0 || corpusArtifactCliResult.stderr !== "") {
  throw new Error(`corpus-artifact CLI should pass: ${corpusArtifactCliResult.stderr}`);
}

if (!corpusArtifactCliResult.stdout.includes("Kind: frequency")) {
  throw new Error("corpus-artifact CLI should render artifact kind");
}

const corpusArtifactPagedCliResult = await runTextlabCli([
  "corpus-artifact",
  corpusArtifactPath,
  "--offset",
  "1",
  "--limit",
  "2",
  "--json",
]);
const corpusArtifactPagedCliInspection =
  corpusArtifactPagedCliResult.exitCode === 0 ? JSON.parse(corpusArtifactPagedCliResult.stdout) : {};
if (
  corpusArtifactPagedCliResult.exitCode !== 0 ||
  corpusArtifactPagedCliInspection.pageOffset !== 1 ||
  corpusArtifactPagedCliInspection.pageLimit !== 2 ||
  corpusArtifactPagedCliInspection.pageRowCount !== 2 ||
  corpusArtifactPagedCliInspection.hasNextPage !== true ||
  corpusArtifactPagedCliInspection.pageRows?.[0]?.term !== "beta"
) {
  throw new Error("corpus-artifact CLI should support paginated JSON output");
}

const corpusArtifactInvalidPageCliResult = await runTextlabCli([
  "corpus-artifact",
  corpusArtifactPath,
  "--limit",
  "bad",
]);
if (
  corpusArtifactInvalidPageCliResult.exitCode !== 2 ||
  !corpusArtifactInvalidPageCliResult.stderr.includes("--limit must be a non-negative integer.")
) {
  throw new Error("corpus-artifact CLI should reject invalid pagination options");
}

const corpusMetricPayloadCliResult = await runTextlabCli(["corpus-artifact", corpusMetricPayloadPath, "--json"]);

if (
  corpusMetricPayloadCliResult.exitCode !== 0 ||
  JSON.parse(corpusMetricPayloadCliResult.stdout).metricSetId !== "metrics:corpus-artifact-smoke"
) {
  throw new Error("corpus-artifact CLI should support metric-envelope JSON output");
}
const corpusStorageRefCliResult = await runTextlabCli(["corpus-artifact", corpusStorageRefPath, "--json"]);
const corpusStorageRefCliInspection =
  corpusStorageRefCliResult.exitCode === 0 ? JSON.parse(corpusStorageRefCliResult.stdout) : {};
if (
  corpusStorageRefCliResult.exitCode !== 0 ||
  corpusStorageRefCliInspection.artifactKind !== "retrieval-index-storage-ref" ||
  corpusStorageRefCliInspection.storageKey !== "file://indexes/corpus-artifact-smoke/bm25.json" ||
  corpusStorageRefCliInspection.byteLength !== 2048
) {
  throw new Error("corpus-artifact CLI should support retrieval-index storage-ref JSON output");
}

const qrelsCliResult = await runTextlabCli(["retrieval-qrels", qrelsPath]);

if (qrelsCliResult.exitCode !== 0 || qrelsCliResult.stderr !== "") {
  throw new Error(`retrieval-qrels CLI should pass: ${qrelsCliResult.stderr}`);
}

if (!qrelsCliResult.stdout.includes("Relevant ratings: 1")) {
  throw new Error("retrieval-qrels CLI should render relevance judgment counts");
}

const retrievalEvaluationCliResult = await runTextlabCli(["retrieval-evaluation", retrievalEvaluationPath]);

if (retrievalEvaluationCliResult.exitCode !== 0 || retrievalEvaluationCliResult.stderr !== "") {
  throw new Error(`retrieval-evaluation CLI should pass: ${retrievalEvaluationCliResult.stderr}`);
}

if (!retrievalEvaluationCliResult.stdout.includes("NDCG@K: 1")) {
  throw new Error("retrieval-evaluation CLI should render metric summaries");
}

const releaseReadinessCliResult = await runTextlabCli(["release-readiness", releaseReadinessPath]);

if (releaseReadinessCliResult.exitCode !== 0 || releaseReadinessCliResult.stderr !== "") {
  throw new Error(`release-readiness CLI should pass: ${releaseReadinessCliResult.stderr}`);
}

if (!releaseReadinessCliResult.stdout.includes("Packages: 2")) {
  throw new Error("release-readiness CLI should render package counts");
}

const missingReportCliResult = await runTextlabCli(["conformance-report"]);

if (missingReportCliResult.exitCode !== 2 || !missingReportCliResult.stderr.includes("Missing path")) {
  throw new Error("conformance-report CLI should require an explicit path");
}

const invalidCliResult = await runTextlabCli(["unknown"]);

if (invalidCliResult.exitCode !== 2 || !invalidCliResult.stderr.includes("Unknown command")) {
  throw new Error("CLI should reject unknown commands deterministically");
}
