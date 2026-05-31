import {
  addTextPackManifestResource,
  checkTextPackCompatibility,
  composeTextPackResources,
  createTextPackManifest,
  createTextPackCatalog,
  createTextPackManifestDraft,
  createTextPackResourceRegistry,
  isTextPackCatalogV1,
  isTextPackManifestV1,
  loadTextPackRegistryResources,
  loadTextPackFromFileSystem,
  loadTextPackResources,
  lookupTextPackLoadedEntries,
  parseTextPackResourceContent,
  planTextPackResourceTransaction,
  queryTextPackResourceRegistry,
  removeTextPackManifestResource,
  resolveTextPackResources,
  satisfiesTextPackVersionRange,
  type packageName,
  type TextPackManifestGovernanceDiagnosticCode,
  type TextPackManifestV1,
  textPackDemoTrimLowercaseCanonicalizer,
  textPackManifestVersion,
  updateTextPackManifestResource,
  updateTextPackManifest,
  validateTextPackAuthoringMetadata,
  validateTextPackManifestGovernance,
  validateTextPackResourceInventory,
} from "../src/index.ts";

const expectedPackageName: typeof packageName = "@ismail-elkorchi/textpack";

function required<T>(value: T | undefined, message: string): T {
  if (value === undefined) throw new Error(message);
  return value;
}

const sharedManifestFields = {
  manifestVersion: textPackManifestVersion,
  engines: {
    "@ismail-elkorchi/textpack": "^0.1.0",
  },
  externalData: {
    unicode: "17.0.0",
  },
  licenses: {
    code: ["MIT"],
    data: ["CC0-1.0"],
  },
  provenance: {
    sources: ["repo:fixtures/textpack"],
    generated: false,
    createdBy: ["text-computing"],
  },
  entrypoints: {
    manifest: "pack.manifest.json",
    load: "./dist/index.js",
  },
  tests: {
    smoke: ["test/smoke.spec.ts"],
    negative: ["test/negative.spec.ts"],
    representative: ["test/representative.spec.ts"],
  },
} as const;

const baseManifest: TextPackManifestV1 = {
  ...sharedManifestFields,
  id: "pack:en-core",
  packageName: "@ismail-elkorchi/textpack-en-core",
  version: "0.1.0",
  kind: ["language"],
  targets: {
    languages: ["en"],
    scripts: ["Latn"],
  },
  capabilities: {
    stopwords: true,
    lexicons: true,
    rules: true,
  },
  resources: {
    stopwords: ["fixtures/textpack/resources/textpack-en-core/stopwords.en.basic.txt"],
    lexicons: ["fixtures/textpack/resources/textpack-en-core/lexicon.en.simple.tsv"],
    rules: ["fixtures/textpack/resources/textpack-en-core/abbrev.en.common.txt"],
  },
  provides: {
    stopwords: ["stopwords-en-core"],
    lexicons: ["lexicon-en-core"],
    rules: ["abbrev-en-core"],
  },
  reviewState: "reference",
  composition: {
    overlayPrecedence: 10,
  },
};

const overlayManifest: TextPackManifestV1 = {
  ...sharedManifestFields,
  id: "pack:en-legal",
  packageName: "@ismail-elkorchi/textpack-en-legal",
  version: "0.1.0",
  kind: ["language", "domain"],
  targets: {
    languages: ["en"],
    scripts: ["Latn"],
    domains: ["legal"],
    profiles: ["legal"],
  },
  capabilities: {
    stopwords: true,
    gazetteers: true,
  },
  resources: {
    stopwords: ["fixtures/textpack/resources/textpack-en-legal/stopwords.en.legal.txt"],
    gazetteers: ["fixtures/textpack/resources/textpack-en-legal/gazetteer.en.legal.tsv"],
  },
  provides: {
    stopwords: ["stopwords-en-legal"],
    gazetteers: ["gazetteer-en-legal"],
  },
  reviewState: "candidate",
  composition: {
    overlayPrecedence: 50,
  },
};

const frenchManifest: TextPackManifestV1 = {
  ...sharedManifestFields,
  id: "pack:fr-core",
  packageName: "@ismail-elkorchi/textpack-fr-core",
  version: "0.1.0",
  kind: ["language"],
  targets: {
    languages: ["fr"],
    scripts: ["Latn"],
  },
  capabilities: {
    stopwords: true,
    lexicons: true,
  },
  resources: {
    stopwords: ["fixtures/textpack/resources/textpack-fr-core/stopwords.fr.basic.txt"],
    lexicons: ["fixtures/textpack/resources/textpack-fr-core/lexicon.fr.simple.tsv"],
  },
  provides: {
    stopwords: ["stopwords-fr-core"],
    lexicons: ["lexicon-fr-core"],
  },
  reviewState: "candidate",
  composition: {
    overlayPrecedence: 10,
  },
};

const baseStopwordsResourcePath = required(baseManifest.resources.stopwords?.[0], "base stopwords path must exist");
const baseLexiconResourcePath = required(baseManifest.resources.lexicons?.[0], "base lexicon path must exist");
const baseStopwordsResourceId = required(baseManifest.provides.stopwords?.[0], "base stopwords id must exist");

const lookupResult = resolveTextPackResources([baseManifest, overlayManifest], {
  kind: "stopwords",
  language: "en",
  profile: "legal",
});

const contentByPath = {
  "fixtures/textpack/resources/textpack-en-core/stopwords.en.basic.txt": "a\nan\nthe\nand\n",
  "fixtures/textpack/resources/textpack-en-legal/stopwords.en.legal.txt":
    "hereby\nthereof\ntherein\n",
  "fixtures/textpack/resources/textpack-en-core/lexicon.en.simple.tsv":
    "host\tlemma=host\tpos=VERB\ncorpora\tlemma=corpus\tpos=NOUN\n",
  "fixtures/textpack/resources/textpack-en-core/abbrev.en.common.txt": "Dr.\nMr.\nMs.\n",
  "fixtures/textpack/resources/textpack-en-legal/gazetteer.en.legal.tsv":
    "Supreme Court\tORG\nNew York\tGPE\n",
  "fixtures/textpack/resources/textpack-fr-core/stopwords.fr.basic.txt": "le\nla\nles\net\n",
  "fixtures/textpack/resources/textpack-fr-core/lexicon.fr.simple.tsv":
    "maisons\tlemma=maison\tpos=NOUN\nparle\tlemma=parler\tpos=VERB\n",
} as const;

if (!isTextPackManifestV1(baseManifest)) {
  throw new Error("base manifest should satisfy the pack manifest shape");
}

if (!isTextPackManifestV1(overlayManifest)) {
  throw new Error("overlay manifest should satisfy the pack manifest shape");
}

if (!isTextPackManifestV1(frenchManifest)) {
  throw new Error("French manifest should satisfy the pack manifest shape");
}

function expectGovernanceCodes(
  manifest: unknown,
  expectedCodes: readonly TextPackManifestGovernanceDiagnosticCode[],
  message: string,
): void {
  const codes = validateTextPackManifestGovernance(manifest).diagnostics.map((entry) => entry.code);
  for (const expectedCode of expectedCodes) {
    if (!codes.includes(expectedCode)) {
      throw new Error(`${message}: expected ${expectedCode}, got ${codes.join(",")}`);
    }
  }
}

const baseGovernance = validateTextPackManifestGovernance(baseManifest);
if (!baseGovernance.ok || baseGovernance.diagnostics.length !== 0) {
  throw new Error("base manifest should pass manifest governance validation");
}

expectGovernanceCodes({}, ["invalid-manifest-shape"], "invalid manifests should be diagnosed");

expectGovernanceCodes(
  {
    ...baseManifest,
    provides: {
      ...baseManifest.provides,
      stopwords: [],
    },
  },
  ["resource-provides-length-mismatch"],
  "empty provides arrays should be rejected by governance validation",
);

expectGovernanceCodes(
  {
    ...baseManifest,
    provides: {
      ...baseManifest.provides,
      stopwords: [baseStopwordsResourceId, "extra-id"],
    },
  },
  ["resource-provides-length-mismatch"],
  "resource/provides count mismatch should be diagnosed",
);

expectGovernanceCodes(
  {
    ...baseManifest,
    capabilities: {
      ...baseManifest.capabilities,
      benchmarks: true,
    },
  },
  ["capability-without-resource"],
  "capabilities without resources should be diagnosed",
);

expectGovernanceCodes(
  {
    ...baseManifest,
    capabilities: {
      lexicons: true,
      rules: true,
    },
  },
  ["resource-family-without-capability"],
  "resources without true capability flags should be diagnosed",
);

expectGovernanceCodes(
  {
    ...baseManifest,
    provides: {
      ...baseManifest.provides,
      lexicons: [baseStopwordsResourceId],
    },
  },
  ["duplicate-provides-id"],
  "duplicate provided logical ids should be diagnosed",
);

expectGovernanceCodes(
  {
    ...baseManifest,
    resources: {
      ...baseManifest.resources,
      stopwords: [baseStopwordsResourcePath, baseStopwordsResourcePath],
    },
    provides: {
      ...baseManifest.provides,
      stopwords: ["stopwords-en-core", "stopwords-en-core-copy"],
    },
  },
  ["duplicate-resource-path"],
  "duplicate package-relative resource paths should be diagnosed",
);

expectGovernanceCodes(
  {
    ...baseManifest,
    resources: {
      ...baseManifest.resources,
      stopwords: ["../outside/stopwords.txt"],
    },
    entrypoints: {
      ...baseManifest.entrypoints,
      manifest: "/tmp/textpack.json",
      load: "C:\\packs",
    },
    tests: {
      ...baseManifest.tests,
      smoke: ["https://example.invalid/smoke"],
    },
  },
  ["unsafe-resource-path", "unsafe-entrypoint-path", "unsafe-test-ref"],
  "unsafe manifest paths and refs should be diagnosed",
);

expectGovernanceCodes(
  {
    ...baseManifest,
    resources: {
      ...baseManifest.resources,
      stopwords: [baseStopwordsResourcePath, baseLexiconResourcePath],
    },
    provides: {
      ...baseManifest.provides,
      stopwords: ["stopwords-en-core", "stopwords-en-core"],
    },
  },
  ["overlay-conflict"],
  "same lookup key and overlay precedence should be diagnosed",
);

const overlayStopwordsResource = required(
  lookupResult.resources[0],
  "legal stopword overlay should resolve",
);
const baseResolvedStopwordsResource = required(
  lookupResult.resources[1],
  "base stopword resource should resolve after overlay",
);

if (overlayStopwordsResource.resourceId !== "stopwords-en-legal") {
  throw new Error("profile-specific overlay should sort ahead of the base pack");
}

if (baseResolvedStopwordsResource.resourceId !== "stopwords-en-core") {
  throw new Error("base pack should remain available after the overlay resource");
}

if (
  overlayStopwordsResource.provenance.id !== "provenance:manifest" ||
  overlayStopwordsResource.license.id !== "license:data"
) {
  throw new Error("resolved resources should retain derived provenance and license metadata");
}

const compatibility = checkTextPackCompatibility(baseManifest, {
  packageVersions: { "@ismail-elkorchi/textpack": "0.1.0" },
  mandatoryResources: ["stopwords-en-core"],
  minimumReviewState: "candidate",
});
if (!compatibility.ok) {
  throw new Error("compatible manifest policy should pass");
}

const incompatible = checkTextPackCompatibility(overlayManifest, {
  packageVersions: { "@ismail-elkorchi/textpack": "0.0.1" },
  requiredProfiles: ["medical"],
  mandatoryResources: ["gazetteer-missing"],
  minimumReviewState: "reference",
  activePackIds: ["pack:en-core"],
});
if (
  !incompatible.diagnostics.some((entry) => entry.code === "engine-version-incompatible") ||
  !incompatible.diagnostics.some((entry) => entry.code === "profile-missing") ||
  !incompatible.diagnostics.some((entry) => entry.code === "mandatory-resource-missing") ||
  !incompatible.diagnostics.some((entry) => entry.code === "review-state-too-low")
) {
  throw new Error("incompatible policy should report engine, profile, resource, and review-state diagnostics");
}

if (
  !satisfiesTextPackVersionRange("0.1.5", "^0.1.0") ||
  satisfiesTextPackVersionRange("0.2.0", "~0.1.0") ||
  !satisfiesTextPackVersionRange("0.1.0", ">=0.1.0")
) {
  throw new Error("version range helper should support exact, caret, tilde, wildcard, and lower-bound ranges");
}

const composedRegistry = composeTextPackResources([
  { manifest: baseManifest, precedence: 5 },
  { manifest: overlayManifest, precedence: 80 },
]);
const composedStopwords = queryTextPackResourceRegistry(composedRegistry, {
  kind: "stopwords",
  language: "en",
  profile: "legal",
});
if (composedStopwords.resources[0]?.resourceId !== "stopwords-en-legal") {
  throw new Error("explicit composition precedence should override manifest precedence");
}

const loadedStopwords = loadTextPackResources(
  [baseManifest, overlayManifest],
  {
    kind: "stopwords",
    language: "en",
    profile: "legal",
  },
  contentByPath,
);

if (loadedStopwords.diagnostics.length !== 0) {
  throw new Error("valid stopword fixture content should load without diagnostics");
}

if (loadedStopwords.resources.map((entry) => entry.resource.resourceId).join(",") !==
  "stopwords-en-legal,stopwords-en-core") {
  throw new Error("loaded stopword resources should preserve deterministic overlay ordering");
}

const legalStopwordMatches = lookupTextPackLoadedEntries(loadedStopwords.resources, "Thereof");
if (legalStopwordMatches.length !== 0) {
  throw new Error("loaded stopword lookup should be exact by default");
}

const canonicalLegalStopwordMatches = lookupTextPackLoadedEntries(loadedStopwords.resources, "Thereof", {
  canonicalizer: textPackDemoTrimLowercaseCanonicalizer,
});
const canonicalLegalStopword = canonicalLegalStopwordMatches[0];
const canonicalLegalStopwordMetadata = canonicalLegalStopword?.canonicalization;
if (
  canonicalLegalStopword?.resource.resourceId !== "stopwords-en-legal" ||
  canonicalLegalStopwordMetadata?.canonicalizerId !== "textpack.demo.trim-lowercase" ||
  canonicalLegalStopwordMetadata?.query.originalValue !== "Thereof" ||
  canonicalLegalStopwordMetadata?.query.canonicalValue !== "thereof" ||
  canonicalLegalStopwordMetadata?.entry.originalValue !== "thereof" ||
  canonicalLegalStopwordMetadata?.entry.canonicalValue !== "thereof"
) {
  throw new Error("explicit canonicalized stopword lookup should preserve canonicalization metadata");
}

const exactLegalStopwordMatches = lookupTextPackLoadedEntries(loadedStopwords.resources, "thereof");
if (exactLegalStopwordMatches[0]?.resource.resourceId !== "stopwords-en-legal") {
  throw new Error("loaded stopword lookup should preserve resource metadata");
}

const baseStopwordMatches = lookupTextPackLoadedEntries(loadedStopwords.resources, "THE");
if (baseStopwordMatches.length !== 0) {
  throw new Error("base stopword lookup should not use hidden case folding");
}

const canonicalBaseStopwordMatches = lookupTextPackLoadedEntries(loadedStopwords.resources, "THE", {
  canonicalizer: textPackDemoTrimLowercaseCanonicalizer,
});
if (canonicalBaseStopwordMatches[0]?.resource.resourceId !== "stopwords-en-core") {
  throw new Error("base stopword lookup should remain available after profile overlays");
}

const loadedLexicon = loadTextPackResources(
  [baseManifest],
  {
    kind: "lexicon",
    language: "en",
  },
  contentByPath,
);
const loadedLexiconResource = required(
  loadedLexicon.resources[0]?.resource,
  "English lexicon resource should load",
);

const hiddenHostEntry = lookupTextPackLoadedEntries(loadedLexicon.resources, "HOST")[0]?.entry;
if (hiddenHostEntry !== undefined) {
  throw new Error("lexicon lookup should not case-fold without a caller-provided canonicalizer");
}

const hostEntry = lookupTextPackLoadedEntries(loadedLexicon.resources, "host")[0]?.entry;
if (hostEntry?.attributes.lemma !== "host" || hostEntry.attributes.pos !== "VERB") {
  throw new Error("lexicon loading should parse deterministic key=value attributes");
}

const canonicalHostEntry = lookupTextPackLoadedEntries(loadedLexicon.resources, "HOST", {
  canonicalizer: textPackDemoTrimLowercaseCanonicalizer,
})[0]?.entry;
if (canonicalHostEntry?.attributes.lemma !== "host" || canonicalHostEntry.attributes.pos !== "VERB") {
  throw new Error("explicit canonicalized lexicon lookup should parse deterministic key=value attributes");
}

const loadedGazetteer = loadTextPackResources(
  [overlayManifest],
  {
    kind: "gazetteer",
    language: "en",
    profile: "legal",
  },
  contentByPath,
);

const hiddenCourtEntry = lookupTextPackLoadedEntries(loadedGazetteer.resources, "supreme court")[0]?.entry;
if (hiddenCourtEntry !== undefined) {
  throw new Error("gazetteer lookup should not case-fold without a caller-provided canonicalizer");
}

const courtEntry = lookupTextPackLoadedEntries(loadedGazetteer.resources, "Supreme Court")[0]?.entry;
if (courtEntry?.label !== "ORG") {
  throw new Error("gazetteer loading should parse labels");
}

const canonicalCourtEntry = lookupTextPackLoadedEntries(loadedGazetteer.resources, "supreme court", {
  canonicalizer: textPackDemoTrimLowercaseCanonicalizer,
})[0]?.entry;
if (canonicalCourtEntry?.label !== "ORG") {
  throw new Error("explicit canonicalized gazetteer lookup should parse labels");
}

const registry = createTextPackResourceRegistry([baseManifest, overlayManifest, frenchManifest]);
if (registry.languages.join(",") !== "en,fr") {
  throw new Error("registry should expose deterministic exact language coverage");
}

if (registry.kinds.join(",") !== "gazetteer,lexicon,rule,stopwords") {
  throw new Error("registry should expose deterministic resource kinds");
}

if (registry.families.join(",") !== "gazetteers,lexicons,rules,stopwords") {
  throw new Error("registry should expose deterministic resource families");
}

const catalog = createTextPackCatalog(registry);
if (!isTextPackCatalogV1(catalog)) {
  throw new Error("textpack catalog should satisfy the runtime contract");
}

if (catalog.packCount !== 3 || catalog.resourceCount !== 7) {
  throw new Error("textpack catalog should summarize pack and resource counts");
}

if (catalog.packs.map((entry) => entry.id).join(",") !== "pack:en-core,pack:en-legal,pack:fr-core") {
  throw new Error("textpack catalog should expose deterministic pack ordering");
}

if (
  catalog.resourcesByFamily.map((entry) => `${entry.family}:${entry.resourceCount}`).join(",") !==
  "gazetteers:1,lexicons:2,rules:1,stopwords:3"
) {
  throw new Error("textpack catalog should summarize resources by family");
}

const frenchStopwords = queryTextPackResourceRegistry(registry, {
  kind: "stopwords",
  language: "fr",
});
if (
  frenchStopwords.diagnostics.length !== 0 ||
  frenchStopwords.resources.map((entry) => entry.resourceId).join(",") !== "stopwords-fr-core"
) {
  throw new Error("registry query should select French stopwords without unrelated mismatch noise");
}

const uppercaseFrenchStopwords = queryTextPackResourceRegistry(registry, {
  kind: "stopwords",
  language: "FR",
});
if (!uppercaseFrenchStopwords.diagnostics.some((entry) => entry.code === "language-mismatch")) {
  throw new Error("registry query should not case-fold language requests without a canonicalizer");
}

const canonicalFrenchStopwords = queryTextPackResourceRegistry(registry, {
  kind: "stopwords",
  language: "FR",
  canonicalizer: textPackDemoTrimLowercaseCanonicalizer,
});
if (canonicalFrenchStopwords.resources.map((entry) => entry.resourceId).join(",") !== "stopwords-fr-core") {
  throw new Error("registry query should support explicit canonicalized language requests");
}

const loadedFrenchLexicon = loadTextPackRegistryResources(
  registry,
  {
    kind: "lexicon",
    language: "fr",
  },
  contentByPath,
);
const hiddenMaisonEntry = lookupTextPackLoadedEntries(loadedFrenchLexicon.resources, "MAISONS")[0]?.entry;
if (hiddenMaisonEntry !== undefined) {
  throw new Error("multilingual lexicon lookup should not lowercase without a caller-provided canonicalizer");
}

const maisonEntry = lookupTextPackLoadedEntries(loadedFrenchLexicon.resources, "maisons")[0]?.entry;
if (maisonEntry?.attributes.lemma !== "maison" || maisonEntry.attributes.pos !== "NOUN") {
  throw new Error("registry loading should preserve multilingual lexicon attributes");
}

const canonicalMaisonEntry = lookupTextPackLoadedEntries(loadedFrenchLexicon.resources, "MAISONS", {
  canonicalizer: textPackDemoTrimLowercaseCanonicalizer,
})[0]?.entry;
if (canonicalMaisonEntry?.attributes.lemma !== "maison" || canonicalMaisonEntry.attributes.pos !== "NOUN") {
  throw new Error("explicit canonicalized multilingual lexicon lookup should preserve attributes");
}

const directFrenchResource = queryTextPackResourceRegistry(registry, {
  kind: "stopwords",
  resourceId: "stopwords-fr-core",
});
if (directFrenchResource.resources[0]?.packId !== "pack:fr-core") {
  throw new Error("registry query should support direct resource selection");
}

const familyQuery = queryTextPackResourceRegistry(registry, {
  family: "gazetteers",
  language: "en",
  profile: "legal",
});
if (familyQuery.resources[0]?.kind !== "gazetteer") {
  throw new Error("registry query should support resource-family selection");
}

const missingContent = loadTextPackResources([baseManifest], { kind: "stopwords" }, {});
if (!missingContent.diagnostics.some((entry) => entry.code === "resource-content-missing")) {
  throw new Error("missing resource content should produce an explicit diagnostic");
}

const caseDistinctParsed = parseTextPackResourceContent(overlayStopwordsResource, "the\nThe\n");
if (caseDistinctParsed.diagnostics.some((entry) => entry.code === "duplicate-resource-entry")) {
  throw new Error("case-distinct loaded entries should not duplicate under exact parsing");
}

const duplicateParsed = parseTextPackResourceContent(overlayStopwordsResource, "the\nthe\n");
if (!duplicateParsed.diagnostics.some((entry) => entry.code === "duplicate-resource-entry")) {
  throw new Error("exact duplicate loaded entries should produce a diagnostic");
}

const canonicalDuplicateParsed = parseTextPackResourceContent(overlayStopwordsResource, "the\nThe\n", {
  canonicalizer: textPackDemoTrimLowercaseCanonicalizer,
});
if (!canonicalDuplicateParsed.diagnostics.some((entry) => entry.code === "duplicate-resource-entry")) {
  throw new Error("explicit canonicalized duplicate loaded entries should produce a diagnostic");
}

const malformedLexicon = parseTextPackResourceContent(
  loadedLexiconResource,
  "broken\tlemma\nvalid\tlemma=valid\tpos=ADJ\n",
);
if (
  !malformedLexicon.diagnostics.some((entry) => entry.code === "malformed-resource-row") ||
  lookupTextPackLoadedEntries(
    [{ resource: loadedLexiconResource, entries: malformedLexicon.entries }],
    "broken",
  ).length !== 0
) {
  throw new Error("malformed lexicon rows should be diagnosed and excluded from loaded entries");
}

const authoredManifest = createTextPackManifestDraft({
  id: "pack:es-heldout",
  packageName: "@ismail-elkorchi/textpack-es-heldout",
  version: "0.1.0",
  kind: ["language"],
  targets: {
    languages: ["es"],
    scripts: ["Latn"],
  },
  resources: {
    stopwords: ["resources/stopwords.es.heldout.txt"],
    lexicons: ["resources/lexicon.es.heldout.tsv"],
  },
  provides: {
    stopwords: ["stopwords-es-heldout"],
    lexicons: ["lexicon-es-heldout"],
  },
  licenses: {
    code: ["MIT"],
    data: ["CC0-1.0"],
  },
  provenance: {
    sources: ["repo:fixtures/textpack/heldout/es-authoring"],
    generated: false,
    createdBy: ["textpack-authoring-test"],
  },
  tests: {
    smoke: ["test/smoke.spec.ts"],
    negative: ["test/negative.spec.ts"],
    representative: ["test/representative.spec.ts"],
  },
  reviewState: "experimental",
  limitations: ["Held-out authoring fixture; not broad Spanish resource coverage."],
});
if (!isTextPackManifestV1(authoredManifest)) {
  throw new Error("authored manifest should satisfy the runtime manifest shape");
}
if (!authoredManifest.capabilities.stopwords || !authoredManifest.capabilities.lexicons) {
  throw new Error("manifest authoring should derive capability flags from declared resources");
}
if (!validateTextPackManifestGovernance(authoredManifest).ok) {
  throw new Error("authored manifest should pass governance validation");
}

const promotedManifest = updateTextPackManifest(authoredManifest, {
  reviewState: "candidate",
  version: "0.1.1",
  provenanceNotes: ["Reviewed fixture paths and resource ids during authoring workflow."],
});
if (promotedManifest.reviewState !== "candidate" || promotedManifest.version !== "0.1.1") {
  throw new Error("manifest update should preserve deterministic review-state and version transitions");
}
if (!promotedManifest.provenance.notes?.includes("Reviewed fixture paths and resource ids during authoring workflow.")) {
  throw new Error("manifest update should append provenance notes");
}
const promotedCompatibility = checkTextPackCompatibility(promotedManifest, {
  packageVersions: {
    "@ismail-elkorchi/textpack": "0.1.0",
  },
  minimumReviewState: "candidate",
  mandatoryResources: ["stopwords-es-heldout", "lexicon-es-heldout"],
});
if (!promotedCompatibility.ok) {
  throw new Error("promoted authoring manifest should satisfy compatibility policy");
}

const resourceUpdatedManifest = updateTextPackManifest(authoredManifest, {
  resources: {
    stopwords: ["resources/stopwords.es.heldout.txt"],
  },
  provides: {
    stopwords: ["stopwords-es-heldout"],
  },
});
if (resourceUpdatedManifest.capabilities.lexicons !== undefined || resourceUpdatedManifest.capabilities.stopwords !== true) {
  throw new Error("manifest update should rederive capability flags when resources change");
}

const malformedAuthoredManifest = createTextPackManifestDraft({
  ...authoredManifest,
  reviewState: "experimental",
  provides: {
    stopwords: ["stopwords-es-heldout"],
  },
});
expectGovernanceCodes(
  malformedAuthoredManifest,
  ["resource-provides-length-mismatch"],
  "authoring workflow should preserve falsifiable resource/provides mismatches",
);

const createdManifest = createTextPackManifest({
  id: "pack:authoring-smoke",
  packageName: "@ismail-elkorchi/textpack-authoring-smoke",
  version: "0.1.0",
  kind: ["language"],
  targets: {
    languages: ["en"],
    scripts: ["Latn"],
    profiles: ["authoring"],
  },
  resources: {
    stopwords: ["resources/stopwords.en.authoring.txt"],
  },
  provides: {
    stopwords: ["stopwords-en-authoring"],
  },
  licenses: {
    code: ["MIT"],
    data: ["CC0-1.0"],
  },
  provenance: {
    sources: ["repo:packages/textpack/test"],
    generated: false,
  },
  tests: {
    smoke: ["test:authoring:smoke"],
    negative: ["test:authoring:negative"],
    representative: ["test:authoring:representative"],
  },
});

if (!validateTextPackAuthoringMetadata(createdManifest).ok) {
  throw new Error("created manifest should validate license, provenance, and review metadata");
}

const manifestMissingLicense = {
  ...createdManifest,
  licenses: {
    code: [],
    data: [],
  },
};
if (!validateTextPackAuthoringMetadata(manifestMissingLicense).diagnostics.some((entry) => entry.code === "missing-license")) {
  throw new Error("authoring metadata validation should reject missing license metadata");
}

const manifestMissingProvenance = {
  ...createdManifest,
  provenance: {
    ...createdManifest.provenance,
    sources: [],
  },
};
if (!validateTextPackAuthoringMetadata(manifestMissingProvenance).diagnostics.some((entry) => entry.code === "missing-provenance")) {
  throw new Error("authoring metadata validation should reject missing provenance metadata");
}

const addedResourceManifest = addTextPackManifestResource(createdManifest, {
  family: "lexicons",
  resourcePath: "resources/lexicon.en.authoring.tsv",
  resourceId: "lexicon-en-authoring",
});
if (
  addedResourceManifest.resources.lexicons?.join(",") !== "resources/lexicon.en.authoring.tsv" ||
  addedResourceManifest.provides.lexicons?.join(",") !== "lexicon-en-authoring" ||
  addedResourceManifest.capabilities.lexicons !== true
) {
  throw new Error("resource authoring should add paired resource paths, ids, and capability flags");
}

const duplicateResourceManifest = addTextPackManifestResource(createdManifest, {
  family: "stopwords",
  resourcePath: "resources/stopwords.en.authoring.duplicate.txt",
  resourceId: "stopwords-en-authoring",
});
if (!validateTextPackAuthoringMetadata(duplicateResourceManifest).diagnostics.some((entry) => entry.code === "duplicate-provides-id")) {
  throw new Error("resource authoring should preserve duplicate-resource diagnostics");
}

const updatedResourceManifest = updateTextPackManifestResource(createdManifest, "stopwords-en-authoring", {
  resourcePath: "resources/stopwords.en.authoring.updated.txt",
  resourceId: "stopwords-en-authoring-v2",
});
if (
  updatedResourceManifest.resources.stopwords?.join(",") !== "resources/stopwords.en.authoring.updated.txt" ||
  updatedResourceManifest.provides.stopwords?.join(",") !== "stopwords-en-authoring-v2"
) {
  throw new Error("resource authoring should update paired resource path and id deterministically");
}

const removedResourceManifest = removeTextPackManifestResource(addedResourceManifest, "lexicon-en-authoring");
if (
  removedResourceManifest.resources.lexicons !== undefined ||
  removedResourceManifest.provides.lexicons !== undefined ||
  removedResourceManifest.capabilities.lexicons !== undefined ||
  removedResourceManifest.resources.stopwords?.join(",") !== "resources/stopwords.en.authoring.txt"
) {
  throw new Error("resource authoring should remove paired resource paths, ids, and derived capability flags");
}

let missingRemoveRejected = false;
try {
  removeTextPackManifestResource(createdManifest, "missing-resource");
} catch (error) {
  missingRemoveRejected = error instanceof RangeError && error.message.includes("missing-resource");
}
if (!missingRemoveRejected) {
  throw new Error("resource removal should reject unknown resource ids");
}

const validInventory = validateTextPackResourceInventory(createdManifest, [
  "resources/stopwords.en.authoring.txt",
]);
if (
  !validInventory.ok ||
  validInventory.declaredResourceCount !== 1 ||
  validInventory.inventoryResourceCount !== 1 ||
  validInventory.resourceFamilies.map((entry) => `${entry.family}:${entry.declaredResourceCount}`).join(",") !== "stopwords:1"
) {
  throw new Error("resource inventory validation should accept matching declared files");
}

const missingInventory = validateTextPackResourceInventory(createdManifest, []);
if (
  missingInventory.ok ||
  missingInventory.missingResourceCount !== 1 ||
  missingInventory.diagnostics[0]?.code !== "missing-resource-file"
) {
  throw new Error("resource inventory validation should diagnose missing declared resources deterministically");
}

const orphanInventory = validateTextPackResourceInventory(createdManifest, [
  "resources/orphan.en.authoring.txt",
  "resources/stopwords.en.authoring.txt",
]);
if (
  orphanInventory.ok ||
  orphanInventory.orphanResourceCount !== 1 ||
  !orphanInventory.diagnostics.some((entry) => entry.code === "orphan-resource-file" && entry.path === "resources/orphan.en.authoring.txt")
) {
  throw new Error("resource inventory validation should diagnose orphan resource files");
}

const duplicateInventory = validateTextPackResourceInventory(duplicateResourceManifest, [
  "resources/stopwords.en.authoring.duplicate.txt",
  "resources/stopwords.en.authoring.txt",
]);
if (
  duplicateInventory.ok ||
  duplicateInventory.duplicateProvidedIdCount !== 1 ||
  !duplicateInventory.diagnostics.some((entry) => entry.code === "duplicate-provides-id")
) {
  throw new Error("resource inventory validation should surface duplicate provided ids");
}

const staleAfterRemoveInventory = validateTextPackResourceInventory(removedResourceManifest, [
  "resources/lexicon.en.authoring.tsv",
  "resources/stopwords.en.authoring.txt",
]);
if (
  staleAfterRemoveInventory.ok ||
  staleAfterRemoveInventory.orphanResourceCount !== 1 ||
  staleAfterRemoveInventory.diagnostics[0]?.code !== "orphan-resource-file"
) {
  throw new Error("resource inventory validation should catch stale files after manifest resource removal");
}

const stalePairInventory = validateTextPackResourceInventory(
  {
    ...createdManifest,
    resources: {
      stopwords: [
        "resources/z-last.txt",
        "resources/a-first.txt",
      ],
    },
    provides: {
      stopwords: ["stopwords-en-authoring"],
    },
  },
  ["resources/orphan-b.txt", "resources/orphan-a.txt"],
);
if (
  stalePairInventory.stalePairCount !== 1 ||
  stalePairInventory.diagnostics.map((entry) => `${entry.code}:${entry.path ?? entry.ref ?? ""}`).join(",") !==
    "missing-resource-file:resources/a-first.txt,missing-resource-file:resources/z-last.txt,orphan-resource-file:resources/orphan-a.txt,orphan-resource-file:resources/orphan-b.txt,resource-provides-length-mismatch:stopwords"
) {
  throw new Error("resource inventory validation should return diagnostics in deterministic order");
}

const addTransaction = planTextPackResourceTransaction({
  manifest: createdManifest,
  operation: {
    action: "add-resource",
    resource: {
      family: "lexicons",
      resourcePath: "resources/lexicon.en.authoring.tsv",
      resourceId: "lexicon-en-authoring",
    },
  },
  inventoryResourcePaths: ["resources/stopwords.en.authoring.txt"],
});
if (
  !addTransaction.ok ||
  addTransaction.action !== "add-resource" ||
  addTransaction.changedResourcePaths.join(",") !== "resources/lexicon.en.authoring.tsv" ||
  addTransaction.expectedInventoryResourcePaths.join(",") !==
    "resources/lexicon.en.authoring.tsv,resources/stopwords.en.authoring.txt" ||
  addTransaction.afterInventory.ok !== true ||
  addTransaction.nextManifest.provides.lexicons?.join(",") !== "lexicon-en-authoring"
) {
  throw new Error("resource transaction planning should add a resource and audit the expected inventory");
}

const updateTransaction = planTextPackResourceTransaction({
  manifest: createdManifest,
  operation: {
    action: "update-resource",
    resourceId: "stopwords-en-authoring",
    update: {
      resourcePath: "resources/stopwords.en.authoring.updated.txt",
      resourceId: "stopwords-en-authoring-v2",
    },
  },
  inventoryResourcePaths: ["resources/stopwords.en.authoring.txt"],
});
if (
  !updateTransaction.ok ||
  updateTransaction.changedResourcePaths.join(",") !== "resources/stopwords.en.authoring.updated.txt" ||
  updateTransaction.removedResourcePaths.join(",") !== "resources/stopwords.en.authoring.txt" ||
  updateTransaction.expectedInventoryResourcePaths.join(",") !== "resources/stopwords.en.authoring.updated.txt" ||
  updateTransaction.afterInventory.ok !== true
) {
  throw new Error("resource transaction planning should update manifest pairs and inventory paths deterministically");
}

const removeTransaction = planTextPackResourceTransaction({
  manifest: createdManifest,
  operation: {
    action: "remove-resource",
    resourceId: "stopwords-en-authoring",
  },
  inventoryResourcePaths: ["resources/stopwords.en.authoring.txt"],
});
if (
  !removeTransaction.ok ||
  removeTransaction.removedResourcePaths.join(",") !== "resources/stopwords.en.authoring.txt" ||
  removeTransaction.expectedInventoryResourcePaths.length !== 0 ||
  removeTransaction.afterInventory.ok !== true ||
  removeTransaction.nextManifest.resources.stopwords !== undefined
) {
  throw new Error("resource transaction planning should remove paired manifest entries and inventory paths");
}

const duplicateTransaction = planTextPackResourceTransaction({
  manifest: createdManifest,
  operation: {
    action: "add-resource",
    resource: {
      family: "stopwords",
      resourcePath: "resources/stopwords.en.authoring.duplicate.txt",
      resourceId: "stopwords-en-authoring",
    },
  },
  inventoryResourcePaths: [
    "resources/stopwords.en.authoring.duplicate.txt",
    "resources/stopwords.en.authoring.txt",
  ],
});
if (
  duplicateTransaction.ok ||
  duplicateTransaction.beforeMetadata.ok !== true ||
  duplicateTransaction.afterMetadata.ok !== false ||
  !duplicateTransaction.diagnostics.some((entry) => entry.code === "duplicate-provides-id")
) {
  throw new Error("resource transaction planning should reject duplicate provided ids after mutation");
}

const missingTransaction = planTextPackResourceTransaction({
  manifest: createdManifest,
  operation: {
    action: "remove-resource",
    resourceId: "missing-resource",
  },
  inventoryResourcePaths: ["resources/stopwords.en.authoring.txt"],
});
if (
  missingTransaction.ok ||
  missingTransaction.diagnostics.map((entry) => `${entry.code}:${entry.resourceId ?? ""}`).join(",") !==
    "resource-not-found:missing-resource"
) {
  throw new Error("resource transaction planning should report missing resource ids deterministically");
}

const authoringOverlayConflictManifest = addTextPackManifestResource(createdManifest, {
  family: "stopwords",
  resourcePath: "resources/stopwords.en.authoring.conflict.txt",
  resourceId: "stopwords-en-authoring",
});
if (!validateTextPackAuthoringMetadata(authoringOverlayConflictManifest).diagnostics.some((entry) => entry.code === "overlay-conflict")) {
  throw new Error("same-scope resource authoring should expose overlay conflict diagnostics");
}

const profileMismatchLoad = loadTextPackResources(
  [createdManifest],
  {
    kind: "stopwords",
    language: "en",
    profile: "legal",
  },
  {
    "resources/stopwords.en.authoring.txt": "the\n",
  },
);
if (!profileMismatchLoad.diagnostics.some((entry) => entry.code === "profile-mismatch")) {
  throw new Error("language/profile mismatch should remain explicit during authored pack loading");
}

const filesystemLoaded = await loadTextPackFromFileSystem({
  manifest: updatedResourceManifest,
  root: "/virtual/textpack-authoring",
  request: {
    kind: "stopwords",
    language: "en",
    profile: "authoring",
  },
  readText(resourcePath) {
    if (resourcePath !== "/virtual/textpack-authoring/resources/stopwords.en.authoring.updated.txt") {
      throw new Error(`unexpected filesystem path: ${resourcePath}`);
    }
    return "Alpha\nBeta\n";
  },
});
const filesystemMatches = lookupTextPackLoadedEntries(filesystemLoaded.resources, "Beta");
if (
  filesystemLoaded.diagnostics.length !== 0 ||
  filesystemLoaded.resources.map((entry) => entry.resource.resourceId).join(",") !== "stopwords-en-authoring-v2" ||
  filesystemMatches[0]?.entry.value !== "Beta"
) {
  throw new Error("filesystem pack loading should preserve deterministic resource lookup after update");
}

let unsafeManifestReadAttempted = false;
const unsafeFilesystemLoad = await loadTextPackFromFileSystem({
  manifest: {
    ...createdManifest,
    resources: {
      stopwords: ["../outside.txt"],
    },
  },
  root: "/virtual/textpack-authoring",
  readText() {
    unsafeManifestReadAttempted = true;
    return "unsafe\n";
  },
});
if (
  unsafeManifestReadAttempted ||
  !unsafeFilesystemLoad.diagnostics.some((entry) => entry.code === "unsafe-resource-path")
) {
  throw new Error("filesystem loading should validate manifest governance before reading resources");
}

void expectedPackageName;
