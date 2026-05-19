import { readFile } from "node:fs/promises";
import {
  exportTextDocDocumentV1ToConllu,
  importConlluToTextDocDocumentV1,
  isTextDocDocumentV1,
  TextDocConlluError,
} from "@ismail-elkorchi/textdoc";
import {
  isTextProtocolResultEnvelopeV1,
  resultEnvelopeSchemaId,
  resultEnvelopeSchemaVersion,
} from "@ismail-elkorchi/textprotocol";
import {
  isTextPackManifestV1,
  resolveTextPackResources,
  textPackDemoTrimLowercaseCanonicalizer,
  textPackManifestSchemaVersion,
} from "@ismail-elkorchi/textpack";
import { isTextPipelineTraceV1, runTextPipeline } from "@ismail-elkorchi/textpipeline";
import {
  conformanceReportSchemaId,
  conformanceReportSchemaVersion,
  isTextConformanceReportV1,
  runTextConformanceChecks,
} from "@ismail-elkorchi/textconformance";

function assert(condition, message, details) {
  if (condition) return;
  console.error(message);
  if (details !== undefined) console.error(JSON.stringify(details, null, 2));
  process.exit(1);
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function createBaseDocument(seed) {
  return {
    schemaVersion: 1,
    documentId: `doc:fuzz:${seed}`,
    revision: "r0",
    textLengthCU: 5,
    text: "hello",
    units: {
      text: "utf16-code-unit",
    },
    views: [
      {
        id: "source-view",
        kind: "source",
      },
    ],
    layers: [
      {
        id: "tokens",
        kind: "token",
        viewId: "source-view",
        annotations: [],
      },
    ],
  };
}

function appendLayer(document, processorId, layerKind) {
  return {
    ...document,
    revision: `${document.revision}>${processorId}`,
    views: [
      ...document.views,
      {
        id: `${processorId}-view`,
        kind: "analysis",
        derivedFrom: ["source-view"],
      },
    ],
    layers: [
      ...document.layers,
      {
        id: `${processorId}-layer`,
        kind: layerKind,
        viewId: `${processorId}-view`,
        annotations: [],
      },
    ],
  };
}

function createProcessor(id, options = {}) {
  return {
    descriptor: {
      id,
      version: "1.0.0",
      ...(options.dependsOn ? { dependsOn: options.dependsOn } : {}),
      ...(options.requires ? { requires: options.requires } : {}),
      ...(options.emits ? { emits: options.emits } : {}),
      purity: "pure",
      parallelSafe: true,
    },
    run(document) {
      return {
        document: appendLayer(document, id, options.layerKind ?? "lemma"),
      };
    },
  };
}

async function fuzzConlluRoundTrip() {
  const slices = await readJson("fixtures/conllu-dependency/slices.json");

  for (const fixture of slices.fixtures.valid) {
    const text = await readFile(fixture.path, "utf8");
    const document = importConlluToTextDocDocumentV1(text, {
      documentId: `fuzz:${fixture.id}`,
      sourceId: fixture.id,
    });
    assert(isTextDocDocumentV1(document), `${fixture.id} should import to TextDocDocumentV1`);
    const exported = exportTextDocDocumentV1ToConllu(document);
    assert(exported === text.trimEnd(), `${fixture.id} should round-trip through trim-stable export`);
    const secondExport = exportTextDocDocumentV1ToConllu(
      importConlluToTextDocDocumentV1(exported, {
        documentId: `fuzz:${fixture.id}:second`,
        sourceId: fixture.id,
      }),
    );
    assert(secondExport === exported, `${fixture.id} should be idempotent after first export`);
  }

  for (const fixture of slices.fixtures.invalid) {
    const text = await readFile(fixture.path, "utf8");
    let rejected = false;
    try {
      importConlluToTextDocDocumentV1(text, {
        documentId: `fuzz:${fixture.id}`,
        sourceId: fixture.id,
      });
    } catch (error) {
      rejected = error instanceof TextDocConlluError && error.code === fixture.mustFail;
    }
    assert(rejected, `${fixture.id} should reject with ${fixture.mustFail}`);
  }
}

function fuzzTextProtocol() {
  const validEnvelope = {
    schemaId: resultEnvelopeSchemaId,
    schemaVersion: resultEnvelopeSchemaVersion,
    producer: {
      package: "@ismail-elkorchi/textprotocol",
      version: "0.0.0",
    },
    payloadKind: "fuzz",
    payload: {
      seed: 1,
    },
    diagnostics: [
      {
        code: "fuzz.info",
        severity: "info",
      },
    ],
  };
  assert(isTextProtocolResultEnvelopeV1(validEnvelope), "valid envelope should pass");
  assert(
    !isTextProtocolResultEnvelopeV1({ ...validEnvelope, schemaVersion: 2 }),
    "invalid envelope version should fail",
  );
  assert(
    !isTextProtocolResultEnvelopeV1({
      ...validEnvelope,
      diagnostics: [{ code: "fuzz.bad", severity: "fatal" }],
    }),
    "invalid diagnostic severity should fail",
  );
}

function manifest(packId, resourceId, overlayPrecedence, profiles = undefined) {
  return {
    schemaVersion: textPackManifestSchemaVersion,
    packId,
    packageName: `@ismail-elkorchi/${packId.replace("pack:", "textpack-")}`,
    version: "0.0.0",
    resources: [
      {
        resourceId,
        lookupKey: "stopwords.en.core",
        kind: "stopwords",
        path: `fixtures/textpack/resources/${resourceId}.txt`,
        language: "en",
        ...(profiles ? { profiles } : {}),
        overlayPrecedence,
        licenseId: "license-cc0",
        provenanceId: "prov-fuzz",
      },
    ],
    licenses: [
      {
        id: "license-cc0",
        spdx: "CC0-1.0",
      },
    ],
    provenance: [
      {
        id: "prov-fuzz",
        origin: "semantic-fuzz",
      },
    ],
    entrypoints: {
      manifest: "pack.manifest.json",
    },
    tests: {
      smoke: ["smoke"],
      lookup: ["lookup"],
      overlay: ["overlay"],
    },
  };
}

function fuzzTextPack() {
  const base = manifest("pack:en-core", "stopwords-en-core", 10);
  const overlay = manifest("pack:en-legal", "stopwords-en-legal", 50, ["legal"]);
  assert(isTextPackManifestV1(base), "base pack manifest should be valid");
  assert(isTextPackManifestV1(overlay), "overlay pack manifest should be valid");
  const forward = resolveTextPackResources([base, overlay], {
    kind: "stopwords",
    language: "en",
    profile: "legal",
  });
  const reverse = resolveTextPackResources([overlay, base], {
    kind: "stopwords",
    language: "en",
    profile: "legal",
  });
  const mismatchedCase = resolveTextPackResources([base, overlay], {
    kind: "stopwords",
    language: "EN",
    profile: "LEGAL",
  });
  const canonicalizedCase = resolveTextPackResources([base, overlay], {
    kind: "stopwords",
    language: "EN",
    profile: "LEGAL",
    canonicalizer: textPackDemoTrimLowercaseCanonicalizer,
  });
  assert(forward.resources.map((entry) => entry.resourceId).join(",") === "stopwords-en-legal,stopwords-en-core");
  assert(mismatchedCase.resources.length === 0, "resource resolution should be exact by default");
  assert(
    canonicalizedCase.resources.map((entry) => entry.resourceId).join(",") ===
      "stopwords-en-legal,stopwords-en-core",
    "resource resolution should support explicit canonicalization",
  );
  assert(
    forward.resources.map((entry) => entry.resourceId).join(",") ===
      reverse.resources.map((entry) => entry.resourceId).join(","),
    "resource resolution should be deterministic across manifest input order",
  );
}

function fuzzTextPipeline() {
  const alpha = createProcessor("alpha", {
    emits: {
      views: ["alpha-view"],
      layers: ["alpha-layer"],
    },
  });
  const beta = createProcessor("beta", {
    emits: {
      views: ["beta-view"],
      layers: ["beta-layer"],
    },
  });
  const gamma = createProcessor("gamma", {
    dependsOn: ["alpha"],
    requires: {
      views: ["alpha-view"],
    },
    emits: {
      views: ["gamma-view"],
      layers: ["gamma-layer"],
    },
  });
  const first = runTextPipeline(createBaseDocument("a"), [gamma, beta, alpha]);
  const second = runTextPipeline(createBaseDocument("a"), [beta, alpha, gamma]);
  const order = first.trace.entries.map((entry) => entry.processorId).join(",");
  assert(order === "alpha,beta,gamma", "pipeline should preserve deterministic dependency order");
  assert(
    order === second.trace.entries.map((entry) => entry.processorId).join(","),
    "pipeline order should be stable across input order",
  );
  assert(isTextPipelineTraceV1(first.trace), "pipeline trace should be valid");

  const skipped = runTextPipeline(createBaseDocument("missing"), [
    createProcessor("needs-pack", {
      requires: {
        packs: ["pack:missing"],
      },
    }),
  ]);
  assert(skipped.trace.entries[0]?.status === "skipped", "missing pack requirement should skip processor");
}

function fuzzTextConformance() {
  const statuses = ["pass", "fail", "not-run", "pass"];
  const report = runTextConformanceChecks(
    statuses.map((status, index) => ({
      checkId: `fuzz-${index}`,
      run: () => status,
    })),
    {
      reportId: "semantic-fuzz:conformance",
      subject: {
        kind: "semantic-fuzz",
        id: "textconformance",
        schemaId: conformanceReportSchemaId,
      },
      generatedAt: "2026-05-15T00:00:00.000Z",
    },
  );
  assert(report.schemaVersion === conformanceReportSchemaVersion, "report schema version should be stable");
  assert(isTextConformanceReportV1(report), "fuzz conformance report should be valid");
  assert(report.summary.pass === 2 && report.summary.fail === 1 && report.summary.notRun === 1);
}

await fuzzConlluRoundTrip();
fuzzTextProtocol();
fuzzTextPack();
fuzzTextPipeline();
fuzzTextConformance();

console.log("Semantic fuzz signal OK.");
