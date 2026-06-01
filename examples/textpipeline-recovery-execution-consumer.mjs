#!/usr/bin/env node
import { createTextDocDocumentFromTextSync } from "@ismail-elkorchi/textdoc";
import {
  createTextPipelineRecoveryPlan,
  executeTextPipelineRecoveryPlan,
  isTextPipelineRecoveryExecutionReportV1,
  runTextPipelineBatchAsyncWithReport,
} from "@ismail-elkorchi/textpipeline";

function document(id, text) {
  return createTextDocDocumentFromTextSync(text, {
    documentId: `example:textpipeline-recovery-execution:${id}`,
    sourceId: `example:textpipeline-recovery-execution:${id}`,
  }).document;
}

function processor(id, apply) {
  return {
    descriptor: {
      id,
      version: "1.0.0",
      purity: "pure",
      parallelSafe: true,
    },
    run(inputDocument) {
      return { document: apply(inputDocument) };
    },
  };
}

function appendRevision(id) {
  return (inputDocument) => ({
    ...inputDocument,
    revision: `${inputDocument.revision}>${id}`,
  });
}

const documents = [
  document("a", "alpha"),
  document("b", "beta"),
];

const initialBatch = await runTextPipelineBatchAsyncWithReport(
  documents,
  [
    {
      descriptor: {
        id: "example-retry-root",
        version: "1.0.0",
        purity: "pure",
        parallelSafe: true,
      },
      run() {
        throw new Error("first attempt fails");
      },
    },
    {
      ...processor("example-retry-dependent", appendRevision("dependent")),
      descriptor: {
        id: "example-retry-dependent",
        version: "1.0.0",
        dependsOn: ["example-retry-root"],
        purity: "pure",
        parallelSafe: true,
      },
    },
  ],
  {},
  { errorPolicy: "continue" },
);

const recoveryPlan = createTextPipelineRecoveryPlan(initialBatch.report, initialBatch.runs, {
  planId: "example:textpipeline-recovery-execution",
  maxRetryAttempts: 2,
});

const recovery = await executeTextPipelineRecoveryPlan(
  recoveryPlan,
  documents,
  [
    processor("example-retry-root", appendRevision("root-recovered")),
    {
      ...processor("example-retry-dependent", appendRevision("dependent-recovered")),
      descriptor: {
        id: "example-retry-dependent",
        version: "1.0.0",
        dependsOn: ["example-retry-root"],
        purity: "pure",
        parallelSafe: true,
      },
    },
  ],
);

if (!isTextPipelineRecoveryExecutionReportV1(recovery.report)) {
  throw new Error("textpipeline recovery execution report is invalid");
}

console.log(JSON.stringify({
  planId: recovery.report.planId,
  retryCount: recovery.report.retryCount,
  completeRetryCount: recovery.report.completeRetryCount,
  exhaustedRetryCount: recovery.report.exhaustedRetryCount,
  attemptCount: recovery.report.attemptCount,
  finalRevisions: recovery.runs.map((run) => run.document.revision),
  items: recovery.report.items.map((item) => ({
    inputIndex: item.inputIndex,
    executionStatus: item.executionStatus,
    finalAttempt: item.finalAttempt,
    failedProcessorIds: item.failedProcessorIds,
    skippedProcessorIds: item.skippedProcessorIds,
  })),
}, null, 2));
