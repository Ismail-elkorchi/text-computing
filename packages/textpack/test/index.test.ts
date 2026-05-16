import {
  isTextPackManifestV1,
  loadTextPackResources,
  lookupTextPackLoadedEntries,
  packageName,
  parseTextPackResourceContent,
  resolveTextPackResources,
  textPackManifestSchemaVersion,
  type TextPackManifestV1,
} from "../src/index.ts";

const expectedPackageName: typeof packageName = "@ismail-elkorchi/textpack";

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
  "fixtures/textpack/resources/textpack-en-legal/gazetteer.en.legal.tsv":
    "Supreme Court\tORG\nNew York\tGPE\n",
} as const;

if (!isTextPackManifestV1(baseManifest)) {
  throw new Error("base manifest should satisfy the pack manifest shape");
}

if (!isTextPackManifestV1(overlayManifest)) {
  throw new Error("overlay manifest should satisfy the pack manifest shape");
}

if (lookupResult.resources[0]?.resourceId !== "stopwords-en-legal") {
  throw new Error("profile-specific overlay should sort ahead of the base pack");
}

if (lookupResult.resources[1]?.resourceId !== "stopwords-en-core") {
  throw new Error("base pack should remain available after the overlay resource");
}

if (lookupResult.resources[0]?.provenance.id !== "prov-hand-curated") {
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
if (legalStopwordMatches[0]?.resource.resourceId !== "stopwords-en-legal") {
  throw new Error("loaded stopword lookup should be normalized and preserve resource metadata");
}

const baseStopwordMatches = lookupTextPackLoadedEntries(loadedStopwords.resources, "THE");
if (baseStopwordMatches[0]?.resource.resourceId !== "stopwords-en-core") {
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

const hostEntry = lookupTextPackLoadedEntries(loadedLexicon.resources, "HOST")[0]?.entry;
if (hostEntry?.attributes.lemma !== "host" || hostEntry.attributes.pos !== "VERB") {
  throw new Error("lexicon loading should parse deterministic key=value attributes");
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

const courtEntry = lookupTextPackLoadedEntries(loadedGazetteer.resources, "supreme court")[0]?.entry;
if (courtEntry?.label !== "ORG") {
  throw new Error("gazetteer loading should parse labels");
}

const missingContent = loadTextPackResources([baseManifest], { kind: "stopwords" }, {});
if (!missingContent.diagnostics.some((entry) => entry.code === "resource-content-missing")) {
  throw new Error("missing resource content should produce an explicit diagnostic");
}

const duplicateParsed = parseTextPackResourceContent(lookupResult.resources[0]!, "the\nThe\n");
if (!duplicateParsed.diagnostics.some((entry) => entry.code === "duplicate-resource-entry")) {
  throw new Error("duplicate loaded entries should produce a diagnostic");
}

const malformedLexicon = parseTextPackResourceContent(
  loadedLexicon.resources[0]!.resource,
  "broken\tlemma\nvalid\tlemma=valid\tpos=ADJ\n",
);
if (
  !malformedLexicon.diagnostics.some((entry) => entry.code === "malformed-resource-row") ||
  lookupTextPackLoadedEntries([{ resource: loadedLexicon.resources[0]!.resource, entries: malformedLexicon.entries }], "broken")
    .length !== 0
) {
  throw new Error("malformed lexicon rows should be diagnosed and excluded from loaded entries");
}

void expectedPackageName;
