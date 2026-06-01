#!/usr/bin/env node
import { createTextDocDocumentFromTextSync } from "@ismail-elkorchi/textdoc";
import {
  createTextPipelineLocalWorker,
  isTextPipelineWorkerPoolRunReportV1,
  packageName as textPipelinePackageName,
  runTextPipelineBatchWithWorkerPool,
} from "@ismail-elkorchi/textpipeline";

function documentFromText(id, text) {
  return createTextDocDocumentFromTextSync(text, {
    documentId: `example:textpipeline-worker-pool:${id}`,
    sourceId: `example:textpipeline-worker-pool:${id}`,
  }).document;
}

const revisionProcessor = {
  descriptor: {
    id: "pool-revision-marker",
    version: "1.0.0",
    purity: "pure",
    parallelSafe: true,
  },
  run(document) {
    return {
      document: {
        ...document,
        revision: `${document.revision}>pool-revision-marker`,
      },
    };
  },
};

const workerPoolBatch = await runTextPipelineBatchWithWorkerPool(
  [
    documentFromText("alpha", "Worker pool execution alpha."),
    documentFromText("beta", "Worker pool execution beta."),
    documentFromText("gamma", "Worker pool execution gamma."),
  ],
  [revisionProcessor],
  [
    createTextPipelineLocalWorker("example-worker-a"),
    createTextPipelineLocalWorker("example-worker-b"),
  ],
  { packageVersions: [{ id: textPipelinePackageName, version: "0.1.0" }] },
  { poolId: "example-worker-pool", maxConcurrency: 2 },
);

if (!isTextPipelineWorkerPoolRunReportV1(workerPoolBatch.report)) {
  throw new Error("worker pool run report is invalid");
}

console.log(JSON.stringify({
  poolId: workerPoolBatch.report.poolId,
  strategy: workerPoolBatch.report.strategy,
  workerIds: workerPoolBatch.report.workerIds,
  documentCount: workerPoolBatch.report.documentCount,
  completeCount: workerPoolBatch.report.completeCount,
  assignments: workerPoolBatch.report.items.map((item) => ({
    inputIndex: item.inputIndex,
    workerId: item.workerId,
    workerSlot: item.workerSlot,
    documentId: item.documentId,
  })),
  revisions: workerPoolBatch.runs.map((run) => run.document.revision),
}, null, 2));
