#!/usr/bin/env node
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createTextDocDocumentFromTextSync } from "@ismail-elkorchi/textdoc";
import {
  buildTextCorpusRetrievalIndex,
  createTextCorpusCollection,
  createTextCorpusRetrievalIndexArtifact,
  isTextCorpusRetrievalIndexStorageRefV1,
  loadTextCorpusRetrievalIndexArtifactFromStore,
  parseTextCorpusQuery,
  saveTextCorpusRetrievalIndexArtifactToStore,
  searchTextCorpusRetrievalIndex,
} from "@ismail-elkorchi/textcorpus";
import { inspectTextCorpusArtifact } from "@ismail-elkorchi/textlab";

function entry(id, text, metadata) {
  const document = createTextDocDocumentFromTextSync(text, {
    documentId: `example:textcorpus-index-storage:${id}`,
    sourceId: `example:textcorpus-index-storage:${id}`,
  }).document;
  return {
    id,
    document,
    viewId: "tokenization-view",
    tokenLayerId: "tokens",
    metadata,
  };
}

const collection = createTextCorpusCollection(
  [
    entry("doc-c", "durable retrieval gamma", { language: "en" }),
    entry("doc-b", "durable retrieval beta", { language: "en" }),
    entry("doc-a", "durable retrieval alpha alpha", { language: "en" }),
  ],
  { corpusId: "example:textcorpus-retrieval-index-storage" },
);
const index = buildTextCorpusRetrievalIndex(collection);
const artifact = createTextCorpusRetrievalIndexArtifact(index);

const dir = await mkdtemp(path.join(tmpdir(), "textcorpus-index-storage-"));
const storageKey = path.join(dir, "retrieval-index-artifact.json");
const storageRef = await saveTextCorpusRetrievalIndexArtifactToStore(artifact, {
  key: storageKey,
  async writeText(key, text) {
    await writeFile(key, text, "utf8");
  },
});

if (!isTextCorpusRetrievalIndexStorageRefV1(storageRef)) {
  throw new Error("textcorpus retrieval index storage ref is invalid");
}

const loadedArtifact = await loadTextCorpusRetrievalIndexArtifactFromStore(storageRef, {
  readText(key) {
    return readFile(key, "utf8");
  },
});
const result = searchTextCorpusRetrievalIndex(
  loadedArtifact.index,
  [parseTextCorpusQuery("alpha", { id: "query:durable-alpha" })],
  { topK: 2 },
);
const inspection = inspectTextCorpusArtifact(storageRef);

console.log(JSON.stringify({
  storage: {
    keyBasename: path.basename(storageRef.key),
    byteLength: storageRef.byteLength,
    checksum: storageRef.checksum.value,
  },
  inspection: {
    artifactKind: inspection.artifactKind,
    corpusId: inspection.corpusId,
    documentCount: inspection.documentCount,
    formulaIds: inspection.formulaIds,
  },
  topHit: result.results[0]?.hits[0]?.docId ?? null,
}, null, 2));
