import type {
  TextDocDocumentV1,
  TextDocLayer,
  TextDocSpanMapV1,
  TextDocView,
} from "@ismail-elkorchi/textdoc";
import { isTextProtocolResultEnvelopeV1 } from "@ismail-elkorchi/textprotocol";
import {
  isTextPipelineProcessorDescriptor,
  isTextPipelineTraceV1,
  packageName,
  runTextPipeline,
  runTextPipelineAsync,
  runTextPipelineBatch,
  runTextPipelineBatchAsync,
  runTextPipelineStream,
  textPipelineTracePayloadKind,
  textPipelineTraceSchemaVersion,
  type TextPipelineAsyncProcessor,
  type TextPipelineProcessor,
} from "../src/index.ts";

const expectedPackageName: typeof packageName = "@ismail-elkorchi/textpipeline";
const expectedPayloadKind: typeof textPipelineTracePayloadKind = "textpipeline-trace-v1";
const expectedTraceSchemaVersion: typeof textPipelineTraceSchemaVersion = 1;

const baseDocument: TextDocDocumentV1 = {
  schemaVersion: 1,
  documentId: "doc:pipeline",
  revision: "r0",
  textLengthCU: 5,
  text: "hello",
  units: {
    text: "utf16-code-unit",
  },
  views: [
    {
      id: "source-view",
      kind: "raw",
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

function appendAnalysisArtifacts(
  document: TextDocDocumentV1,
  revision: string,
  viewId: string,
  layerId: string,
  kind: TextDocLayer["kind"],
): TextDocDocumentV1 {
  const views: readonly TextDocView[] = [
    ...document.views,
    {
      id: viewId,
      kind: "task",
      parentViewId: "source-view",
      spanMapIds: [`span-map-source-to-${viewId}`],
    },
  ];
  const spanMaps: readonly TextDocSpanMapV1[] = [
    ...(document.spanMaps ?? []),
    {
      id: `span-map-source-to-${viewId}`,
      sourceViewId: "source-view",
      targetViewId: viewId,
      lifecycle: { state: "active" },
      segments:
        document.textLengthCU === 0
          ? []
          : [
              {
                source: { startCU: 0, endCU: document.textLengthCU },
                target: { startCU: 0, endCU: document.textLengthCU },
                kind: "unchanged",
                reversible: true,
              },
            ],
    },
  ];
  const layers: readonly TextDocLayer[] = [
    ...document.layers,
    {
      id: layerId,
      kind,
      viewId,
      annotations: [],
    },
  ];

  return {
    ...document,
    revision,
    views,
    spanMaps,
    layers,
  };
}

function createProcessor(
  id: string,
  options: {
    readonly dependsOn?: readonly string[];
    readonly requires?: {
      readonly views?: readonly string[];
      readonly layers?: readonly string[];
      readonly packs?: readonly string[];
      readonly profiles?: readonly string[];
    };
    readonly emits?: {
      readonly views?: readonly string[];
      readonly layers?: readonly string[];
    };
    readonly apply?: (document: TextDocDocumentV1) => TextDocDocumentV1;
  } = {},
): TextPipelineProcessor {
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
        document:
          options.apply?.(document) ??
          appendAnalysisArtifacts(document, `${document.revision}>${id}`, `${id}-view`, `${id}-layer`, "lemma"),
      };
    },
  };
}

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

if (!isTextPipelineProcessorDescriptor(alpha.descriptor)) {
  throw new Error("processor descriptor should satisfy the runtime contract");
}

const deterministicRun = runTextPipeline(baseDocument, [beta, gamma, alpha]);

if (deterministicRun.trace.schemaVersion !== textPipelineTraceSchemaVersion) {
  throw new Error("trace should use the textpipeline trace schema version");
}

if (
  deterministicRun.trace.entries.map((entry) => entry.processorId).join(",") !== "alpha,beta,gamma"
) {
  throw new Error("processors should execute in stable lexical order when equally ready");
}

if (deterministicRun.document.revision !== "r0>alpha>beta>gamma") {
  throw new Error("pipeline should update the final revision in execution order");
}

const gammaTrace = deterministicRun.trace.entries[2];

if (
  !gammaTrace ||
  gammaTrace.status !== "applied" ||
  gammaTrace.inputRevision !== "r0>alpha>beta" ||
  gammaTrace.outputRevision !== "r0>alpha>beta>gamma"
) {
  throw new Error("trace entries should capture deterministic input and output revisions");
}

if (gammaTrace.emittedViews.join(",") !== "gamma-view") {
  throw new Error("trace should record emitted view ids");
}

if (gammaTrace.emittedLayers.join(",") !== "gamma-layer") {
  throw new Error("trace should record emitted layer ids");
}

if (!isTextPipelineTraceV1(deterministicRun.trace)) {
  throw new Error("pipeline trace should satisfy the runtime contract");
}

const serializedEnvelope = {
  schemaId: "urn:ismail-elkorchi:textprotocol:result-envelope:v1",
  schemaVersion: 1,
  producer: {
    package: packageName,
    version: "0.0.0",
  },
  payloadKind: textPipelineTracePayloadKind,
  payload: deterministicRun.trace,
};

if (!isTextProtocolResultEnvelopeV1(serializedEnvelope)) {
  throw new Error("trace envelope should satisfy the textprotocol result envelope contract");
}

if (!isTextPipelineTraceV1(serializedEnvelope.payload)) {
  throw new Error("trace payload should remain valid inside the textprotocol result envelope");
}

const skippedRun = runTextPipeline(baseDocument, [
  createProcessor("needs-analysis", {
    requires: {
      views: ["analysis-view"],
      packs: ["pack:core"],
      profiles: ["profile:default"],
    },
  }),
]);

const skippedEntry = skippedRun.trace.entries[0];

if (
  !skippedEntry ||
  skippedEntry.status !== "skipped" ||
  skippedEntry.outputRevision !== baseDocument.revision
) {
  throw new Error("missing requirements should skip the processor without changing the document");
}

if (
  skippedEntry.diagnostics?.map((diagnostic) => diagnostic.code).join(",") !==
  "textpipeline.missing-view,textpipeline.missing-pack,textpipeline.missing-profile"
) {
  throw new Error("skipped processors should emit deterministic missing-requirement diagnostics");
}

let missingDependencyRejected = false;
try {
  runTextPipeline(baseDocument, [
    createProcessor("orphan", {
      dependsOn: ["missing"],
    }),
  ]);
} catch (error) {
  missingDependencyRejected =
    error instanceof Error &&
    error.message === "processor orphan depends on missing processor missing";
}

if (!missingDependencyRejected) {
  throw new Error("missing processor dependencies should be rejected");
}

let cycleRejected = false;
try {
  runTextPipeline(baseDocument, [
    createProcessor("left", { dependsOn: ["right"] }),
    createProcessor("right", { dependsOn: ["left"] }),
  ]);
} catch (error) {
  cycleRejected = error instanceof Error && error.message === "processor dependency graph contains a cycle";
}

if (!cycleRejected) {
  throw new Error("cyclic dependency graphs should be rejected");
}

let undeclaredOutputRejected = false;
try {
  runTextPipeline(baseDocument, [
    createProcessor("mismatch", {
      emits: {
        views: ["declared-view"],
        layers: ["declared-layer"],
      },
      apply(document) {
        return appendAnalysisArtifacts(
          document,
          `${document.revision}>mismatch`,
          "actual-view",
          "actual-layer",
          "sentence",
        );
      },
    }),
  ]);
} catch (error) {
  undeclaredOutputRejected =
    error instanceof Error && error.message === "processor mismatch emitted undeclared view ids";
}

if (!undeclaredOutputRejected) {
  throw new Error("processors should not emit undeclared view ids");
}

const asyncAlpha: TextPipelineAsyncProcessor = createProcessor("async-alpha", {
  emits: {
    views: ["async-alpha-view"],
    layers: ["async-alpha-layer"],
  },
  apply(document) {
    return appendAnalysisArtifacts(
      document,
      `${document.revision}>async-alpha`,
      "async-alpha-view",
      "async-alpha-layer",
      "lemma",
    );
  },
});

const asyncRun = await runTextPipelineAsync(baseDocument, [asyncAlpha]);
if (
  asyncRun.trace.entries[0]?.status !== "applied" ||
  asyncRun.document.revision !== "r0>async-alpha"
) {
  throw new Error("async pipeline execution should preserve applied trace semantics");
}

const cacheStore = new Map<string, TextDocDocumentV1>();
const cache = {
  get(key: string): TextDocDocumentV1 | undefined {
    return cacheStore.get(key);
  },
  set(key: string, document: TextDocDocumentV1): void {
    cacheStore.set(key, document);
  },
};
let cachedProcessorRuns = 0;
const cachedProcessor: TextPipelineAsyncProcessor = {
  descriptor: {
    id: "cached",
    version: "1.0.0",
    emits: {
      views: ["cached-view"],
      layers: ["cached-layer"],
    },
    purity: "pure",
    parallelSafe: true,
  },
  run(document) {
    cachedProcessorRuns += 1;
    return {
      document: appendAnalysisArtifacts(
        document,
        `${document.revision}>cached`,
        "cached-view",
        "cached-layer",
        "lemma",
      ),
    };
  },
};

const firstCachedRun = await runTextPipelineAsync(baseDocument, [cachedProcessor], {}, { cache });
const secondCachedRun = await runTextPipelineAsync(baseDocument, [cachedProcessor], {}, { cache });
if (
  firstCachedRun.trace.entries[0]?.status !== "applied" ||
  secondCachedRun.trace.entries[0]?.status !== "cached" ||
  cachedProcessorRuns !== 1
) {
  throw new Error("async pipeline cache should replay cached documents with explicit trace status");
}

const contextCachedRun = await runTextPipelineAsync(
  baseDocument,
  [cachedProcessor],
  { profiles: ["profile:other"] },
  { cache },
);
if (contextCachedRun.trace.entries[0]?.status !== "applied" || cacheStore.size !== 2) {
  throw new Error("pipeline cache keys should include context profiles and packs");
}

const batchRun = runTextPipelineBatch([baseDocument, { ...baseDocument, documentId: "doc:pipeline:2" }], [alpha]);
if (batchRun.map((entry) => entry.document.revision).join(",") !== "r0>alpha,r0>alpha") {
  throw new Error("batch execution should run documents deterministically in input order");
}

const asyncBatchRun = await runTextPipelineBatchAsync(
  [baseDocument, { ...baseDocument, documentId: "doc:pipeline:3" }],
  [asyncAlpha],
);
if (asyncBatchRun.map((entry) => entry.document.documentId).join(",") !== "doc:pipeline,doc:pipeline:3") {
  throw new Error("async batch execution should preserve document order");
}

const streamedDocumentIds: string[] = [];
for await (const run of runTextPipelineStream([baseDocument], [asyncAlpha])) {
  streamedDocumentIds.push(run.document.documentId);
}
if (streamedDocumentIds.join(",") !== "doc:pipeline") {
  throw new Error("stream execution should yield runs in input order");
}

const failureRun = await runTextPipelineAsync(
  baseDocument,
  [
    {
      descriptor: {
        id: "fails",
        version: "1.0.0",
        purity: "pure",
        parallelSafe: true,
      },
      run() {
        throw new Error("fixture failure");
      },
    },
  ],
  {},
  { errorPolicy: "continue" },
);
if (
  failureRun.trace.entries[0]?.status !== "failed" ||
  failureRun.trace.entries[0].diagnostics?.[0]?.code !== "textpipeline.processor-error" ||
  failureRun.document.revision !== baseDocument.revision
) {
  throw new Error("continue error policy should record failed processors without changing the document");
}

const abortController = new AbortController();
abortController.abort();
let abortedRunRejected = false;
try {
  await runTextPipelineAsync(baseDocument, [asyncAlpha], {}, { signal: abortController.signal });
} catch (error) {
  abortedRunRejected = error instanceof Error && error.message === "textpipeline run aborted";
}

if (!abortedRunRejected) {
  throw new Error("aborted async pipeline runs should reject deterministically");
}

void expectedPackageName;
void expectedPayloadKind;
void expectedTraceSchemaVersion;
