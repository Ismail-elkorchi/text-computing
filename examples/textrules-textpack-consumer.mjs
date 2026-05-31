#!/usr/bin/env node
import { readFile, readdir } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createTextDocDocumentFromTextSync } from "@ismail-elkorchi/textdoc";
import { loadTextPackFromFileSystem } from "@ismail-elkorchi/textpack";
import { textPackEnCoreManifest } from "@ismail-elkorchi/textpack-en-core";
import { runTextPipeline } from "@ismail-elkorchi/textpipeline";
import { createTextPackRulesPipelineProcessor } from "@ismail-elkorchi/textrules";
import {
  inspectPackBackedRuleAnnotations,
  inspectTextPackResourceAudit,
  inspectTextdocAnnotations,
  inspectTextPipelineTrace,
} from "@ismail-elkorchi/textlab";

async function listPackResourceFiles(packRoot) {
  const resourcesRoot = `${packRoot}/resources`;
  const paths = [];
  const stack = [resourcesRoot];
  while (stack.length > 0) {
    const current = stack.pop();
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const absolutePath = `${current}/${entry.name}`;
      if (entry.isDirectory()) {
        stack.push(absolutePath);
      } else if (entry.isFile()) {
        paths.push(absolutePath.slice(packRoot.length + 1));
      }
    }
  }
  return paths.sort((left, right) => left.localeCompare(right));
}

const manifestUrl = await import.meta.resolve("@ismail-elkorchi/textpack-en-core/pack.manifest.json");
const packRoot = dirname(fileURLToPath(manifestUrl));
const packAudit = inspectTextPackResourceAudit(textPackEnCoreManifest, await listPackResourceFiles(packRoot));
if (!packAudit.ok) {
  throw new Error(JSON.stringify(packAudit.diagnostics));
}

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
  packAudit,
  traceInspection,
  packBackedRuleInspection,
}, null, 2));
