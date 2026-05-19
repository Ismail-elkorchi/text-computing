import {
  createTextPackResourceRegistry,
  isTextPackManifestV1,
  loadTextPackRegistryResources,
  loadTextPackResources,
  lookupTextPackLoadedEntries,
  parseTextPackResourceContent,
  queryTextPackResourceRegistry,
  resolveTextPackResources,
  type packageName,
  type TextPackManifestGovernanceDiagnosticCode,
  type TextPackManifestV1,
  textPackDemoTrimLowercaseCanonicalizer,
  textPackManifestSchemaVersion,
  validateTextPackManifestGovernance,
} from "../src/index.ts";

const expectedPackageName: typeof packageName = "@ismail-elkorchi/textpack";

function required<T>(value: T | undefined, message: string): T {
  if (value === undefined) throw new Error(message);
  return value;
}

const baseManifest: TextPackManifestV1 = {
  schemaVersion: textPackManifestSchemaVersion,
  packId: "pack:en-core",
  packageName: "@ismail-elkorchi/textpack-en-core",
  version: "0.0.0",
  resources: [
    {
      resourceId: "stopwords-en-core",
      lookupKey: "stopwords.en.core",
      kind: "stopwords",
      path: "fixtures/textpack/resources/textpack-en-core/stopwords.en.basic.txt",
      language: "en",
      overlayPrecedence: 10,
      licenseId: "license-cc0",
      provenanceId: "prov-hand-curated",
    },
    {
      resourceId: "lexicon-en-core",
      lookupKey: "lexicon.en.core",
      kind: "lexicon",
      path: "fixtures/textpack/resources/textpack-en-core/lexicon.en.simple.tsv",
      language: "en",
      overlayPrecedence: 10,
      licenseId: "license-cc0",
      provenanceId: "prov-hand-curated",
    },
    {
      resourceId: "abbrev-en-core",
      lookupKey: "abbreviation.en.core",
      kind: "abbreviation-list",
      path: "fixtures/textpack/resources/textpack-en-core/abbrev.en.common.txt",
      language: "en",
      overlayPrecedence: 10,
      licenseId: "license-cc0",
      provenanceId: "prov-hand-curated",
    },
  ],
  licenses: [
    {
      id: "license-cc0",
      spdx: "CC0-1.0",
    },
  ],
  provenance: [
    {
      id: "prov-hand-curated",
      origin: "repository-fixture",
      createdBy: "text-computing",
    },
  ],
  entrypoints: {
    manifest: "fixtures/textpack/manifests/textpack-en-core.json",
    resourceRoot: "fixtures/textpack/resources",
  },
  tests: {
    smoke: ["fixtures/textpack/resources/textpack-en-core/stopwords.en.basic.txt"],
    lookup: ["lookup:stopwords:en"],
    overlay: ["overlay:stopwords:en"],
  },
};

const baseStopwordsResource = required(
  baseManifest.resources[0],
  "base stopword resource fixture must exist",
);
const baseLexiconResource = required(
  baseManifest.resources[1],
  "base lexicon resource fixture must exist",
);
const baseLicense = required(baseManifest.licenses[0], "base license fixture must exist");
const baseProvenance = required(baseManifest.provenance[0], "base provenance fixture must exist");

const overlayManifest: TextPackManifestV1 = {
  schemaVersion: textPackManifestSchemaVersion,
  packId: "pack:en-legal",
  packageName: "@ismail-elkorchi/textpack-en-legal",
  version: "0.0.0",
  resources: [
    {
      resourceId: "stopwords-en-legal",
      lookupKey: "stopwords.en.core",
      kind: "stopwords",
      path: "fixtures/textpack/resources/textpack-en-legal/stopwords.en.legal.txt",
      language: "en",
      profiles: ["legal"],
      overlayPrecedence: 50,
      licenseId: "license-cc0",
      provenanceId: "prov-hand-curated",
    },
    {
      resourceId: "gazetteer-en-legal",
      lookupKey: "gazetteer.en.courts",
      kind: "gazetteer",
      path: "fixtures/textpack/resources/textpack-en-legal/gazetteer.en.legal.tsv",
      language: "en",
      profiles: ["legal"],
      overlayPrecedence: 50,
      licenseId: "license-cc0",
      provenanceId: "prov-hand-curated",
    },
  ],
  licenses: baseManifest.licenses,
  provenance: baseManifest.provenance,
  entrypoints: {
    manifest: "fixtures/textpack/manifests/textpack-en-legal.json",
    resourceRoot: "fixtures/textpack/resources",
  },
  tests: {
    smoke: ["fixtures/textpack/resources/textpack-en-legal/stopwords.en.legal.txt"],
    lookup: ["lookup:stopwords:en:legal"],
    overlay: ["overlay:stopwords:en:legal"],
  },
};

const frenchManifest: TextPackManifestV1 = {
  schemaVersion: textPackManifestSchemaVersion,
  packId: "pack:fr-core",
  packageName: "@ismail-elkorchi/textpack-fr-core",
  version: "0.0.0",
  resources: [
    {
      resourceId: "stopwords-fr-core",
      lookupKey: "stopwords.fr.core",
      kind: "stopwords",
      path: "fixtures/textpack/resources/textpack-fr-core/stopwords.fr.basic.txt",
      language: "fr",
      overlayPrecedence: 10,
      licenseId: "license-cc0",
      provenanceId: "prov-hand-curated",
    },
    {
      resourceId: "lexicon-fr-core",
      lookupKey: "lexicon.fr.core",
      kind: "lexicon",
      path: "fixtures/textpack/resources/textpack-fr-core/lexicon.fr.simple.tsv",
      language: "fr",
      overlayPrecedence: 10,
      licenseId: "license-cc0",
      provenanceId: "prov-hand-curated",
    },
  ],
  licenses: baseManifest.licenses,
  provenance: baseManifest.provenance,
  entrypoints: {
    manifest: "fixtures/textpack/manifests/textpack-fr-core.json",
    resourceRoot: "fixtures/textpack/resources",
  },
  tests: {
    smoke: ["fixtures/textpack/resources/textpack-fr-core/stopwords.fr.basic.txt"],
    lookup: ["lookup:stopwords:fr", "lookup:lexicon:fr"],
    overlay: ["overlay:stopwords:fr"],
  },
};

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
    resources: [
      {
        ...baseStopwordsResource,
        licenseId: "license-missing",
        provenanceId: "prov-missing",
      },
    ],
  },
  ["missing-license-ref", "missing-provenance-ref"],
  "missing license and provenance refs should be diagnosed",
);

expectGovernanceCodes(
  {
    ...baseManifest,
    licenses: [...baseManifest.licenses, baseLicense],
    provenance: [...baseManifest.provenance, baseProvenance],
    resources: [
      baseStopwordsResource,
      {
        ...baseLexiconResource,
        resourceId: baseStopwordsResource.resourceId,
      },
    ],
  },
  ["duplicate-license-id", "duplicate-provenance-id", "duplicate-resource-id"],
  "duplicate manifest ids should be diagnosed",
);

expectGovernanceCodes(
  {
    ...baseManifest,
    resources: [
      {
        ...baseStopwordsResource,
        path: "../outside/stopwords.txt",
      },
    ],
    entrypoints: {
      ...baseManifest.entrypoints,
      manifest: "/tmp/textpack.json",
      resourceRoot: "C:\\packs",
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
    resources: [
      baseStopwordsResource,
      {
        ...baseLexiconResource,
        resourceId: "stopwords-en-core-shadow",
        lookupKey: baseStopwordsResource.lookupKey,
        kind: baseStopwordsResource.kind,
        path: "fixtures/textpack/resources/textpack-en-core/stopwords.en.shadow.txt",
      },
    ],
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

if (overlayStopwordsResource.provenance.id !== "prov-hand-curated") {
  throw new Error("resolved resources should retain provenance records");
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

if (registry.kinds.join(",") !== "abbreviation-list,gazetteer,lexicon,stopwords") {
  throw new Error("registry should expose deterministic resource kinds");
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

void expectedPackageName;
