#!/usr/bin/env node
import { createTextDocDocumentFromTextSync } from "@ismail-elkorchi/textdoc";
import {
  createTextPipelineBatchRunReportEnvelope,
  runTextPipelineBatchWithReport,
} from "@ismail-elkorchi/textpipeline";
import {
  inspectTextPipelineBatchReport,
  inspectTextProtocolResultEnvelope,
} from "@ismail-elkorchi/textlab";

function processor(id) {
  return {
    descriptor: {
      id,
      version: "1.0.0",
      emits: {
        views: [`${id}-view`],
        layers: [`${id}-layer`],
      },
      purity: "pure",
      parallelSafe: true,
    },
    run(document) {
      const viewId = `${id}-view`;
      const layerId = `${id}-layer`;
      return {
        document: {
          ...document,
          revision: `${document.revision}>${id}`,
          views: [...document.views, { id: viewId, kind: "task" }],
          layers: [
            ...document.layers,
            {
              id: layerId,
              kind: "extension",
              viewId,
              annotations: [],
            },
          ],
        },
      };
    },
  };
}

const documents = [
  createTextDocDocumentFromTextSync("Envelope example.", {
    documentId: "example:textlab-result-envelope",
    sourceId: "example:textlab-result-envelope",
  }).document,
];

const batch = runTextPipelineBatchWithReport(documents, [processor("annotate")]);
const envelope = createTextPipelineBatchRunReportEnvelope(batch.report, "0.1.0", {
  provenance: {
    references: [{ kind: "example", id: "textlab-result-envelope-consumer" }],
  },
  scopeBoundary: "Example result-envelope inspection.",
  limitations: ["The example demonstrates local envelope inspection."],
});

console.log(JSON.stringify({
  envelopeInspection: inspectTextProtocolResultEnvelope(envelope),
  batchReportInspection: inspectTextPipelineBatchReport(envelope.payload),
}, null, 2));
