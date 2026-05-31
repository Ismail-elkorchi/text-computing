#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createTextPackManifest,
  loadTextPackFromFileSystem,
  lookupTextPackLoadedEntries,
  validateTextPackAuthoringMetadata,
} from "@ismail-elkorchi/textpack";
import { textPackEnCoreManifest } from "@ismail-elkorchi/textpack-en-core";

const manifest = createTextPackManifest({
  id: textPackEnCoreManifest.id,
  packageName: textPackEnCoreManifest.packageName,
  version: textPackEnCoreManifest.version,
  kind: textPackEnCoreManifest.kind,
  targets: textPackEnCoreManifest.targets,
  resources: textPackEnCoreManifest.resources,
  provides: textPackEnCoreManifest.provides,
  licenses: textPackEnCoreManifest.licenses,
  provenance: textPackEnCoreManifest.provenance,
  tests: textPackEnCoreManifest.tests,
  engines: textPackEnCoreManifest.engines,
  externalData: textPackEnCoreManifest.externalData,
  reviewState: textPackEnCoreManifest.reviewState,
  composition: textPackEnCoreManifest.composition,
  limitations: textPackEnCoreManifest.limitations,
});

const validation = validateTextPackAuthoringMetadata(manifest);
if (!validation.ok) {
  throw new Error(JSON.stringify(validation.diagnostics));
}

const manifestUrl = await import.meta.resolve("@ismail-elkorchi/textpack-en-core/pack.manifest.json");
const packRoot = dirname(fileURLToPath(manifestUrl));
const loaded = await loadTextPackFromFileSystem({
  manifest,
  root: packRoot,
  request: {
    kind: "stopwords",
    language: "en",
  },
  readText: (resourcePath) => readFile(resourcePath, "utf8"),
});

if (loaded.diagnostics.length !== 0) {
  throw new Error(JSON.stringify(loaded.diagnostics));
}

const matches = lookupTextPackLoadedEntries(loaded.resources, "the");
console.log(JSON.stringify({
  packId: manifest.id,
  resources: loaded.resources.map((entry) => entry.resource.resourceId),
  query: "the",
  matches: matches.map((match) => ({
    resourceId: match.resource.resourceId,
    value: match.entry.value,
    line: match.entry.line,
  })),
}, null, 2));
