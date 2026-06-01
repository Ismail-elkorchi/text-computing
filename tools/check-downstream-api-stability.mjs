import Ajv from "ajv";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const ARTIFACT_PATH = "fixtures/package-release/downstream-api-stability.v1.json";
const SCHEMA_PATH = "schemas/downstream-api-stability-v1.schema.json";
const RELEASE_GATES_PATH = "fixtures/package-release/gates.v1.json";

function fail(message, details) {
  console.error(message);
  if (details !== undefined) console.error(JSON.stringify(details, null, 2));
  process.exit(1);
}

function expect(condition, message, details) {
  if (!condition) fail(message, details);
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(ROOT, relativePath), "utf8"));
}

async function readText(relativePath) {
  return readFile(path.join(ROOT, relativePath), "utf8");
}

async function fileExists(relativePath) {
  try {
    await access(path.join(ROOT, relativePath));
    return true;
  } catch {
    return false;
  }
}

function assertRepoRef(ref, label) {
  expect(!path.isAbsolute(ref), `${label} must be repository-relative: ${ref}`);
  expect(!ref.includes(".."), `${label} must not traverse outside the repository: ${ref}`);
  expect(!ref.includes("\\"), `${label} must use forward slashes: ${ref}`);
  expect(!/^https?:\/\//.test(ref), `${label} must reference a committed repository artifact: ${ref}`);
}

async function workspacePackageJsons() {
  const entries = await readdir(path.join(ROOT, "packages"), { withFileTypes: true });
  const packages = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    packages.push(await readJson(`packages/${entry.name}/package.json`));
  }
  return packages;
}

function downstreamByPackage(packageJsons) {
  const packageNames = new Set(packageJsons.map((entry) => entry.name));
  const downstream = new Map([...packageNames].map((name) => [name, []]));
  for (const packageJson of packageJsons) {
    for (const dependencyName of Object.keys(packageJson.dependencies ?? {})) {
      if (packageNames.has(dependencyName)) downstream.get(dependencyName)?.push(packageJson.name);
    }
  }
  for (const value of downstream.values()) value.sort();
  return downstream;
}

async function assertDeclaredImports(entry) {
  for (const dependent of entry.dependents) {
    for (const ref of dependent.evidenceRefs) {
      assertRepoRef(ref, `${dependent.packageName} evidenceRefs`);
      expect(await fileExists(ref), `${dependent.packageName} evidence ref does not exist: ${ref}`);
    }

    const evidenceText = (await Promise.all(dependent.evidenceRefs.map((ref) => readText(ref)))).join("\n");
    for (const importSurface of dependent.importSurfaces) {
      const importPattern = new RegExp(`from\\s+["']${importSurface.replace("/", "\\/")}["']|import\\(["']${importSurface.replace("/", "\\/")}["']\\)`);
      expect(
        importPattern.test(evidenceText),
        `${dependent.packageName} does not import declared API surface ${importSurface}`,
      );
    }

    const siblingPath = `packages/${entry.packageName.split("/")[1]}`;
    const siblingPathPattern = new RegExp(`(^|[^A-Za-z0-9_-])${siblingPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:/|$)`);
    expect(!siblingPathPattern.test(evidenceText), `${dependent.packageName} evidence must not import sibling path ${siblingPath}`);
  }
}

async function assertBuiltPackageSmoke() {
  const releaseGates = await readJson(RELEASE_GATES_PATH);
  const validatedPackages = releaseGates.packages
    .filter(
      (entry) =>
        entry.downstreamApiStability?.requiredBeforeRelease === true &&
        entry.downstreamApiStability?.status === "validated",
    )
    .map((entry) => entry.packageName)
    .sort();

  for (const packageName of validatedPackages) {
    const packageDir = packageName.split("/")[1];
    expect(await fileExists(`packages/${packageDir}/dist/index.js`), `${packageName} dist output is missing; run npm run -s build first.`);
  }

  const textdoc = await import("@ismail-elkorchi/textdoc");
  const textprotocol = await import("@ismail-elkorchi/textprotocol");
  const textconformance = await import("@ismail-elkorchi/textconformance");
  const textpack = await import("@ismail-elkorchi/textpack");
  const textpipeline = await import("@ismail-elkorchi/textpipeline");
  const textcorpus = await import("@ismail-elkorchi/textcorpus");
  const textrules = await import("@ismail-elkorchi/textrules");
  const textlab = await import("@ismail-elkorchi/textlab");

  const document = {
    schemaVersion: 1,
    documentId: "doc:downstream-api",
    revision: "r1",
    text: "Alice works.",
    textLengthCU: 12,
    units: { text: "utf16-code-unit" },
    views: [{ id: "source-view", kind: "raw" }],
    layers: [
      {
        id: "tokens",
        kind: "token",
        viewId: "source-view",
        annotations: [
          {
            id: "token-1",
            kind: "token",
            tokenKind: "lexical-token",
            lifecycle: { state: "active" },
            targets: [{ kind: "span", viewId: "source-view", startCU: 0, endCU: 5 }],
            text: "Alice",
            provenance: {
              references: [{ kind: "fixture", id: "downstream-api-tokenizer" }],
            },
            confidence: { value: 0.9, method: "downstream-api-smoke" },
          },
          {
            id: "token-2",
            kind: "token",
            tokenKind: "lexical-token",
            lifecycle: { state: "active" },
            targets: [{ kind: "span", viewId: "source-view", startCU: 6, endCU: 11 }],
            text: "works",
          },
        ],
      },
    ],
  };

  expect(textdoc.isTextDocDocumentV1(document), "textdoc built API should validate a downstream document fixture.");
  const documentBundlePayload = textdoc.exportTextDocDocumentBundlePayloadV1([document]);
  expect(
    textdoc.isTextDocDocumentBundlePayloadV1(documentBundlePayload),
    "textdoc built API should export a document-bundle payload through package APIs.",
  );
  const annotationBundlePayload = textdoc.exportTextDocAnnotationBundlePayloadV1(document);
  expect(
    textdoc.isTextDocAnnotationBundlePayloadV1(annotationBundlePayload),
    "textdoc built API should export an annotation-bundle payload through package APIs.",
  );
  const lossyDocument = textdoc.addTextDocSpanMapV1(
    textdoc.addTextDocViewV1(
      document,
      {
        id: "normalized-view",
        kind: "normalized",
        parentViewId: "source-view",
        spanMapIds: ["span-map-source-normalized"],
        loss: [{ kind: "lossy-normalization", reason: "Downstream smoke declares view normalization loss." }],
      },
      { revision: "r2" },
    ),
    {
      id: "span-map-source-normalized",
      sourceViewId: "source-view",
      targetViewId: "normalized-view",
      lifecycle: { state: "active" },
      segments: [
        {
          source: { startCU: 0, endCU: document.textLengthCU },
          target: { startCU: 0, endCU: document.textLengthCU },
          kind: "normalized",
          reversible: false,
          loss: [{ kind: "lossy-normalization", reason: "Downstream smoke declares segment normalization loss." }],
        },
      ],
    },
    { revision: "r3" },
  );
  const mappingLossPayload = textdoc.exportTextDocMappingLossReportPayloadV1(lossyDocument, {
    mappingId: "mapping:downstream-api-loss",
  });
  expect(
    textdoc.isTextDocMappingLossReportPayloadV1(mappingLossPayload) && mappingLossPayload.losses.length === 2,
    "textdoc built API should export mapping-loss report payloads through package APIs.",
  );

  const envelope = {
    schemaId: textprotocol.resultEnvelopeSchemaId,
    schemaVersion: textprotocol.resultEnvelopeSchemaVersion,
    producer: { package: "@ismail-elkorchi/textdoc", version: "0.0.0" },
    payloadKind: textdoc.textDocDocumentPayloadKind,
    payload: document,
  };
  expect(textprotocol.isTextProtocolResultEnvelopeV1(envelope), "textprotocol built API should validate a result envelope.");
  const documentBundle = {
    schemaId: textprotocol.textProtocolDocumentBundleSchemaId,
    schemaVersion: textprotocol.textProtocolSchemaVersion,
    producer: { package: "@ismail-elkorchi/textdoc", version: "0.0.0" },
    payload: documentBundlePayload,
    provenance: { references: [{ kind: "fixture", id: "downstream-api-smoke" }] },
    limitations: ["Downstream API stability document-bundle smoke."],
  };
  const documentBundleTransport = textprotocol.serializeTextProtocolSchemaFamilyEnvelopeJson(
    documentBundle,
    { expectedFamily: "document-bundle", requireProvenance: true, requireLimitations: true },
  );
  const parsedDocumentBundle = textprotocol.parseTextProtocolSchemaFamilyEnvelopeJson(documentBundleTransport);
  expect(
    textprotocol.isTextProtocolSchemaFamilyEnvelopeJsonTransportV1(documentBundleTransport) &&
      textprotocol.isTextProtocolDocumentBundleV1(parsedDocumentBundle),
    "textprotocol should serialize and parse schema-family envelopes through package APIs.",
  );
  const importedDocumentBundle = textdoc.importTextDocDocumentBundlePayloadV1(parsedDocumentBundle.payload);
  expect(
    importedDocumentBundle.ok && importedDocumentBundle.documents?.[0]?.documentId === document.documentId,
    "textdoc should import parsed document-bundle payloads through package APIs.",
  );
  const schemaFamilyInspection = textlab.inspectTextProtocolSchemaFamilyEnvelope(parsedDocumentBundle);
  expect(
    schemaFamilyInspection.family === "document-bundle" && schemaFamilyInspection.compatibilityOk,
    "textlab should inspect textprotocol schema-family envelopes through package APIs.",
  );
  const annotationBundle = {
    schemaId: textprotocol.textProtocolAnnotationBundleSchemaId,
    schemaVersion: textprotocol.textProtocolSchemaVersion,
    producer: { package: "@ismail-elkorchi/textdoc", version: "0.0.0" },
    payload: annotationBundlePayload,
    provenance: { references: [{ kind: "fixture", id: "downstream-api-smoke" }] },
    limitations: ["Downstream API stability annotation-bundle smoke."],
  };
  const annotationBundleTransport = textprotocol.serializeTextProtocolSchemaFamilyEnvelopeJson(
    annotationBundle,
    { expectedFamily: "annotation-bundle", requireProvenance: true, requireLimitations: true },
  );
  const parsedAnnotationBundle = textprotocol.parseTextProtocolSchemaFamilyEnvelopeJson(annotationBundleTransport);
  expect(
    textprotocol.isTextProtocolAnnotationBundleV1(parsedAnnotationBundle),
    "textprotocol should serialize and parse textdoc annotation bundles through package APIs.",
  );
  const annotationSkeletonDocument = {
    ...document,
    layers: document.layers.map((layer) => ({ ...layer, annotations: [] })),
  };
  const appliedAnnotationBundle = textdoc.applyTextDocAnnotationBundlePayloadV1(
    annotationSkeletonDocument,
    parsedAnnotationBundle.payload,
  );
  const restoredAnnotationIds = appliedAnnotationBundle.document?.layers
    .flatMap((layer) => layer.annotations.map((annotation) => annotation.id))
    .join(",");
  expect(
    appliedAnnotationBundle.ok &&
      restoredAnnotationIds === "token-1,token-2",
    "textdoc should apply parsed annotation-bundle payloads through package APIs.",
  );
  const annotationBundleInspection = textlab.inspectTextProtocolSchemaFamilyEnvelope(parsedAnnotationBundle);
  expect(
    annotationBundleInspection.family === "annotation-bundle" && annotationBundleInspection.compatibilityOk,
    "textlab should inspect textdoc annotation-bundle envelopes through package APIs.",
  );
  const evidenceBundlePayload = textdoc.exportTextDocEvidenceBundlePayloadV1(document, {
    recordIdPrefix: "evidence:downstream-api",
    supportByAnnotationId: {
      "token-1": [{ kind: "fixture", id: "downstream-api-support" }],
    },
  });
  expect(
    textdoc.isTextDocEvidenceBundlePayloadV1(evidenceBundlePayload) &&
      evidenceBundlePayload.records.some((record) => record.id === "evidence:downstream-api:tokens:token-1"),
    "textdoc built API should export evidence-bundle payloads through package APIs.",
  );
  const evidenceBundle = {
    schemaId: textprotocol.textProtocolEvidenceBundleSchemaId,
    schemaVersion: textprotocol.textProtocolSchemaVersion,
    producer: { package: "@ismail-elkorchi/textdoc", version: "0.0.0" },
    payload: evidenceBundlePayload,
    provenance: { references: [{ kind: "fixture", id: "downstream-api-smoke" }] },
    limitations: ["Downstream API stability evidence-bundle smoke."],
  };
  const evidenceBundleTransport = textprotocol.serializeTextProtocolSchemaFamilyEnvelopeJson(
    evidenceBundle,
    { expectedFamily: "evidence-bundle", requireProvenance: true, requireLimitations: true },
  );
  const parsedEvidenceBundle = textprotocol.parseTextProtocolSchemaFamilyEnvelopeJson(evidenceBundleTransport);
  expect(
    textprotocol.isTextProtocolEvidenceBundleV1(parsedEvidenceBundle),
    "textprotocol should serialize and parse textdoc evidence bundles through package APIs.",
  );
  const evidenceBundleInspection = textlab.inspectTextProtocolSchemaFamilyEnvelope(parsedEvidenceBundle);
  expect(
    evidenceBundleInspection.family === "evidence-bundle" && evidenceBundleInspection.compatibilityOk,
    "textlab should inspect textdoc evidence-bundle envelopes through package APIs.",
  );
  const mappingLossReport = {
    schemaId: textprotocol.textProtocolMappingLossReportSchemaId,
    schemaVersion: textprotocol.textProtocolSchemaVersion,
    producer: { package: "@ismail-elkorchi/textdoc", version: "0.0.0" },
    payload: mappingLossPayload,
    provenance: { references: [{ kind: "fixture", id: "downstream-api-smoke" }] },
    limitations: ["Downstream API stability mapping-loss smoke."],
  };
  const mappingLossTransport = textprotocol.serializeTextProtocolSchemaFamilyEnvelopeJson(
    mappingLossReport,
    { expectedFamily: "mapping-loss-report", requireProvenance: true, requireLimitations: true },
  );
  const parsedMappingLossReport = textprotocol.parseTextProtocolSchemaFamilyEnvelopeJson(mappingLossTransport);
  expect(
    textprotocol.isTextProtocolMappingLossReportV1(parsedMappingLossReport),
    "textprotocol should serialize and parse textdoc mapping-loss reports through package APIs.",
  );
  const mappingLossInspection = textlab.inspectTextProtocolSchemaFamilyEnvelope(parsedMappingLossReport);
  expect(
    mappingLossInspection.family === "mapping-loss-report" && mappingLossInspection.compatibilityOk,
    "textlab should inspect textdoc mapping-loss report envelopes through package APIs.",
  );
  const invalidSchemaFamilyCheck = textprotocol.checkTextProtocolSchemaFamilyEnvelope(
    {
      schemaId: textprotocol.textProtocolAnnotationBundleSchemaId,
      schemaVersion: textprotocol.textProtocolSchemaVersion,
      producer: { package: "@ismail-elkorchi/textprotocol", version: "0.0.0" },
      payload: { annotations: [] },
      limitations: [""],
    },
    { expectedFamily: "document-bundle", requireLimitations: true },
  );
  expect(
    !invalidSchemaFamilyCheck.ok && invalidSchemaFamilyCheck.diagnostics.length > 0,
    "textprotocol should expose schema-family compatibility diagnostics through package APIs.",
  );
  const protocolErrorFromDiagnostics = textprotocol.createTextProtocolProtocolErrorEnvelopeFromDiagnostics(
    invalidSchemaFamilyCheck.diagnostics,
    {
      producerPackage: "@ismail-elkorchi/textprotocol",
      producerVersion: "0.0.0",
      code: "textprotocol.downstream.schema-family-invalid",
      message: "Downstream schema-family fixture failed compatibility checks.",
      schemaId: textprotocol.textProtocolAnnotationBundleSchemaId,
      path: "/",
      remediation: "Use a registered family and valid payload shape.",
      provenance: { references: [{ kind: "fixture", id: "downstream-api-smoke" }] },
      limitations: ["Downstream API stability protocol-error diagnostic conversion smoke."],
    },
  );
  const protocolErrorTransport = textprotocol.serializeTextProtocolSchemaFamilyEnvelopeJson(
    protocolErrorFromDiagnostics,
    {
      expectedFamily: "protocol-error",
      expectedProducerPackage: "@ismail-elkorchi/textprotocol",
      requireProvenance: true,
      requireLimitations: true,
    },
  );
  const parsedProtocolError = textprotocol.parseTextProtocolSchemaFamilyEnvelopeJson(protocolErrorTransport);
  expect(
    textprotocol.isTextProtocolProtocolErrorV1(parsedProtocolError) &&
      parsedProtocolError.payload.causes?.length === invalidSchemaFamilyCheck.diagnostics.length,
    "textprotocol should convert diagnostics into protocol-error envelopes through package APIs.",
  );
  const protocolErrorInspection = textlab.inspectTextProtocolSchemaFamilyEnvelope(parsedProtocolError);
  expect(
    protocolErrorInspection.family === "protocol-error" && protocolErrorInspection.compatibilityOk,
    "textlab should inspect protocol-error diagnostic envelopes through package APIs.",
  );

  const conformanceReport = textconformance.runTextConformanceChecks(
    [
      {
        checkId: "downstream-api-smoke",
        run: () => ({
          checkId: "downstream-api-smoke",
          status: "pass",
          message: "Built package APIs are importable by downstream smoke checks.",
          evidenceRefs: [ARTIFACT_PATH],
        }),
      },
    ],
    {
      reportId: "downstream-api-stability",
      subject: {
        kind: "package-release-gate",
        id: "downstream-api-stability",
        schemaId: "urn:ismail-elkorchi:package-release:downstream-api-stability:v1",
      },
    },
  );
  expect(textconformance.isTextConformanceReportV1(conformanceReport), "textconformance built API should produce a report.");
  const conformanceSummary = textlab.summarizeConformanceReport(conformanceReport);
  expect(
    conformanceSummary.reportId === "downstream-api-stability" && conformanceSummary.pass === 1,
    "textlab should summarize conformance reports through package APIs.",
  );
  let benchmarkClock = 0;
  const benchmarkReport = await textconformance.runTextConformanceBenchmark({
    benchmarkId: "benchmark:downstream-api-stability",
    subject: {
      kind: "package-release-gate",
      id: "downstream-api-stability",
      schemaId: "urn:ismail-elkorchi:package-release:downstream-api-stability:v1",
    },
    generatedAt: "1970-01-01T00:00:00.000Z",
    iterations: 1,
    clock() {
      const value = benchmarkClock;
      benchmarkClock += 1;
      return value;
    },
    evidenceRefs: [ARTIFACT_PATH],
    limitations: ["Downstream smoke metric only; benchmark report is not conformance."],
    cases: [
      {
        caseId: "downstream-api-smoke",
        run() {
          textconformance.runTextConformanceChecks(
            [
              {
                checkId: "benchmark-smoke",
                run: () => "pass",
              },
            ],
            {
              reportId: "benchmark-smoke",
              subject: { kind: "package-release-gate", id: "downstream-api-stability" },
            },
          );
        },
      },
    ],
  });
  expect(
    textconformance.isTextConformanceBenchmarkReportV1(benchmarkReport),
    "textconformance built API should execute benchmark reports.",
  );
  const benchmarkThresholdPolicy = {
    schemaVersion: textconformance.conformanceBenchmarkThresholdPolicySchemaVersion,
    policyId: "policy:downstream-api-stability",
    benchmarkId: benchmarkReport.benchmarkId,
    subject: benchmarkReport.subject,
    calibratedAt: "1970-01-01T00:00:00.000Z",
    thresholds: [
      {
        metricId: "downstream-api-smoke.duration-ms.mean",
        unit: "ms",
        max: 1,
        evidenceRefs: [ARTIFACT_PATH],
      },
    ],
    evidenceRefs: [ARTIFACT_PATH],
    limitations: ["Downstream smoke threshold only; not a cross-host benchmark calibration."],
  };
  const benchmarkThresholdEvaluation = textconformance.evaluateTextConformanceBenchmarkThresholds(
    benchmarkReport,
    benchmarkThresholdPolicy,
  );
  expect(
    textconformance.isTextConformanceBenchmarkThresholdEvaluationReportV1(benchmarkThresholdEvaluation) &&
      benchmarkThresholdEvaluation.summary.pass === 1,
    "textconformance built API should evaluate benchmark threshold policies.",
  );
  const benchmarkInspection = textlab.inspectTextConformanceBenchmarkReport(benchmarkReport);
  expect(
    benchmarkInspection.metricCount === 4 &&
      benchmarkInspection.metrics.some(
        (metric) => metric.metricId === "downstream-api-smoke.duration-ms.mean" && metric.preference === "lower",
      ),
    "textlab should inspect textconformance benchmark reports through package APIs.",
  );

  const pipelineRun = textpipeline.runTextPipeline(document, [
    {
      descriptor: {
        id: "identity",
        version: "1.0.0",
        purity: "pure",
        parallelSafe: true,
      },
      run(inputDocument) {
        return { document: inputDocument };
      },
    },
  ]);
  expect(textdoc.isTextDocDocumentV1(pipelineRun.document), "textpipeline should preserve the textdoc document contract.");
  expect(textpipeline.isTextPipelineTraceV1(pipelineRun.trace), "textpipeline should emit a valid trace.");
  const traceInspection = textlab.inspectTextPipelineTrace(pipelineRun.trace);
  expect(traceInspection.entryCount === 1, "textlab should inspect textpipeline traces through package APIs.");
  let snapshotProcessorRuns = 0;
  const snapshotProcessor = {
    descriptor: {
      id: "snapshot-cache-smoke",
      version: "1.0.0",
      purity: "pure",
      parallelSafe: true,
    },
    run(inputDocument) {
      snapshotProcessorRuns += 1;
      return { document: { ...inputDocument, revision: `${inputDocument.revision}>snapshot-cache-smoke` } };
    },
  };
  const snapshotCache = textpipeline.createTextPipelineSnapshotBackedDocumentCache(undefined, {
    namespace: "downstream-api",
  });
  await textpipeline.runTextPipelineAsync(document, [snapshotProcessor], {}, {
    cache: snapshotCache,
    cacheNamespace: "downstream-api",
  });
  const cacheSnapshot = textpipeline.parseTextPipelineCacheSnapshot(
    textpipeline.stringifyTextPipelineCacheSnapshot(snapshotCache.snapshot()),
  );
  expect(
    textpipeline.isTextPipelineCacheSnapshotV1(cacheSnapshot) && cacheSnapshot.entryCount === 1,
    "textpipeline should serialize caller-managed cache snapshots through package APIs.",
  );
  const restoredSnapshotCache = textpipeline.createTextPipelineSnapshotBackedDocumentCache(cacheSnapshot, {
    namespace: "downstream-api",
  });
  const restoredSnapshotRun = await textpipeline.runTextPipelineAsync(document, [snapshotProcessor], {}, {
    cache: restoredSnapshotCache,
    cacheNamespace: "downstream-api",
  });
  expect(
    restoredSnapshotRun.trace.entries[0]?.status === "cached" && snapshotProcessorRuns === 1,
    "textpipeline should restore snapshot-backed cache entries through package APIs.",
  );
  const processorTraceEnvelope = textpipeline.createTextPipelineProcessorTraceEnvelopeV1(
    pipelineRun.trace,
    "0.1.0",
    {
      provenance: { references: [{ kind: "fixture", id: "downstream-api-smoke" }] },
      limitations: ["Downstream API stability processor-trace smoke."],
    },
  );
  expect(
    textpipeline.isTextPipelineProcessorTraceEnvelopeV1(processorTraceEnvelope) &&
      textprotocol.isTextProtocolProcessorTraceV1(processorTraceEnvelope),
    "textpipeline should wrap processor traces in registered textprotocol schema-family envelopes.",
  );
  const processorTraceTransport = textprotocol.serializeTextProtocolSchemaFamilyEnvelopeJson(
    processorTraceEnvelope,
    {
      expectedFamily: "processor-trace",
      expectedProducerPackage: "@ismail-elkorchi/textpipeline",
      requireProvenance: true,
      requireLimitations: true,
    },
  );
  const parsedProcessorTrace = textprotocol.parseTextProtocolSchemaFamilyEnvelopeJson(processorTraceTransport);
  const processorTraceInspection = textlab.inspectTextProtocolSchemaFamilyEnvelope(parsedProcessorTrace);
  expect(
    textprotocol.isTextProtocolProcessorTraceV1(parsedProcessorTrace) &&
      processorTraceInspection.family === "processor-trace" &&
      processorTraceInspection.compatibilityOk,
    "textprotocol and textlab should round-trip and inspect processor-trace schema-family envelopes.",
  );
  const batchReport = textpipeline.createTextPipelineBatchRunReport([pipelineRun]);
  expect(textpipeline.isTextPipelineBatchRunReportV1(batchReport), "textpipeline should validate batch reports through package APIs.");
  const batchReportEnvelope = textpipeline.createTextPipelineBatchRunReportEnvelope(
    batchReport,
    "0.1.0",
    {
      scopeBoundary: "Downstream API stability batch report smoke.",
      limitations: ["The smoke verifies built package exchange shape."],
    },
  );
  expect(
    textpipeline.isTextPipelineBatchRunReportEnvelopeV1(batchReportEnvelope) &&
      textprotocol.isTextProtocolResultEnvelopeForPayloadKind(
        batchReportEnvelope,
        textprotocol.textProtocolPayloadKindTextpipelineBatchRunReportV1,
      ),
    "textpipeline should wrap batch reports in registered textprotocol envelopes.",
  );
  const batchReportInspection = textlab.inspectTextPipelineBatchReport(batchReport);
  expect(
    batchReportInspection.documentCount === 1 && batchReportInspection.completeCount === 1,
    "textlab should inspect textpipeline batch reports through package APIs.",
  );
  const envelopeInspection = textlab.inspectTextProtocolResultEnvelope(batchReportEnvelope);
  expect(
    envelopeInspection.registeredPayloadKind &&
      envelopeInspection.payloadKind === textprotocol.textProtocolPayloadKindTextpipelineBatchRunReportV1,
    "textlab should inspect textprotocol result envelopes through package APIs.",
  );

  const collection = textcorpus.createTextCorpusCollection(
    [
      {
        id: "doc-a",
        document,
        viewId: "source-view",
        tokenLayerId: "tokens",
        metadata: {
          title: "Alice works",
        },
      },
    ],
    { corpusId: "corpus:downstream-api" },
  );
  expect(textcorpus.isTextCorpusCollectionV1(collection), "textcorpus should consume textdoc documents through package APIs.");
  const corpusFrequency = textcorpus.computeTextCorpusFrequencies(collection);
  const corpusMetricPayload = textcorpus.exportTextCorpusMetricEnvelopePayloadV1(corpusFrequency, {
    metricSetId: "metrics:downstream-api-frequency",
  });
  expect(
    textcorpus.isTextCorpusMetricEnvelopePayloadV1(corpusMetricPayload),
    "textcorpus should export corpus metric payloads through package APIs.",
  );
  const corpusArtifactInspection = textlab.inspectTextCorpusArtifact(corpusFrequency);
  expect(
    corpusArtifactInspection.artifactKind === "frequency" && corpusArtifactInspection.rowCount > 0,
    "textlab should inspect textcorpus persisted artifacts through package APIs.",
  );
  const corpusArtifactPagedInspection = textlab.inspectTextCorpusArtifact(corpusFrequency, { offset: 0, limit: 1 });
  expect(
    corpusArtifactPagedInspection.pageOffset === 0 &&
      corpusArtifactPagedInspection.pageLimit === 1 &&
      corpusArtifactPagedInspection.pageRowCount === 1 &&
      corpusArtifactPagedInspection.pageRows.length === 1,
    "textlab should inspect bounded textcorpus artifact pages through package APIs.",
  );
  const corpusMetricPayloadInspection = textlab.inspectTextCorpusArtifact(corpusMetricPayload);
  expect(
    corpusMetricPayloadInspection.metricSetId === "metrics:downstream-api-frequency" &&
      corpusMetricPayloadInspection.metricCount > 0,
    "textlab should inspect textcorpus metric-envelope payloads through package APIs.",
  );
  const retrievalIndex = textcorpus.buildTextCorpusRetrievalIndex(collection);
  const retrievalIndexArtifact = textcorpus.createTextCorpusRetrievalIndexArtifact(retrievalIndex);
  const retrievalIndexStore = new Map();
  const retrievalIndexStorageRef = await textcorpus.saveTextCorpusRetrievalIndexArtifactToFileSystem(
    retrievalIndexArtifact,
    {
      root: "memory://downstream-api",
      writeText(filePath, text) {
        retrievalIndexStore.set(filePath, text);
      },
    },
  );
  expect(
    textcorpus.isTextCorpusRetrievalIndexStorageRefV1(retrievalIndexStorageRef),
    "textcorpus should create retrieval-index storage refs through package APIs.",
  );
  const expectedRetrievalIndexPath = textcorpus.resolveTextCorpusRetrievalIndexFileSystemPath(
    "memory://downstream-api",
    textcorpus.createTextCorpusRetrievalIndexFileSystemKey(retrievalIndexArtifact),
  );
  expect(
    retrievalIndexStore.has(expectedRetrievalIndexPath),
    "textcorpus should persist retrieval-index artifacts through package-owned filesystem keys.",
  );
  const loadedRetrievalIndexArtifact = await textcorpus.loadTextCorpusRetrievalIndexArtifactFromFileSystem(
    retrievalIndexStorageRef,
    {
      root: "memory://downstream-api",
      readText(filePath) {
        return retrievalIndexStore.get(filePath) ?? "";
      },
    },
  );
  expect(
    JSON.stringify(loadedRetrievalIndexArtifact) === JSON.stringify(retrievalIndexArtifact),
    "textcorpus should load retrieval-index artifacts through storage refs.",
  );
  const retrievalIndexStorageInspection = textlab.inspectTextCorpusArtifact(retrievalIndexStorageRef);
  expect(
    retrievalIndexStorageInspection.artifactKind === "retrieval-index-storage-ref" &&
      retrievalIndexStorageInspection.byteLength === retrievalIndexStorageRef.byteLength,
    "textlab should inspect textcorpus retrieval-index storage refs through package APIs.",
  );
  const fieldedRetrievalIndex = textcorpus.buildTextCorpusRetrievalIndex(collection, {
    formula: textcorpus.textCorpusBm25fFormula,
    fields: [
      { id: "title", source: "metadata", weight: 2, b: 0.25 },
      { id: "body", source: "tokens", weight: 1, b: 0.75 },
    ],
  });
  const fieldWeightProfile = textcorpus.createTextCorpusRetrievalFieldWeightProfile({
    profileId: "downstream-api:title-boost",
    fields: {
      title: 2,
      body: 1,
    },
  });
  const fieldedRetrieval = textcorpus.searchTextCorpusRetrievalIndex(
    fieldedRetrievalIndex,
    [textcorpus.parseTextCorpusQuery("title:alice", { id: "downstream-api-title" })],
    { fieldWeightProfile },
  );
  expect(
    textcorpus.isTextCorpusRetrievalFieldWeightProfileV1(fieldWeightProfile) &&
      textcorpus.isTextCorpusRetrievalResultV1(fieldedRetrieval) &&
      fieldedRetrieval.fieldWeightProfile?.profileId === "downstream-api:title-boost",
    "textcorpus should apply and disclose BM25F field-weight profiles through package APIs.",
    fieldedRetrieval,
  );
  const corpusMetricEnvelope = {
    schemaId: textprotocol.textProtocolCorpusMetricEnvelopeSchemaId,
    schemaVersion: textprotocol.textProtocolSchemaVersion,
    producer: { package: "@ismail-elkorchi/textcorpus", version: "0.1.0" },
    payload: corpusMetricPayload,
    provenance: { references: [{ kind: "fixture", id: "downstream-api-smoke" }] },
    limitations: ["Downstream API stability corpus metric smoke."],
  };
  const corpusMetricTransport = textprotocol.serializeTextProtocolSchemaFamilyEnvelopeJson(
    corpusMetricEnvelope,
    { expectedFamily: "corpus-metric-envelope", requireProvenance: true, requireLimitations: true },
  );
  const parsedCorpusMetricEnvelope = textprotocol.parseTextProtocolSchemaFamilyEnvelopeJson(corpusMetricTransport);
  expect(
    textprotocol.isTextProtocolCorpusMetricEnvelopeV1(parsedCorpusMetricEnvelope),
    "textprotocol should serialize and parse textcorpus metric envelopes through package APIs.",
  );
  const corpusMetricInspection = textlab.inspectTextProtocolSchemaFamilyEnvelope(parsedCorpusMetricEnvelope);
  expect(
    corpusMetricInspection.family === "corpus-metric-envelope" && corpusMetricInspection.compatibilityOk,
    "textlab should inspect textcorpus metric envelopes through package APIs.",
  );
  const inspection = textlab.inspectTextdocAnnotations(document);
  expect(inspection.layerCount === 1, "textlab should inspect textdoc documents through package APIs.");

  const manifest = {
    manifestVersion: "1.0.0",
    id: "pack:downstream-api",
    packageName: "@ismail-elkorchi/textpack-downstream-api",
    version: "0.1.0",
    kind: ["language"],
    targets: { languages: ["en"], scripts: ["Latn"] },
    engines: { "@ismail-elkorchi/textpack": "^0.1.0" },
    externalData: { unicode: "17.0.0" },
    capabilities: { lexicons: true },
    resources: { lexicons: ["resources/lexicon.tsv"] },
    provides: { lexicons: ["lexicon-downstream-api"] },
    entrypoints: { manifest: "pack.manifest.json" },
    licenses: { code: ["MIT"], data: ["CC0-1.0"] },
    provenance: { sources: ["repo:tools/check-downstream-api-stability.mjs"], generated: false },
    tests: {
      smoke: ["resources/lexicon.tsv"],
      negative: ["negative:no-hidden-canonicalizer"],
      representative: ["representative:alice"],
    },
    reviewState: "experimental",
    composition: { overlayPrecedence: 1 },
    limitations: ["Downstream API stability fixture; not a broad English resource pack."],
  };
  expect(textpack.isTextPackManifestV1(manifest), "textpack built API should validate a manifest.");
  const packManifestValidationOptions = {
    expectedFamily: "pack-manifest",
    expectedProducerPackage: "@ismail-elkorchi/textpack",
    requireProvenance: true,
    requireLimitations: true,
    externallyValidatedFamilies: ["pack-manifest"],
  };
  const packManifestEnvelope = {
    schemaId: textprotocol.textProtocolPackManifestSchemaId,
    schemaVersion: textprotocol.textProtocolSchemaVersion,
    producer: { package: "@ismail-elkorchi/textpack", version: "0.1.0" },
    payload: manifest,
    provenance: { references: [{ kind: "fixture", id: "downstream-api-smoke" }] },
    limitations: ["Downstream API stability pack-manifest smoke."],
  };
  const packManifestCompatibility = textprotocol.checkTextProtocolSchemaFamilyEnvelope(
    packManifestEnvelope,
    packManifestValidationOptions,
  );
  expect(
    packManifestCompatibility.ok && packManifestCompatibility.family === "pack-manifest",
    "textprotocol should accept externally validated textpack manifest envelopes through package APIs.",
  );
  const packManifestTransport = textprotocol.serializeTextProtocolSchemaFamilyEnvelopeJson(
    packManifestEnvelope,
    packManifestValidationOptions,
  );
  const parsedPackManifestEnvelope = textprotocol.parseTextProtocolSchemaFamilyEnvelopeJson(
    packManifestTransport,
    packManifestValidationOptions,
  );
  expect(
    textpack.isTextPackManifestV1(parsedPackManifestEnvelope.payload),
    "textprotocol should serialize and parse textpack manifest envelopes through package APIs.",
  );
  const packManifestInspection = textlab.inspectTextProtocolSchemaFamilyEnvelope(
    parsedPackManifestEnvelope,
    packManifestValidationOptions,
  );
  expect(
    packManifestInspection.family === "pack-manifest" && packManifestInspection.compatibilityOk,
    "textlab should inspect externally validated textpack manifest envelopes through package APIs.",
  );
  const packReviewReport = textpack.createTextPackReviewReport(manifest, {
    targetReviewState: "candidate",
    inventoryResourcePaths: ["resources/lexicon.tsv"],
    packageVersions: { "@ismail-elkorchi/textpack": "0.1.0" },
    mandatoryResources: ["lexicon-downstream-api"],
    requireCompatibility: true,
  });
  expect(
    textpack.isTextPackReviewReportV1(packReviewReport) && packReviewReport.ok,
    "textpack built API should create an accepted pack review report.",
    packReviewReport,
  );
  const packReviewInspection = textlab.inspectTextPackReviewReport(packReviewReport);
  expect(
    packReviewInspection.ok && packReviewInspection.transition === "promote",
    "textlab should inspect textpack review reports through package APIs.",
    packReviewInspection,
  );

  const loadedPack = textpack.loadTextPackResources(
    [manifest],
    { kind: "lexicon", language: "en" },
    { "resources/lexicon.tsv": "Alice\tpos=PROPN\tlemma=Alice\n" },
  );
  expect(loadedPack.diagnostics.length === 0, "textpack built API should load smoke lexicon resources.");

  const lexiconResources = textrules.createTextRulesLexiconResourcesFromLoadedPack(loadedPack.resources);
  expect(lexiconResources.diagnostics.length === 0, "textrules should consume loaded textpack resources.");
  expect(lexiconResources.resources.length === 1, "textrules should expose one loaded lexicon resource.");
  const compiledRules = textrules.compileTextRulesFromTextPackResources(loadedPack.resources);
  expect(compiledRules.diagnostics.length === 0, "textrules should compile loaded textpack resources.");
  const packRuleRun = textrules.runTextPackRulesOverTextDoc({ document, compiled: compiledRules.compiled });
  const packRuleInspection = textlab.inspectPackBackedRuleAnnotations(packRuleRun.document);
  expect(packRuleInspection.ruleAnnotationCount === 1, "textlab should inspect pack-backed textrules annotations through package APIs.");
  const posRun = textrules.analyzePosMorphLemmaDocument(
    { document, languageHint: "en" },
    lexiconResources.resources,
  );
  const posEnvelope = textrules.createPosMorphLemmaResultEnvelope(posRun, {
    producerVersion: "0.1.0",
    referenceId: "downstream-api-pos",
  });
  const posReport = textrules.createPosMorphLemmaConformanceReport(posEnvelope, {
    expectedArtifactPath: "tools/check-downstream-api-stability.mjs#textrules-corpus-evaluation",
    matchesExpected: true,
  });
  const corpusEvaluation = textrules.createTextRulesCorpusEvaluationReport({
    evaluationId: "downstream-api:textrules-corpus-evaluation",
    inputs: [
      {
        taskKind: "pos-morph-lemma",
        sliceId: "downstream-api-pos",
        role: "evaluation",
        report: posReport,
        expectedArtifactPath: "tools/check-downstream-api-stability.mjs#textrules-corpus-evaluation",
      },
    ],
    limitations: ["Downstream API smoke exercises corpus evaluation report aggregation."],
  });
  expect(
    textrules.isTextRulesCorpusEvaluationReportV1(corpusEvaluation) &&
      corpusEvaluation.passCount === 1,
    "textrules built API should aggregate corpus evaluation reports through package APIs.",
    corpusEvaluation,
  );
}

const [schema, artifact, releaseGates] = await Promise.all([
  readJson(SCHEMA_PATH),
  readJson(ARTIFACT_PATH),
  readJson(RELEASE_GATES_PATH),
]);
const ajv = new Ajv({ allErrors: true, strict: false });
const validate = ajv.compile(schema);
expect(validate(artifact), `${ARTIFACT_PATH} failed ${SCHEMA_PATH}`, validate.errors);

const packageJsons = await workspacePackageJsons();
const downstream = downstreamByPackage(packageJsons);
const expectedProvenPackageNames = releaseGates.packages
  .filter(
    (entry) =>
      entry.downstreamApiStability?.requiredBeforeRelease === true &&
      entry.downstreamApiStability?.status === "validated",
  )
  .map((entry) => entry.packageName)
  .sort();
const declaredPackageNames = artifact.packages.map((entry) => entry.packageName).sort();
expect(
  JSON.stringify(declaredPackageNames) === JSON.stringify(expectedProvenPackageNames),
  "downstream API artifact must cover exactly the release-gate validated package set.",
  { expected: expectedProvenPackageNames, actual: declaredPackageNames },
);

for (const entry of artifact.packages) {
  const expectedDependents = downstream.get(entry.packageName) ?? [];
  const actualDependents = entry.dependents.map((dependent) => dependent.packageName).sort();
  expect(
    JSON.stringify(actualDependents) === JSON.stringify(expectedDependents),
    `${entry.packageName} downstream dependent list must match workspace package dependencies.`,
    { expected: expectedDependents, actual: actualDependents },
  );
  for (const ref of entry.evidenceRefs) {
    assertRepoRef(ref, `${entry.packageName} evidenceRefs`);
    expect(await fileExists(ref), `${entry.packageName} evidence ref does not exist: ${ref}`);
  }
  await assertDeclaredImports(entry);
}

await assertBuiltPackageSmoke();

console.log(`Downstream API stability OK (packages=${artifact.packages.length}).`);
