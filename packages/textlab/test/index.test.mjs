import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  inspectCorpusFixture,
  inspectConformanceReportDiff,
  inspectPackageManifest,
  inspectReleaseReadiness,
  inspectRetrievalEvaluation,
  inspectRetrievalQrels,
  inspectTextdocDocument,
  inspectTextdocAnnotations,
  inspectTextPackManifest,
  inspectTextPackResourceList,
  inspectTextPackValidation,
  packageName,
  renderCorpusFixtureInspection,
  renderConformanceDiffInspection,
  renderConformanceReportSummary,
  renderPackageInspection,
  renderReleaseReadinessInspection,
  renderRetrievalEvaluationInspection,
  renderRetrievalQrelsInspection,
  renderTextdocAnnotationInspection,
  renderTextdocDocumentInspection,
  renderTextPackInspection,
  renderTextPackResourceListInspection,
  renderTextPackValidationInspection,
  summarizeConformanceReport,
} from "../dist/index.js";
import { runTextlabCli } from "../dist/cli.js";

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
