import { lookupTextPackLoadedEntries, loadTextPackResources, textPackDemoTrimLowercaseCanonicalizer } from "@ismail-elkorchi/textpack";
import { textPackFrCoreManifest } from "@ismail-elkorchi/textpack-fr-core";

const firstFamily = Object.keys(textPackFrCoreManifest.resources)[0];
const firstPath = textPackFrCoreManifest.resources[firstFamily][0];
const contents = { [firstPath]: "Thereof\nthereof\n" };
const request = { family: firstFamily, ...(textPackFrCoreManifest.targets.profiles?.[0] ? { profile: textPackFrCoreManifest.targets.profiles[0] } : {}) };
const exact = loadTextPackResources([textPackFrCoreManifest], request, contents);
if (lookupTextPackLoadedEntries(exact.resources, "thereof").length !== 1) throw new Error("exact lookup should match one exact entry");
if (lookupTextPackLoadedEntries(exact.resources, "THEREOF").length !== 0) throw new Error("lookup must not use hidden case folding");
const canonical = loadTextPackResources([textPackFrCoreManifest], request, contents, { canonicalizer: textPackDemoTrimLowercaseCanonicalizer });
if (!canonical.diagnostics.some((entry) => entry.code === "duplicate-resource-entry")) throw new Error("canonicalized duplicate should be diagnosed");
