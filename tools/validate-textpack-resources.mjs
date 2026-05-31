import Ajv from "ajv";
import { access, readFile, writeFile } from "node:fs/promises";
import {
  checkTextPackCompatibility,
  composeTextPackResources,
  createTextPackCatalog,
  createTextPackManifestDraft,
  createTextPackResourceRegistry,
  isTextPackCatalogV1,
  loadTextPackRegistryResources,
  loadTextPackResources,
  lookupTextPackLoadedEntries,
  queryTextPackResourceRegistry,
  resolveTextPackResources,
  textPackDemoTrimLowercaseCanonicalizer,
  updateTextPackManifest,
  validateTextPackManifestGovernance,
} from "../packages/textpack/src/index.ts";

const ajv = new Ajv({ allErrors: true, strict: true });
const WRITE_MODE = process.argv.includes("--write");

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function ensurePathExists(path) {
  await access(path);
}

function fail(message, details) {
  console.error(message);
  if (details !== undefined) console.error(JSON.stringify(details, null, 2));
  process.exit(1);
}

function expect(condition, message, details) {
  if (!condition) fail(message, details);
}

function comparableJson(value) {
  return JSON.stringify(value);
}

const manifestSchema = await readJson("schemas/textpack-manifest-v1.schema.json");
const catalogSchema = await readJson("schemas/textpack-catalog-v1.schema.json");
const validateManifest = ajv.compile(manifestSchema);
const validateCatalog = ajv.compile(catalogSchema);

const validManifestPaths = [
  "fixtures/textpack/manifests/textpack-en-core.json",
  "fixtures/textpack/manifests/textpack-en-legal.json",
  "fixtures/textpack/manifests/textpack-fr-core.json",
];
const catalogPath = "fixtures/textpack/catalog.v1.json";
const validManifests = [];
const resourceContents = {};

for (const manifestPath of validManifestPaths) {
  const manifest = await readJson(manifestPath);
  expect(validateManifest(manifest), `${manifestPath} failed schemas/textpack-manifest-v1.schema.json`, validateManifest.errors);

  const governance = validateTextPackManifestGovernance(manifest);
  expect(governance.ok, `${manifestPath} failed textpack governance validation.`, governance.diagnostics);

  for (const paths of Object.values(manifest.resources)) {
    for (const resourcePath of paths) {
      await ensurePathExists(resourcePath);
      resourceContents[resourcePath] = await readFile(resourcePath, "utf8");
    }
  }

  const compatibility = checkTextPackCompatibility(manifest, {
    packageVersions: { "@ismail-elkorchi/textpack": "0.1.0" },
    minimumReviewState: "candidate",
  });
  expect(compatibility.ok, `${manifestPath} failed textpack compatibility validation.`, compatibility.diagnostics);

  validManifests.push(manifest);
}

const heldOutAuthoringManifestPath = "fixtures/textpack/heldout/es-authoring/pack.manifest.json";
const heldOutAuthoringManifest = await readJson(heldOutAuthoringManifestPath);
expect(
  validateManifest(heldOutAuthoringManifest),
  `${heldOutAuthoringManifestPath} failed schemas/textpack-manifest-v1.schema.json`,
  validateManifest.errors,
);
expect(
  validateTextPackManifestGovernance(heldOutAuthoringManifest).ok,
  `${heldOutAuthoringManifestPath} failed textpack governance validation.`,
  validateTextPackManifestGovernance(heldOutAuthoringManifest).diagnostics,
);
for (const paths of Object.values(heldOutAuthoringManifest.resources)) {
  for (const resourcePath of paths) {
    await ensurePathExists(resourcePath);
    resourceContents[resourcePath] = await readFile(resourcePath, "utf8");
  }
}
for (const refs of Object.values(heldOutAuthoringManifest.tests)) {
  for (const testRef of refs) {
    await ensurePathExists(testRef);
  }
}
const authoredFromApi = createTextPackManifestDraft({
  id: heldOutAuthoringManifest.id,
  packageName: heldOutAuthoringManifest.packageName,
  version: heldOutAuthoringManifest.version,
  kind: heldOutAuthoringManifest.kind,
  targets: heldOutAuthoringManifest.targets,
  engines: heldOutAuthoringManifest.engines,
  externalData: heldOutAuthoringManifest.externalData,
  resources: heldOutAuthoringManifest.resources,
  provides: heldOutAuthoringManifest.provides,
  entrypoints: heldOutAuthoringManifest.entrypoints,
  licenses: heldOutAuthoringManifest.licenses,
  provenance: heldOutAuthoringManifest.provenance,
  tests: heldOutAuthoringManifest.tests,
  reviewState: heldOutAuthoringManifest.reviewState,
  limitations: heldOutAuthoringManifest.limitations,
});
expect(
  comparableJson(authoredFromApi) === comparableJson(heldOutAuthoringManifest),
  "Held-out pack authoring fixture must be reproducible through the textpack authoring API.",
  { authoredFromApi, heldOutAuthoringManifest },
);
const promotedHeldOutManifest = updateTextPackManifest(heldOutAuthoringManifest, {
  version: "0.1.1",
  reviewState: "candidate",
  provenanceNotes: ["Held-out authoring workflow promoted after resource and test-path validation."],
});
const promotedHeldOutGovernance = validateTextPackManifestGovernance(promotedHeldOutManifest);
expect(promotedHeldOutGovernance.ok, "Promoted held-out manifest must remain governance-valid.", promotedHeldOutGovernance.diagnostics);
const promotedHeldOutCompatibility = checkTextPackCompatibility(promotedHeldOutManifest, {
  packageVersions: { "@ismail-elkorchi/textpack": "0.1.0" },
  minimumReviewState: "candidate",
  mandatoryResources: [
    "lexicon-es-heldout-authoring",
    "stopwords-es-heldout-authoring",
  ],
});
expect(
  promotedHeldOutCompatibility.ok,
  "Promoted held-out manifest must satisfy package-version, review-state, and mandatory-resource compatibility.",
  promotedHeldOutCompatibility.diagnostics,
);
const heldOutLoadedLexicon = loadTextPackResources(
  [heldOutAuthoringManifest],
  { kind: "lexicon", language: "es" },
  resourceContents,
);
expect(
  lookupTextPackLoadedEntries(heldOutLoadedLexicon.resources, "casas")[0]?.entry.attributes.lemma === "casa",
  "Held-out authoring pack must load lexicon resources through package APIs.",
  heldOutLoadedLexicon,
);

const legalStopwordsLookup = resolveTextPackResources(validManifests, {
  kind: "stopwords",
  language: "en",
  profile: "legal",
});

expect(
  legalStopwordsLookup.resources.map((entry) => entry.resourceId).join(",") ===
    "stopwords-en-legal,stopwords-en-core",
  "Deterministic stopword overlay ordering failed for the legal profile.",
  legalStopwordsLookup,
);

expect(
  legalStopwordsLookup.resources[0]?.provenance.id === "provenance:manifest" &&
    legalStopwordsLookup.resources[0]?.license.id === "license:data",
  "Resolved resources must retain provenance and license metadata.",
  legalStopwordsLookup,
);

const loadedLegalStopwords = loadTextPackResources(
  validManifests,
  {
    kind: "stopwords",
    language: "en",
    profile: "legal",
  },
  resourceContents,
);
expect(loadedLegalStopwords.diagnostics.length === 0, "Valid stopword resources must load without diagnostics.", loadedLegalStopwords);

const legalStopwordMatches = lookupTextPackLoadedEntries(loadedLegalStopwords.resources, "thereof");
expect(legalStopwordMatches[0]?.resource.resourceId === "stopwords-en-legal", "Loaded legal stopword lookup failed.", legalStopwordMatches);

const hiddenLegalStopwordMatches = lookupTextPackLoadedEntries(loadedLegalStopwords.resources, "Thereof");
expect(hiddenLegalStopwordMatches.length === 0, "Loaded legal stopword lookup must be exact unless a canonicalizer is supplied.", hiddenLegalStopwordMatches);

const canonicalLegalStopwordMatches = lookupTextPackLoadedEntries(
  loadedLegalStopwords.resources,
  "Thereof",
  { canonicalizer: textPackDemoTrimLowercaseCanonicalizer },
);
expect(
  canonicalLegalStopwordMatches[0]?.resource.resourceId === "stopwords-en-legal" &&
    canonicalLegalStopwordMatches[0]?.canonicalization?.canonicalizerId === "textpack.demo.trim-lowercase" &&
    canonicalLegalStopwordMatches[0]?.canonicalization?.query.canonicalValue === "thereof" &&
    canonicalLegalStopwordMatches[0]?.canonicalization?.entry.canonicalValue === "thereof",
  "Explicit canonicalized legal stopword lookup failed.",
  canonicalLegalStopwordMatches,
);

const loadedLexicon = loadTextPackResources(
  validManifests,
  { kind: "lexicon", language: "en" },
  resourceContents,
);
const hostEntry = lookupTextPackLoadedEntries(loadedLexicon.resources, "host")[0]?.entry;
expect(hostEntry?.attributes.lemma === "host" && hostEntry.attributes.pos === "VERB", "Loaded lexicon attribute lookup failed.", loadedLexicon);

const hiddenHostEntry = lookupTextPackLoadedEntries(loadedLexicon.resources, "HOST")[0]?.entry;
expect(hiddenHostEntry === undefined, "Loaded lexicon lookup must not lowercase without a caller-provided canonicalizer.", hiddenHostEntry);

const loadedGazetteer = loadTextPackResources(
  validManifests,
  { kind: "gazetteer", language: "en", profile: "legal" },
  resourceContents,
);
const courtEntry = lookupTextPackLoadedEntries(loadedGazetteer.resources, "Supreme Court")[0]?.entry;
expect(courtEntry?.label === "ORG", "Loaded gazetteer label lookup failed.", loadedGazetteer);

const loadedMorphology = loadTextPackResources(
  validManifests,
  { kind: "morphology", language: "fr" },
  resourceContents,
);
const maisonEntry = lookupTextPackLoadedEntries(loadedMorphology.resources, "maisons")[0]?.entry;
expect(
  maisonEntry?.attributes.lemma === "maison" && maisonEntry.attributes.Number === "Plur",
  "Loaded morphology resource lookup failed.",
  loadedMorphology,
);

const registry = createTextPackResourceRegistry(validManifests);
const generatedCatalog = createTextPackCatalog(registry);
expect(isTextPackCatalogV1(generatedCatalog), "Generated textpack catalog failed runtime validation.", generatedCatalog);
if (WRITE_MODE) {
  await writeFile(catalogPath, `${JSON.stringify(generatedCatalog, null, 2)}\n`);
}
const catalog = await readJson(catalogPath);
expect(validateCatalog(catalog), `${catalogPath} failed schemas/textpack-catalog-v1.schema.json`, validateCatalog.errors);
expect(JSON.stringify(catalog) === JSON.stringify(generatedCatalog), `${catalogPath} is stale; run node tools/validate-textpack-resources.mjs --write.`);
expect(catalog.packCount === 3, "Textpack catalog must include all committed reference packs.", catalog);
expect(catalog.resourceCount === 14, "Textpack catalog must include the committed reference resources.", catalog);
expect(catalog.reviewStates.join(",") === "candidate,reference", "Textpack catalog must preserve review-state coverage.", catalog.reviewStates);
expect(registry.languages.join(",") === "en,fr", "Registry languages must remain deterministic and include committed multilingual fixtures.", registry.languages);
expect(
  registry.kinds.join(",") === "benchmark,gazetteer,lexicon,morphology,rule,stopwords,tagset",
  "Registry resource kinds must remain deterministic.",
  registry.kinds,
);
expect(
  registry.families.join(",") === "benchmarks,gazetteers,lexicons,morphology,rules,stopwords,tagsets",
  "Registry resource families must remain deterministic.",
  registry.families,
);

const frenchStopwordLookup = queryTextPackResourceRegistry(registry, {
  kind: "stopwords",
  language: "fr",
});
expect(
  frenchStopwordLookup.diagnostics.length === 0 &&
    frenchStopwordLookup.resources.map((entry) => entry.resourceId).join(",") === "stopwords-fr-core",
  "Registry must select French stopword resources without unrelated mismatch diagnostics.",
  frenchStopwordLookup,
);

const uppercaseFrenchStopwordLookup = queryTextPackResourceRegistry(registry, {
  kind: "stopwords",
  language: "FR",
});
expect(
  uppercaseFrenchStopwordLookup.diagnostics.some((entry) => entry.code === "language-mismatch"),
  "Registry lookup must not lowercase language requests without a canonicalizer.",
  uppercaseFrenchStopwordLookup,
);

const canonicalFrenchStopwordLookup = queryTextPackResourceRegistry(registry, {
  kind: "stopwords",
  language: "FR",
  canonicalizer: textPackDemoTrimLowercaseCanonicalizer,
});
expect(
  canonicalFrenchStopwordLookup.resources.map((entry) => entry.resourceId).join(",") === "stopwords-fr-core",
  "Explicit canonicalized registry lookup failed.",
  canonicalFrenchStopwordLookup,
);

const loadedFrenchLexicon = loadTextPackRegistryResources(
  registry,
  { kind: "lexicon", language: "fr" },
  resourceContents,
);
const maisonLexiconEntry = lookupTextPackLoadedEntries(loadedFrenchLexicon.resources, "maisons")[0]?.entry;
expect(
  maisonLexiconEntry?.attributes.lemma === "maison" && maisonLexiconEntry.attributes.pos === "NOUN",
  "Registry-loaded French lexicon lookup failed.",
  loadedFrenchLexicon,
);

const hiddenMaisonEntry = lookupTextPackLoadedEntries(loadedFrenchLexicon.resources, "MAISONS")[0]?.entry;
expect(hiddenMaisonEntry === undefined, "Registry-loaded French lexicon lookup must not lowercase by default.", hiddenMaisonEntry);

const directFrenchStopwords = queryTextPackResourceRegistry(registry, {
  kind: "stopwords",
  resourceId: "stopwords-fr-core",
});
expect(directFrenchStopwords.resources[0]?.packId === "pack:fr-core", "Registry must support deterministic direct resource lookup.", directFrenchStopwords);

const missingContent = loadTextPackResources(validManifests, { kind: "stopwords" }, {});
expect(
  missingContent.diagnostics.some((entry) => entry.code === "resource-content-missing"),
  "Missing resource content must produce an explicit diagnostic.",
  missingContent,
);

const profileMismatchLookup = resolveTextPackResources(validManifests, {
  kind: "gazetteer",
  resourceId: "gazetteer-en-legal",
  language: "en",
  profile: "medical",
});
expect(
  profileMismatchLookup.diagnostics.some((entry) => entry.code === "profile-mismatch"),
  "Expected a profile-mismatch diagnostic for the medical gazetteer request.",
  profileMismatchLookup,
);

const languageMismatchLookup = resolveTextPackResources(validManifests, {
  kind: "stopwords",
  language: "de",
  profile: "legal",
});
expect(
  languageMismatchLookup.diagnostics.some((entry) => entry.code === "language-mismatch"),
  "Expected a language-mismatch diagnostic for the German stopword request.",
  languageMismatchLookup,
);

const schemaInvalidCases = [
  "fixtures/textpack/invalid/missing-provenance.json",
  "fixtures/textpack/invalid/missing-license.json",
];
for (const invalidPath of schemaInvalidCases) {
  const manifest = await readJson(invalidPath);
  expect(!validateManifest(manifest), `${invalidPath} must remain schema-invalid so required metadata is not optional.`);
}

const semanticInvalidCases = [
  {
    path: "fixtures/textpack/invalid/duplicate-resource-id.json",
    expectedCode: "duplicate-provides-id",
  },
];
for (const invalidCase of semanticInvalidCases) {
  const manifest = await readJson(invalidCase.path);
  expect(validateManifest(manifest), `${invalidCase.path} must remain schema-valid so semantic checks can falsify it.`, validateManifest.errors);
  const diagnostics = validateTextPackManifestGovernance(manifest).diagnostics;
  expect(
    diagnostics.some((entry) => entry.code === invalidCase.expectedCode),
    `${invalidCase.path} did not trigger ${invalidCase.expectedCode}.`,
    diagnostics,
  );
}

const overlayConflictManifests = [
  await readJson("fixtures/textpack/invalid/overlay-conflict-a.json"),
  await readJson("fixtures/textpack/invalid/overlay-conflict-b.json"),
];
for (const manifest of overlayConflictManifests) {
  expect(validateManifest(manifest), "Overlay conflict manifests must remain schema-valid.", validateManifest.errors);
}
const overlayConflictLookup = resolveTextPackResources(overlayConflictManifests, {
  kind: "stopwords",
  language: "en",
});
expect(
  overlayConflictLookup.diagnostics.some((entry) => entry.code === "overlay-conflict"),
  "Expected an overlay-conflict diagnostic.",
  overlayConflictLookup,
);

const composed = composeTextPackResources([
  { manifest: validManifests[0], precedence: 1 },
  { manifest: validManifests[1], precedence: 90 },
]);
const composedStopwords = queryTextPackResourceRegistry(composed, {
  kind: "stopwords",
  language: "en",
  profile: "legal",
});
expect(
  composedStopwords.resources[0]?.resourceId === "stopwords-en-legal",
  "Explicit overlay composition precedence must control deterministic order.",
  composedStopwords.resources.slice(0, 3),
);

console.log("Textpack resource fixtures OK.");
