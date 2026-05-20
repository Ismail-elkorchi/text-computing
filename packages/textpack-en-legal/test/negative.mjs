import { lookupTextPackLoadedEntries, loadTextPackResources, textPackDemoTrimLowercaseCanonicalizer } from "@ismail-elkorchi/textpack";
import { textPackEnLegalManifest } from "@ismail-elkorchi/textpack-en-legal";

const firstFamily = Object.keys(textPackEnLegalManifest.resources)[0];
const firstPath = textPackEnLegalManifest.resources[firstFamily][0];
const contents = { [firstPath]: "Thereof\nthereof\n" };
const request = { family: firstFamily, ...(textPackEnLegalManifest.targets.profiles?.[0] ? { profile: textPackEnLegalManifest.targets.profiles[0] } : {}) };
const exact = loadTextPackResources([textPackEnLegalManifest], request, contents);
if (lookupTextPackLoadedEntries(exact.resources, "thereof").length !== 1) throw new Error("exact lookup should match one exact entry");
if (lookupTextPackLoadedEntries(exact.resources, "THEREOF").length !== 0) throw new Error("lookup must not use hidden case folding");
const canonical = loadTextPackResources([textPackEnLegalManifest], request, contents, { canonicalizer: textPackDemoTrimLowercaseCanonicalizer });
if (!canonical.diagnostics.some((entry) => entry.code === "duplicate-resource-entry")) throw new Error("canonicalized duplicate should be diagnosed");
