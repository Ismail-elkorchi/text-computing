import { createTextPackResourceRegistry, queryTextPackResourceRegistry } from "@ismail-elkorchi/textpack";
import { textPackEnLegalManifest } from "@ismail-elkorchi/textpack-en-legal";

const registry = createTextPackResourceRegistry([textPackEnLegalManifest]);
if (!registry.languages.includes("en")) throw new Error("manifest language target missing from registry");
for (const [family, ids] of Object.entries(textPackEnLegalManifest.provides)) {
  for (const id of ids) {
    const request = { family, resourceId: id, ...(textPackEnLegalManifest.targets.profiles?.[0] ? { profile: textPackEnLegalManifest.targets.profiles[0] } : {}) };
    const result = queryTextPackResourceRegistry(registry, request);
    if (result.resources[0]?.resourceId !== id) throw new Error(`resource not queryable: ${id}`);
  }
}
