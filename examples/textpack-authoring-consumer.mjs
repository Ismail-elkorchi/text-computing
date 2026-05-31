#!/usr/bin/env node
import { mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  createTextPackManifest,
  loadTextPackFromFileSystem,
  lookupTextPackLoadedEntries,
  planTextPackResourceTransaction,
} from "@ismail-elkorchi/textpack";
import { inspectTextPackResourceAudit } from "@ismail-elkorchi/textlab";

async function writeTextFileAtomic(filePath, content) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  try {
    await writeFile(tempPath, content, "utf8");
    await rename(tempPath, filePath);
  } catch (error) {
    await rm(tempPath, { force: true });
    throw error;
  }
}

async function listPackResourceFiles(packRoot) {
  const resourcesRoot = path.join(packRoot, "resources");
  const paths = [];
  const stack = [resourcesRoot];
  while (stack.length > 0) {
    const current = stack.pop();
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const absolutePath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(absolutePath);
      } else if (entry.isFile()) {
        paths.push(path.relative(packRoot, absolutePath).split(path.sep).join("/"));
      }
    }
  }
  return paths.sort((left, right) => left.localeCompare(right));
}

const packRoot = await mkdtemp(path.join(tmpdir(), "textpack-authoring-consumer-"));
let manifest = createTextPackManifest({
  id: "textpack-en-core-style-authoring",
  packageName: "@example/textpack-en-core-style-authoring",
  version: "0.1.0",
  kind: ["language"],
  targets: {
    languages: ["en"],
    scripts: ["Latn"],
    profiles: ["uax29-default"],
  },
  resources: {},
  provides: {},
  licenses: { code: ["MIT"], data: ["CC0-1.0"] },
  provenance: { sources: ["consumer:authoring-example"], generated: false },
  tests: {
    smoke: ["test:authoring-smoke"],
    negative: ["test:authoring-negative"],
    representative: ["test:authoring-representative"],
  },
});

const addPlan = planTextPackResourceTransaction({
  manifest,
  operation: {
    action: "add-resource",
    resource: {
      family: "stopwords",
      resourceId: "stopwords-en-core-style",
      resourcePath: "resources/stopwords.en.core-style.txt",
    },
  },
  inventoryResourcePaths: [],
});
if (!addPlan.ok) throw new Error(JSON.stringify(addPlan.diagnostics));
manifest = addPlan.nextManifest;
await writeTextFileAtomic(
  path.join(packRoot, "resources/stopwords.en.core-style.txt"),
  "the\nand\n",
);
await writeTextFileAtomic(path.join(packRoot, "pack.manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

const updatePlan = planTextPackResourceTransaction({
  manifest,
  operation: {
    action: "update-resource",
    resourceId: "stopwords-en-core-style",
    update: {
      resourcePath: "resources/stopwords.en.core-style.v2.txt",
      resourceId: "stopwords-en-core-style-v2",
    },
  },
  inventoryResourcePaths: await listPackResourceFiles(packRoot),
});
if (!updatePlan.ok) throw new Error(JSON.stringify(updatePlan.diagnostics));
manifest = updatePlan.nextManifest;
await writeTextFileAtomic(
  path.join(packRoot, "resources/stopwords.en.core-style.v2.txt"),
  "the\nand\nor\n",
);
await writeTextFileAtomic(path.join(packRoot, "pack.manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
await rm(path.join(packRoot, "resources/stopwords.en.core-style.txt"), { force: true });

const audit = inspectTextPackResourceAudit(manifest, await listPackResourceFiles(packRoot));
if (!audit.ok) throw new Error(JSON.stringify(audit.diagnostics));

const loaded = await loadTextPackFromFileSystem({
  manifest,
  root: packRoot,
  request: { kind: "stopwords", language: "en" },
  readText: (resourcePath) => readFile(resourcePath, "utf8"),
});
if (loaded.diagnostics.length !== 0) throw new Error(JSON.stringify(loaded.diagnostics));

console.log(JSON.stringify({
  packId: manifest.id,
  audit,
  resources: loaded.resources.map((entry) => entry.resource.resourceId),
  query: "or",
  matches: lookupTextPackLoadedEntries(loaded.resources, "or").map((match) => ({
    resourceId: match.resource.resourceId,
    value: match.entry.value,
    line: match.entry.line,
  })),
}, null, 2));
