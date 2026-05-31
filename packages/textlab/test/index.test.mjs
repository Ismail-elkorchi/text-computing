import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  resultEnvelopeSchemaId,
  resultEnvelopeSchemaVersion,
  textProtocolPayloadKindTextpipelineBatchRunReportV1,
} from "@ismail-elkorchi/textprotocol";
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
  inspectTextPackResourceAudit,
  inspectTextPackResourceList,
  inspectTextPackValidation,
  inspectTextPipelineBatchReport,
  inspectTextPipelineTrace,
  inspectTextProtocolResultEnvelope,
  packageName,
  renderCorpusFixtureInspection,
  renderConformanceDiffInspection,
  renderConformanceReportSummary,
  renderPackageInspection,
  renderPackBackedRuleInspection,
  renderReleaseReadinessInspection,
  renderRetrievalEvaluationInspection,
  renderRetrievalQrelsInspection,
  renderTextdocAnnotationInspection,
  renderTextdocDocumentInspection,
  renderTextPackInspection,
  renderTextPackAuditInspection,
  renderTextPackResourceListInspection,
  renderTextPackValidationInspection,
  renderTextPipelineBatchReportInspection,
  renderTextPipelineTraceInspection,
  renderTextProtocolResultEnvelopeInspection,
  summarizeConformanceReport,
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
const packBackedRuleDocumentPath = path.join(dir, "pack-backed-rules-document.json");
await writeFile(packBackedRuleDocumentPath, `${JSON.stringify(packBackedRuleDocument, null, 2)}\n`, "utf8");
const corpusPath = path.join(dir, "corpus-fixture.json");
await writeFile(corpusPath, `${JSON.stringify(corpusFixture, null, 2)}\n`, "utf8");
const changedReportPath = path.join(dir, "conformance-report-actual.json");
await writeFile(changedReportPath, `${JSON.stringify(changedConformanceReport, null, 2)}\n`, "utf8");
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
