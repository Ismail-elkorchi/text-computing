import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { loadTextPackResources, validateTextPackManifestGovernance } from "@ismail-elkorchi/textpack";
import { textPackEnCoreManifest } from "@ismail-elkorchi/textpack-en-core";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const governance = validateTextPackManifestGovernance(textPackEnCoreManifest);
if (!governance.ok) throw new Error(JSON.stringify(governance.diagnostics));
const contents = {};
for (const paths of Object.values(textPackEnCoreManifest.resources)) {
  for (const resourcePath of paths) contents[resourcePath] = await readFile(path.join(root, resourcePath), "utf8");
}
const firstFamily = Object.keys(textPackEnCoreManifest.resources)[0];
const request = { family: firstFamily, ...(textPackEnCoreManifest.targets.profiles?.[0] ? { profile: textPackEnCoreManifest.targets.profiles[0] } : {}) };
const loaded = loadTextPackResources([textPackEnCoreManifest], request, contents);
if (loaded.diagnostics.length !== 0) throw new Error(JSON.stringify(loaded.diagnostics));
if (loaded.resources.length === 0) throw new Error("expected at least one loaded resource");
