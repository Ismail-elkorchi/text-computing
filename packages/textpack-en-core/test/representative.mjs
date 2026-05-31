import { createTextPackResourceRegistry, queryTextPackResourceRegistry } from "@ismail-elkorchi/textpack";
import { textPackEnCoreManifest } from "@ismail-elkorchi/textpack-en-core";

const registry = createTextPackResourceRegistry([textPackEnCoreManifest]);
if (!registry.languages.includes("en")) throw new Error("manifest language target missing from registry");
if (!registry.families.includes("gazetteers")) throw new Error("core gazetteer family missing from registry");
for (const [family, ids] of Object.entries(textPackEnCoreManifest.provides)) {
  for (const id of ids) {
    const request = { family, resourceId: id, ...(textPackEnCoreManifest.targets.profiles?.[0] ? { profile: textPackEnCoreManifest.targets.profiles[0] } : {}) };
    const result = queryTextPackResourceRegistry(registry, request);
    if (result.resources[0]?.resourceId !== id) throw new Error(`resource not queryable: ${id}`);
  }
}
