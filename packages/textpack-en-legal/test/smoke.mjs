import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { loadTextPackResources, validateTextPackManifestGovernance } from "@ismail-elkorchi/textpack";
import { textPackEnLegalManifest } from "@ismail-elkorchi/textpack-en-legal";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const governance = validateTextPackManifestGovernance(textPackEnLegalManifest);
if (!governance.ok) throw new Error(JSON.stringify(governance.diagnostics));
const contents = {};
for (const paths of Object.values(textPackEnLegalManifest.resources)) {
  for (const resourcePath of paths) contents[resourcePath] = await readFile(path.join(root, resourcePath), "utf8");
}
const firstFamily = Object.keys(textPackEnLegalManifest.resources)[0];
const request = { family: firstFamily, ...(textPackEnLegalManifest.targets.profiles?.[0] ? { profile: textPackEnLegalManifest.targets.profiles[0] } : {}) };
const loaded = loadTextPackResources([textPackEnLegalManifest], request, contents);
if (loaded.diagnostics.length !== 0) throw new Error(JSON.stringify(loaded.diagnostics));
if (loaded.resources.length === 0) throw new Error("expected at least one loaded resource");
const allRequest = { language: "en", ...(textPackEnLegalManifest.targets.profiles?.[0] ? { profile: textPackEnLegalManifest.targets.profiles[0] } : {}) };
const loadedAll = loadTextPackResources([textPackEnLegalManifest], allRequest, contents);
if (loadedAll.diagnostics.length !== 0) throw new Error(JSON.stringify(loadedAll.diagnostics));
if (loadedAll.resources.length !== Object.values(textPackEnLegalManifest.provides).flat().length) {
  throw new Error("expected every declared legal resource family to load");
}
