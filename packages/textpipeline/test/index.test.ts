import type { TextDocDocumentV1, TextDocLayer, TextDocView } from "@ismail-elkorchi/textdoc";
import { isTextProtocolResultEnvelopeV1 } from "@ismail-elkorchi/textprotocol";
import {
  isTextPipelineProcessorDescriptor,
  isTextPipelineTraceV1,
  packageName,
  runTextPipeline,
  textPipelineTracePayloadKind,
  textPipelineTraceSchemaVersion,
  type TextPipelineProcessor,
} from "../src/index.ts";

const expectedPackageName: typeof packageName = "@ismail-elkorchi/textpipeline";
const expectedPayloadKind: typeof textPipelineTracePayloadKind = "textpipeline-trace";
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
      kind: "analysis",
      derivedFrom: ["source-view"],
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

void expectedPackageName;
void expectedPayloadKind;
void expectedTraceSchemaVersion;
