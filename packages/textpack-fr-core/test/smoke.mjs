import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { loadTextPackResources, validateTextPackManifestGovernance } from "@ismail-elkorchi/textpack";
import { textPackFrCoreManifest } from "@ismail-elkorchi/textpack-fr-core";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const governance = validateTextPackManifestGovernance(textPackFrCoreManifest);
if (!governance.ok) throw new Error(JSON.stringify(governance.diagnostics));
const contents = {};
for (const paths of Object.values(textPackFrCoreManifest.resources)) {
  for (const resourcePath of paths) contents[resourcePath] = await readFile(path.join(root, resourcePath), "utf8");
}
const firstFamily = Object.keys(textPackFrCoreManifest.resources)[0];
const request = { family: firstFamily, ...(textPackFrCoreManifest.targets.profiles?.[0] ? { profile: textPackFrCoreManifest.targets.profiles[0] } : {}) };
const loaded = loadTextPackResources([textPackFrCoreManifest], request, contents);
if (loaded.diagnostics.length !== 0) throw new Error(JSON.stringify(loaded.diagnostics));
if (loaded.resources.length === 0) throw new Error("expected at least one loaded resource");
const loadedAll = loadTextPackResources([textPackFrCoreManifest], { language: "fr" }, contents);
if (loadedAll.diagnostics.length !== 0) throw new Error(JSON.stringify(loadedAll.diagnostics));
if (loadedAll.resources.length !== Object.values(textPackFrCoreManifest.provides).flat().length) {
  throw new Error("expected every declared French resource family to load");
}
