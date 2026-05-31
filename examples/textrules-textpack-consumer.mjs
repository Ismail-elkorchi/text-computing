#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createTextDocDocumentFromTextSync } from "@ismail-elkorchi/textdoc";
import { loadTextPackFromFileSystem } from "@ismail-elkorchi/textpack";
import { textPackEnCoreManifest } from "@ismail-elkorchi/textpack-en-core";
import { runTextPipeline } from "@ismail-elkorchi/textpipeline";
import { createTextPackRulesPipelineProcessor } from "@ismail-elkorchi/textrules";
import {
  inspectPackBackedRuleAnnotations,
  inspectTextdocAnnotations,
  inspectTextPipelineTrace,
} from "@ismail-elkorchi/textlab";

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

const ruleResources = loaded.resources.filter(({ resource }) =>
  resource.kind === "stopwords" ||
  resource.kind === "lexicon" ||
  resource.kind === "gazetteer" ||
  resource.kind === "rule"
);
const processor = createTextPackRulesPipelineProcessor({
  resources: ruleResources,
  requiredResourceIds: ["stopwords-en-core", "lexicon-en-core", "abbrev-en-core"],
});

const created = createTextDocDocumentFromTextSync("Dr. the host signs.", {
  documentId: "example:textrules-textpack-consumer",
  sourceId: "example:textrules-textpack-consumer",
});
const pipelineRun = runTextPipeline(created.document, [processor], {
  packs: [textPackEnCoreManifest.id],
});
const ruleLayer = pipelineRun.document.layers.find((layer) => layer.id === "textrules:textpack-rule-outputs");
const annotations = ruleLayer?.annotations ?? [];
const inspection = inspectTextdocAnnotations(pipelineRun.document, {
  layerKinds: ["extension"],
});
const traceInspection = inspectTextPipelineTrace(pipelineRun.trace);
const packBackedRuleInspection = inspectPackBackedRuleAnnotations(pipelineRun.document);

console.log(JSON.stringify({
  documentId: pipelineRun.document.documentId,
  trace: pipelineRun.trace,
  annotations: annotations.map((annotation) => ({
    id: annotation.id,
    extensionId: annotation.extensionId,
    target: annotation.targets[0],
    confidence: annotation.confidence,
    provenance: annotation.provenance,
    data: annotation.data,
  })),
  inspection,
  traceInspection,
  packBackedRuleInspection,
}, null, 2));
