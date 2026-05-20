import { lookupTextPackLoadedEntries, loadTextPackResources, textPackDemoTrimLowercaseCanonicalizer } from "@ismail-elkorchi/textpack";
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
