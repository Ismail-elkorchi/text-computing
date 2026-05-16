import Ajv from "ajv";
import { access, readFile } from "node:fs/promises";
import {
  loadTextPackResources,
  lookupTextPackLoadedEntries,
  resolveTextPackResources,
} from "../packages/textpack/src/index.ts";

const ajv = new Ajv({ allErrors: true, strict: true });

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function pushError(errors, code, message) {
  errors.push({ code, message });
}

async function ensurePathExists(path) {
  await access(path);
}

function validateManifestSemantics(manifest) {
  const errors = [];

  const licenseIds = new Set();
  for (const license of manifest.licenses) {
    if (licenseIds.has(license.id)) {
      pushError(errors, "duplicate-license-id", `Duplicate license id ${license.id}.`);
    }
    licenseIds.add(license.id);
  }

  const provenanceIds = new Set();
  for (const record of manifest.provenance) {
    if (provenanceIds.has(record.id)) {
      pushError(errors, "duplicate-provenance-id", `Duplicate provenance id ${record.id}.`);
    }
    provenanceIds.add(record.id);
  }

  const resourceIds = new Set();
  for (const resource of manifest.resources) {
    if (resourceIds.has(resource.resourceId)) {
      pushError(
        errors,
        "duplicate-resource-id",
        `Duplicate resource id ${resource.resourceId} in ${manifest.packId}.`,
      );
    }
    resourceIds.add(resource.resourceId);

    if (!licenseIds.has(resource.licenseId)) {
      pushError(
        errors,
        "missing-license-ref",
        `Resource ${resource.resourceId} references missing license ${resource.licenseId}.`,
      );
    }

    if (!provenanceIds.has(resource.provenanceId)) {
      pushError(
        errors,
        "missing-provenance-ref",
        `Resource ${resource.resourceId} references missing provenance ${resource.provenanceId}.`,
      );
    }
  }

  return errors;
}

const manifestSchema = await readJson("schemas/textpack-manifest-v1.schema.json");
const validateManifest = ajv.compile(manifestSchema);

const validManifestPaths = [
  "fixtures/textpack/manifests/textpack-en-core.json",
  "fixtures/textpack/manifests/textpack-en-legal.json",
];
const validManifests = [];
const resourceContents = {};

for (const manifestPath of validManifestPaths) {
  const manifest = await readJson(manifestPath);
  if (!validateManifest(manifest)) {
    console.error(`${manifestPath} failed schemas/textpack-manifest-v1.schema.json`);
    console.error(JSON.stringify(validateManifest.errors, null, 2));
    process.exit(1);
  }

  const semanticErrors = validateManifestSemantics(manifest);
  if (semanticErrors.length > 0) {
    console.error(`${manifestPath} failed semantic validation`);
    console.error(JSON.stringify(semanticErrors, null, 2));
    process.exit(1);
  }

  for (const resource of manifest.resources) {
    await ensurePathExists(resource.path);
    resourceContents[resource.path] = await readFile(resource.path, "utf8");
  }

  validManifests.push(manifest);
}

const legalStopwordsLookup = resolveTextPackResources(validManifests, {
  kind: "stopwords",
  language: "en",
  profile: "legal",
});

if (
  legalStopwordsLookup.resources.map((entry) => entry.resourceId).join(",") !==
  "stopwords-en-legal,stopwords-en-core"
) {
  console.error("Deterministic stopword overlay ordering failed for the legal profile.");
  console.error(JSON.stringify(legalStopwordsLookup, null, 2));
  process.exit(1);
}

if (
  legalStopwordsLookup.resources[0]?.provenance.id !== "prov-hand-curated" ||
  legalStopwordsLookup.resources[0]?.license.id !== "license-cc0"
) {
  console.error("Resolved resources must retain provenance and license metadata.");
  console.error(JSON.stringify(legalStopwordsLookup, null, 2));
  process.exit(1);
}

const loadedLegalStopwords = loadTextPackResources(
  validManifests,
  {
    kind: "stopwords",
    language: "en",
    profile: "legal",
  },
  resourceContents,
);
if (loadedLegalStopwords.diagnostics.length > 0) {
  console.error("Valid stopword resources must load without diagnostics.");
  console.error(JSON.stringify(loadedLegalStopwords, null, 2));
  process.exit(1);
}

const legalStopwordMatches = lookupTextPackLoadedEntries(loadedLegalStopwords.resources, "thereof");
if (legalStopwordMatches[0]?.resource.resourceId !== "stopwords-en-legal") {
  console.error("Loaded legal stopword lookup failed.");
  console.error(JSON.stringify(legalStopwordMatches, null, 2));
  process.exit(1);
}

const loadedLexicon = loadTextPackResources(
  validManifests,
  { kind: "lexicon", language: "en" },
  resourceContents,
);
const hostEntry = lookupTextPackLoadedEntries(loadedLexicon.resources, "HOST")[0]?.entry;
if (hostEntry?.attributes.lemma !== "host" || hostEntry.attributes.pos !== "VERB") {
  console.error("Loaded lexicon attribute lookup failed.");
  console.error(JSON.stringify(loadedLexicon, null, 2));
  process.exit(1);
}

const loadedGazetteer = loadTextPackResources(
  validManifests,
  { kind: "gazetteer", language: "en", profile: "legal" },
  resourceContents,
);
const courtEntry = lookupTextPackLoadedEntries(loadedGazetteer.resources, "supreme court")[0]?.entry;
if (courtEntry?.label !== "ORG") {
  console.error("Loaded gazetteer label lookup failed.");
  console.error(JSON.stringify(loadedGazetteer, null, 2));
  process.exit(1);
}

const missingContent = loadTextPackResources(validManifests, { kind: "stopwords" }, {});
if (!missingContent.diagnostics.some((entry) => entry.code === "resource-content-missing")) {
  console.error("Missing resource content must produce an explicit diagnostic.");
  console.error(JSON.stringify(missingContent, null, 2));
  process.exit(1);
}

const profileMismatchLookup = resolveTextPackResources(validManifests, {
  kind: "gazetteer",
  language: "en",
  profile: "medical",
});
if (!profileMismatchLookup.diagnostics.some((entry) => entry.code === "profile-mismatch")) {
  console.error("Expected a profile-mismatch diagnostic for the medical gazetteer request.");
  console.error(JSON.stringify(profileMismatchLookup, null, 2));
  process.exit(1);
}

const languageMismatchLookup = resolveTextPackResources(validManifests, {
  kind: "stopwords",
  language: "fr",
  profile: "legal",
});
if (!languageMismatchLookup.diagnostics.some((entry) => entry.code === "language-mismatch")) {
  console.error("Expected a language-mismatch diagnostic for the French stopword request.");
  console.error(JSON.stringify(languageMismatchLookup, null, 2));
  process.exit(1);
}

const invalidSemanticCases = [
  {
    path: "fixtures/textpack/invalid/duplicate-resource-id.json",
    expectedCode: "duplicate-resource-id",
  },
  {
    path: "fixtures/textpack/invalid/missing-provenance.json",
    expectedCode: "missing-provenance-ref",
  },
  {
    path: "fixtures/textpack/invalid/missing-license.json",
    expectedCode: "missing-license-ref",
  },
];

for (const invalidCase of invalidSemanticCases) {
  const manifest = await readJson(invalidCase.path);
  if (!validateManifest(manifest)) {
    console.error(`${invalidCase.path} must remain schema-valid so semantic checks can falsify it.`);
    console.error(JSON.stringify(validateManifest.errors, null, 2));
    process.exit(1);
  }
  const semanticErrors = validateManifestSemantics(manifest);
  if (!semanticErrors.some((entry) => entry.code === invalidCase.expectedCode)) {
    console.error(`${invalidCase.path} did not trigger ${invalidCase.expectedCode}.`);
    console.error(JSON.stringify(semanticErrors, null, 2));
    process.exit(1);
  }
}

const overlayConflictManifests = [
  await readJson("fixtures/textpack/invalid/overlay-conflict-a.json"),
  await readJson("fixtures/textpack/invalid/overlay-conflict-b.json"),
];
for (const manifest of overlayConflictManifests) {
  if (!validateManifest(manifest)) {
    console.error("Overlay conflict manifests must remain schema-valid.");
    console.error(JSON.stringify(validateManifest.errors, null, 2));
    process.exit(1);
  }
}
const overlayConflictLookup = resolveTextPackResources(overlayConflictManifests, {
  kind: "stopwords",
  language: "en",
});
if (!overlayConflictLookup.diagnostics.some((entry) => entry.code === "overlay-conflict")) {
  console.error("Expected an overlay-conflict diagnostic.");
  console.error(JSON.stringify(overlayConflictLookup, null, 2));
  process.exit(1);
}

console.log("Textpack resource fixtures OK.");
