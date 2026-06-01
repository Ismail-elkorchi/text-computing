#!/usr/bin/env node
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  addTextDocLayerV1,
  createTextDocDocumentFromTextSync,
} from "@ismail-elkorchi/textdoc";
import {
  createTextPipelineSnapshotBackedDocumentCache,
  isTextPipelineCacheSnapshotV1,
  parseTextPipelineCacheSnapshot,
  runTextPipelineAsync,
  stringifyTextPipelineCacheSnapshot,
} from "@ismail-elkorchi/textpipeline";
import { inspectTextPipelineTrace } from "@ismail-elkorchi/textlab";

const document = createTextDocDocumentFromTextSync("Cache snapshot recovery.", {
  documentId: "example:textpipeline-cache-snapshot",
  sourceId: "example:textpipeline-cache-snapshot",
}).document;

let processorRuns = 0;
const processor = {
  descriptor: {
    id: "snapshot-layer",
    version: "1.0.0",
    emits: {
      layers: ["snapshot-layer"],
    },
    purity: "pure",
    parallelSafe: true,
  },
  run(inputDocument) {
    processorRuns += 1;
    return {
      document: addTextDocLayerV1(
        inputDocument,
        {
          id: "snapshot-layer",
          kind: "extension",
          viewId: "source-view",
          annotations: [],
        },
        { revision: `${inputDocument.revision}>snapshot-layer` },
      ),
    };
  },
};

const cacheNamespace = "example-cache-snapshot";
const cache = createTextPipelineSnapshotBackedDocumentCache(undefined, { namespace: cacheNamespace });
await runTextPipelineAsync(document, [processor], {}, { cache, cacheNamespace });

const dir = await mkdtemp(path.join(tmpdir(), "textpipeline-cache-snapshot-"));
const snapshotPath = path.join(dir, "cache-snapshot.json");
const snapshot = cache.snapshot();
if (!isTextPipelineCacheSnapshotV1(snapshot)) {
  throw new Error("cache snapshot is invalid");
}
await writeFile(snapshotPath, stringifyTextPipelineCacheSnapshot(snapshot), "utf8");

const restoredSnapshot = parseTextPipelineCacheSnapshot(await readFile(snapshotPath, "utf8"));
const restoredCache = createTextPipelineSnapshotBackedDocumentCache(restoredSnapshot, {
  namespace: cacheNamespace,
});
const restoredRun = await runTextPipelineAsync(document, [processor], {}, {
  cache: restoredCache,
  cacheNamespace,
});

if (restoredRun.trace.entries[0]?.status !== "cached" || processorRuns !== 1) {
  throw new Error("restored cache snapshot did not replay the cached processor output");
}

const inspection = inspectTextPipelineTrace(restoredRun.trace);
console.log(JSON.stringify({
  snapshot: {
    keyBasename: path.basename(snapshotPath),
    namespace: restoredSnapshot.namespace,
    entryCount: restoredSnapshot.entryCount,
  },
  trace: {
    runStatus: restoredRun.trace.runStatus,
    statuses: restoredRun.trace.entries.map((entry) => entry.status),
    cachePolicy: restoredRun.trace.cachePolicy,
  },
  inspection: {
    entryCount: inspection.entryCount,
    cachedCount: inspection.statusCounts.find((entry) => entry.id === "cached")?.count ?? 0,
  },
}, null, 2));
