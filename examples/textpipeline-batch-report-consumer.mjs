#!/usr/bin/env node
import { createTextDocDocumentFromTextSync } from "@ismail-elkorchi/textdoc";
import {
  createTextPipelineBatchRunReportEnvelope,
  runTextPipelineBatchAsyncWithReport,
  runTextPipelineBatchWithReport,
} from "@ismail-elkorchi/textpipeline";

function appendArtifacts(document, revision, viewId, layerId) {
  const spanMapId = `span-map-source-to-${viewId}`;
  return {
    ...document,
    revision,
    views: [
      ...document.views,
      {
        id: viewId,
        kind: "task",
        parentViewId: "source-view",
        spanMapIds: [spanMapId],
      },
    ],
    spanMaps: [
      ...(document.spanMaps ?? []),
      {
        id: spanMapId,
        sourceViewId: "source-view",
        targetViewId: viewId,
        lifecycle: { state: "active" },
        segments: [
          {
            source: { startCU: 0, endCU: document.textLengthCU },
            target: { startCU: 0, endCU: document.textLengthCU },
            kind: "unchanged",
            reversible: true,
          },
        ],
      },
    ],
    layers: [
      ...document.layers,
      {
        id: layerId,
        kind: "extension",
        viewId,
        annotations: [],
      },
    ],
  };
}

function processor(id, options = {}) {
  return {
    descriptor: {
      id,
      version: "1.0.0",
      ...(options.dependsOn === undefined ? {} : { dependsOn: options.dependsOn }),
      ...(options.requires === undefined ? {} : { requires: options.requires }),
      emits: {
        views: [`${id}-view`],
        layers: [`${id}-layer`],
      },
      purity: "pure",
      parallelSafe: true,
    },
    run(document) {
      if (options.fail === true) throw new Error(`${id} failed`);
      return {
        document: appendArtifacts(
          document,
          `${document.revision}>${id}`,
          `${id}-view`,
          `${id}-layer`,
        ),
      };
    },
  };
}

const documents = [
  createTextDocDocumentFromTextSync("Alpha document.", {
    documentId: "example:textpipeline-batch:alpha",
    sourceId: "example:textpipeline-batch:alpha",
  }).document,
  createTextDocDocumentFromTextSync("Beta document.", {
    documentId: "example:textpipeline-batch:beta",
    sourceId: "example:textpipeline-batch:beta",
  }).document,
];

const completeBatch = runTextPipelineBatchWithReport(
  documents,
  [
    processor("normalize"),
    processor("annotate", {
      dependsOn: ["normalize"],
      requires: { views: ["normalize-view"] },
    }),
  ],
  { packageVersions: [{ id: "@ismail-elkorchi/textpipeline", version: "0.1.0" }] },
);

const partialBatch = await runTextPipelineBatchAsyncWithReport(
  documents,
  [
    processor("failing", { fail: true }),
    processor("blocked", { dependsOn: ["failing"] }),
  ],
  {},
  { errorPolicy: "continue" },
);

const completeEnvelope = createTextPipelineBatchRunReportEnvelope(completeBatch.report, "0.1.0", {
  scopeBoundary: "Example batch report envelope.",
  limitations: ["The example demonstrates local deterministic batch report exchange."],
});
const partialEnvelope = createTextPipelineBatchRunReportEnvelope(partialBatch.report, "0.1.0", {
  scopeBoundary: "Example batch report envelope.",
  limitations: ["The example demonstrates local deterministic partial batch report exchange."],
});

console.log(JSON.stringify({
  complete: completeBatch.report,
  completeEnvelope,
  partial: partialBatch.report,
  partialEnvelope,
}, null, 2));
