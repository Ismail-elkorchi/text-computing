#!/usr/bin/env node
import { createTextDocDocumentFromTextSync } from "@ismail-elkorchi/textdoc";
import {
  createTextPipelineDistributedSchedulePlan,
  isTextPipelineDistributedSchedulePlanV1,
  packageName,
} from "@ismail-elkorchi/textpipeline";

function documentFromText(id, text) {
  return createTextDocDocumentFromTextSync(text, {
    documentId: `example:textpipeline-distributed-schedule:${id}`,
    sourceId: `example:textpipeline-distributed-schedule:${id}`,
  }).document;
}

const processor = {
  descriptor: {
    id: "distributed-token-marker",
    version: "1.0.0",
    purity: "pure",
    parallelSafe: true,
  },
  run(document) {
    return { document };
  },
};

const schedule = createTextPipelineDistributedSchedulePlan(
  [
    documentFromText("alpha", "Distributed schedule alpha."),
    documentFromText("beta", "Distributed schedule beta."),
    documentFromText("gamma", "Distributed schedule gamma."),
    documentFromText("delta", "Distributed schedule delta."),
  ],
  [processor],
  [
    { nodeId: "node-b", workerIds: ["worker-b"], maxConcurrentDocuments: 1, labels: ["zone-b"] },
    { nodeId: "node-a", workerIds: ["worker-a2", "worker-a1"], maxConcurrentDocuments: 2, labels: ["zone-a"] },
  ],
  { packageVersions: [{ id: packageName, version: "0.1.0" }] },
  {
    scheduleId: "example:textpipeline-distributed-schedule",
    cacheNamespace: "example-distributed-cache",
  },
);

if (!isTextPipelineDistributedSchedulePlanV1(schedule)) {
  throw new Error("textpipeline distributed schedule plan is invalid");
}

console.log(JSON.stringify({
  scheduleId: schedule.scheduleId,
  strategy: schedule.strategy,
  documentCount: schedule.documentCount,
  nodeIds: schedule.nodeIds,
  workerIds: schedule.workerIds,
  parallelSafe: schedule.parallelSafe,
  assignments: schedule.items.map((item) => ({
    inputIndex: item.inputIndex,
    nodeId: item.nodeId,
    workerId: item.workerId,
    globalWorkerSlot: item.globalWorkerSlot,
  })),
}, null, 2));
