#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createTextDocDocumentFromTextSync } from "@ismail-elkorchi/textdoc";
import { loadTextPackFromFileSystem } from "@ismail-elkorchi/textpack";
import { textPackEnCoreManifest } from "@ismail-elkorchi/textpack-en-core";
import {
  compileTextRulesFromTextPackResources,
  runTextPackRulesOverTextDoc,
} from "@ismail-elkorchi/textrules";
import { inspectTextdocAnnotations } from "@ismail-elkorchi/textlab";

const manifestUrl = await import.meta.resolve("@ismail-elkorchi/textpack-en-core/pack.manifest.json");
const packRoot = dirname(fileURLToPath(manifestUrl));
const loaded = await loadTextPackFromFileSystem({
  manifest: textPackEnCoreManifest,
  root: packRoot,
  request: {
    language: "en",
  },
  readText: (resourcePath) => readFile(resourcePath, "utf8"),
});

if (loaded.diagnostics.length !== 0) {
  throw new Error(JSON.stringify(loaded.diagnostics));
}

const compilation = compileTextRulesFromTextPackResources(loaded.resources, {
  requiredResourceIds: ["stopwords-en-core", "lexicon-en-core", "abbrev-en-core"],
});

if (compilation.diagnostics.some((diagnostic) => diagnostic.severity === "error")) {
  throw new Error(JSON.stringify(compilation.diagnostics));
}

const created = createTextDocDocumentFromTextSync("Dr. the host signs.", {
  documentId: "example:textrules-textpack-consumer",
  sourceId: "example:textrules-textpack-consumer",
});
const run = runTextPackRulesOverTextDoc({
  document: created.document,
  compiled: compilation.compiled,
});
const inspection = inspectTextdocAnnotations(run.document, {
  layerKinds: ["extension"],
});

console.log(JSON.stringify({
  documentId: run.document.documentId,
  compiledId: compilation.compiled.compiledId,
  annotations: run.annotations.map((annotation) => ({
    id: annotation.id,
    extensionId: annotation.extensionId,
    target: annotation.targets[0],
    confidence: annotation.confidence,
    provenance: annotation.provenance,
    data: annotation.data,
  })),
  inspection,
}, null, 2));
