import {
  isTextPackManifestV1,
  packageName,
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

void expectedPackageName;
