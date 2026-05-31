import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  lookupTextPackLoadedEntries,
  loadTextPackResources,
  resolveTextPackResources,
  textPackDemoTrimLowercaseCanonicalizer,
} from "@ismail-elkorchi/textpack";
import { textPackEnCoreManifest } from "@ismail-elkorchi/textpack-en-core";

const firstFamily = Object.keys(textPackEnCoreManifest.resources)[0];
const firstPath = textPackEnCoreManifest.resources[firstFamily][0];
const contents = { [firstPath]: "Thereof\nthereof\n" };
const request = { family: firstFamily, ...(textPackEnCoreManifest.targets.profiles?.[0] ? { profile: textPackEnCoreManifest.targets.profiles[0] } : {}) };
const exact = loadTextPackResources([textPackEnCoreManifest], request, contents);
if (lookupTextPackLoadedEntries(exact.resources, "thereof").length !== 1) throw new Error("exact lookup should match one exact entry");
if (lookupTextPackLoadedEntries(exact.resources, "THEREOF").length !== 0) throw new Error("lookup must not use hidden case folding");
const canonical = loadTextPackResources([textPackEnCoreManifest], request, contents, { canonicalizer: textPackDemoTrimLowercaseCanonicalizer });
if (!canonical.diagnostics.some((entry) => entry.code === "duplicate-resource-entry")) throw new Error("canonicalized duplicate should be diagnosed");

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const packContents = {};
for (const paths of Object.values(textPackEnCoreManifest.resources)) {
  for (const resourcePath of paths) packContents[resourcePath] = await readFile(path.join(root, resourcePath), "utf8");
}

const loadedAll = loadTextPackResources([textPackEnCoreManifest], { language: "en" }, packContents);
if (loadedAll.diagnostics.length !== 0) throw new Error(JSON.stringify(loadedAll.diagnostics));
for (const unknown of ["ZephyrCorp", "qxzv"]) {
  if (lookupTextPackLoadedEntries(loadedAll.resources, unknown).length !== 0) {
    throw new Error(`unknown token should not match reference resources: ${unknown}`);
  }
}

const frenchLexicon = resolveTextPackResources([textPackEnCoreManifest], { kind: "lexicon", language: "fr" });
if (!frenchLexicon.diagnostics.some((entry) => entry.code === "language-mismatch")) {
  throw new Error("language mismatch should remain explicit for non-English requests");
}
