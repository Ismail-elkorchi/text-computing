import { createTextPackResourceRegistry, queryTextPackResourceRegistry } from "@ismail-elkorchi/textpack";
import { textPackFrCoreManifest } from "@ismail-elkorchi/textpack-fr-core";

const registry = createTextPackResourceRegistry([textPackFrCoreManifest]);
if (!registry.languages.includes("fr")) throw new Error("manifest language target missing from registry");
for (const [family, ids] of Object.entries(textPackFrCoreManifest.provides)) {
  for (const id of ids) {
    const request = { family, resourceId: id, ...(textPackFrCoreManifest.targets.profiles?.[0] ? { profile: textPackFrCoreManifest.targets.profiles[0] } : {}) };
    const result = queryTextPackResourceRegistry(registry, request);
    if (result.resources[0]?.resourceId !== id) throw new Error(`resource not queryable: ${id}`);
  }
}
