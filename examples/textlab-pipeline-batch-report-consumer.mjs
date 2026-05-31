#!/usr/bin/env node
import { createTextDocDocumentFromTextSync } from "@ismail-elkorchi/textdoc";
import { runTextPipelineBatchAsyncWithReport } from "@ismail-elkorchi/textpipeline";
import { inspectTextPipelineBatchReport } from "@ismail-elkorchi/textlab";

function appendLayer(document, processorId) {
  const viewId = `${processorId}-view`;
  const layerId = `${processorId}-layer`;
  const spanMapId = `span-map-source-to-${viewId}`;
  return {
    ...document,
    revision: `${document.revision}>${processorId}`,
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
      emits: {
        views: [`${id}-view`],
        layers: [`${id}-layer`],
      },
      purity: "pure",
      parallelSafe: true,
    },
    async run(document) {
      if (options.fail === true) throw new Error(`${id} failed`);
      return { document: appendLayer(document, id) };
    },
  };
}

const documents = [
  createTextDocDocumentFromTextSync("Alpha document.", {
    documentId: "example:textlab-pipeline-batch-report:alpha",
    sourceId: "example:textlab-pipeline-batch-report:alpha",
  }).document,
  createTextDocDocumentFromTextSync("Beta document.", {
    documentId: "example:textlab-pipeline-batch-report:beta",
    sourceId: "example:textlab-pipeline-batch-report:beta",
  }).document,
];

const batch = await runTextPipelineBatchAsyncWithReport(
  documents,
  [
    processor("extract"),
    processor("failing", { fail: true }),
    processor("blocked", { dependsOn: ["failing"] }),
  ],
  { packageVersions: [{ id: "@ismail-elkorchi/textpipeline", version: "0.1.0" }] },
  { errorPolicy: "continue" },
);

const inspection = inspectTextPipelineBatchReport(batch.report);

console.log(JSON.stringify({
  report: batch.report,
  inspection,
}, null, 2));
