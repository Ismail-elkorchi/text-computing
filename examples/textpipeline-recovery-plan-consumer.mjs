#!/usr/bin/env node
import { createTextDocDocumentFromTextSync } from "@ismail-elkorchi/textdoc";
import {
  createTextPipelineRecoveryPlan,
  isTextPipelineRecoveryPlanV1,
  runTextPipelineBatchAsyncWithReport,
} from "@ismail-elkorchi/textpipeline";

function document(id, text) {
  return createTextDocDocumentFromTextSync(text, {
    documentId: `example:textpipeline-recovery:${id}`,
    sourceId: `example:textpipeline-recovery:${id}`,
  }).document;
}

const failingProcessor = {
  descriptor: {
    id: "example-failing-processor",
    version: "1.0.0",
    purity: "pure",
    parallelSafe: true,
  },
  run() {
    throw new Error("example processor failure");
  },
};

const dependentProcessor = {
  descriptor: {
    id: "example-dependent-processor",
    version: "1.0.0",
    dependsOn: ["example-failing-processor"],
    purity: "pure",
    parallelSafe: true,
  },
  run(inputDocument) {
    return { document: inputDocument };
  },
};

const batch = await runTextPipelineBatchAsyncWithReport(
  [
    document("a", "alpha"),
    document("b", "beta"),
  ],
  [failingProcessor, dependentProcessor],
  {},
  { errorPolicy: "continue" },
);

const recoveryPlan = createTextPipelineRecoveryPlan(batch.report, batch.runs, {
  planId: "example:textpipeline-recovery-plan",
  maxRetryAttempts: 2,
});

if (!isTextPipelineRecoveryPlanV1(recoveryPlan)) {
  throw new Error("textpipeline recovery plan is invalid");
}

console.log(JSON.stringify({
  planId: recoveryPlan.planId,
  sourceKind: recoveryPlan.sourceKind,
  documentCount: recoveryPlan.documentCount,
  retryCount: recoveryPlan.retryCount,
  retryInputIndexes: recoveryPlan.retryInputIndexes,
  firstRetry: recoveryPlan.items.find((item) => item.recoveryAction === "retry") ?? null,
}, null, 2));
