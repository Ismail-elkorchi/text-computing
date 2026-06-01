#!/usr/bin/env node
import { createTextDocDocumentFromTextSync } from "@ismail-elkorchi/textdoc";
import {
  createTextPipelineLocalWorker,
  isTextPipelineWorkerRunReportV1,
  packageName as textPipelinePackageName,
  runTextPipelineBatchWithWorker,
} from "@ismail-elkorchi/textpipeline";

function documentFromText(id, text) {
  return createTextDocDocumentFromTextSync(text, {
    documentId: `example:textpipeline-worker:${id}`,
    sourceId: `example:textpipeline-worker:${id}`,
  }).document;
}

const revisionProcessor = {
  descriptor: {
    id: "revision-marker",
    version: "1.0.0",
    purity: "pure",
    parallelSafe: true,
  },
  run(document) {
    return {
      document: {
        ...document,
        revision: `${document.revision}>revision-marker`,
      },
    };
  },
};

const worker = createTextPipelineLocalWorker("example-local-worker");
const workerBatch = await runTextPipelineBatchWithWorker(
  [
    documentFromText("alpha", "Worker execution alpha."),
    documentFromText("beta", "Worker execution beta."),
  ],
  [revisionProcessor],
  worker,
  { packageVersions: [{ id: textPipelinePackageName, version: "0.1.0" }] },
);

if (!isTextPipelineWorkerRunReportV1(workerBatch.report)) {
  throw new Error("worker run report is invalid");
}

console.log(JSON.stringify({
  workerId: workerBatch.report.workerId,
  documentCount: workerBatch.report.documentCount,
  completeCount: workerBatch.report.completeCount,
  executionModes: workerBatch.report.executionModes,
  revisions: workerBatch.runs.map((run) => run.document.revision),
}, null, 2));
