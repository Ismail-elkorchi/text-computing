import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { loadTextPackResources, lookupTextPackLoadedEntries, validateTextPackManifestGovernance } from "@ismail-elkorchi/textpack";
import { textPackEnCoreManifest } from "@ismail-elkorchi/textpack-en-core";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const governance = validateTextPackManifestGovernance(textPackEnCoreManifest);
if (!governance.ok) throw new Error(JSON.stringify(governance.diagnostics));
const contents = {};
for (const paths of Object.values(textPackEnCoreManifest.resources)) {
  for (const resourcePath of paths) contents[resourcePath] = await readFile(path.join(root, resourcePath), "utf8");
}
const expectedEntries = [
  {
    kind: "profile",
    resourceId: "profile-en-core",
    query: "en-core-default",
    verify: (entry) => entry?.value === "en-core-default",
  },
  {
    kind: "stopwords",
    resourceId: "stopwords-en-core",
    query: "the",
    verify: (entry) => entry?.value === "the" && entry.line === 3,
  },
  {
    kind: "rule",
    resourceId: "abbrev-en-core",
    query: "Prof.",
    verify: (entry) => entry?.value === "Prof.",
  },
  {
    kind: "lexicon",
    resourceId: "lexicon-en-core",
    query: "analyses",
    verify: (entry) => entry?.attributes.lemma === "analysis" && entry.attributes.pos === "NOUN",
  },
  {
    kind: "gazetteer",
    resourceId: "gazetteer-en-core",
    query: "Acme Corp",
    verify: (entry) => entry?.label === "ORG" && entry.attributes.normalized === "Acme Corp",
  },
  {
    kind: "tagset",
    resourceId: "tagset-ud-lite",
    query: "VERB",
    verify: (entry) => entry?.attributes.description === "verb",
  },
  {
    kind: "morphology",
    resourceId: "morph-en-core",
    query: "queries",
    verify: (entry) => entry?.attributes.lemma === "query" && entry.attributes.Person === "3",
  },
  {
    kind: "transducer",
    resourceId: "transducer-en-core",
    query: "plural-s->singular",
    verify: (entry) => entry?.value === "plural-s->singular",
  },
  {
    kind: "structure",
    resourceId: "structure-en-core",
    query: "sentence-basic-svo",
    verify: (entry) => entry?.value === "sentence-basic-svo",
  },
  {
    kind: "benchmark",
    resourceId: "benchmark-en-smoke",
    query: "Alice audits Acme Corp in Paris.",
    verify: (entry) => entry?.value === "Alice audits Acme Corp in Paris.",
  },
];

for (const expected of expectedEntries) {
  const loaded = loadTextPackResources([textPackEnCoreManifest], { kind: expected.kind, language: "en" }, contents);
  if (loaded.diagnostics.length !== 0) throw new Error(JSON.stringify(loaded.diagnostics));
  if (loaded.resources.map((entry) => entry.resource.resourceId).join(",") !== expected.resourceId) {
    throw new Error(`expected ${expected.resourceId} for ${expected.kind}`);
  }
  const entry = lookupTextPackLoadedEntries(loaded.resources, expected.query)[0]?.entry;
  if (!expected.verify(entry)) throw new Error(`expected ${expected.query} in ${expected.resourceId}`);
}

const loadedAll = loadTextPackResources([textPackEnCoreManifest], { language: "en" }, contents);
if (loadedAll.diagnostics.length !== 0) throw new Error(JSON.stringify(loadedAll.diagnostics));
if (loadedAll.resources.length !== expectedEntries.length) throw new Error("expected every declared resource family to load");
