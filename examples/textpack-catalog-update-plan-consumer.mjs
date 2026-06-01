import {
  createTextPackCatalogUpdatePlan,
  createTextPackManifest,
  isTextPackCatalogUpdatePlanV1,
  updateTextPackManifest,
  updateTextPackManifestResource,
} from "@ismail-elkorchi/textpack";

const before = createTextPackManifest({
  id: "pack:example-catalog-update",
  packageName: "@example/textpack-catalog-update",
  version: "0.1.0",
  kind: ["language"],
  targets: {
    languages: ["en"],
    scripts: ["Latn"],
    profiles: ["example"],
  },
  resources: {
    stopwords: ["resources/stopwords.en.txt"],
  },
  provides: {
    stopwords: ["stopwords-en-v1"],
  },
  licenses: {
    code: ["MIT"],
    data: ["CC0-1.0"],
  },
  provenance: {
    sources: ["example:textpack-catalog-update-plan-consumer"],
    generated: false,
  },
  tests: {
    smoke: ["test:example:smoke"],
    negative: ["test:example:negative"],
    representative: ["test:example:representative"],
  },
});

const after = updateTextPackManifest(
  updateTextPackManifestResource(before, "stopwords-en-v1", {
    resourcePath: "resources/stopwords.en.v2.txt",
    resourceId: "stopwords-en-v2",
  }),
  {
    version: "0.2.0",
    reviewState: "candidate",
    provenanceNotes: ["Updated stopword resource path and identifier."],
  },
);

const plan = createTextPackCatalogUpdatePlan({
  beforeManifests: [before],
  afterManifests: [after],
  beforeInventoryResourcePathsByPackId: {
    [before.id]: ["resources/stopwords.en.txt"],
  },
  afterInventoryResourcePathsByPackId: {
    [after.id]: ["resources/stopwords.en.v2.txt"],
  },
});

if (!isTextPackCatalogUpdatePlanV1(plan) || !plan.ok) {
  throw new Error("textpack catalog update plan is invalid");
}

console.log(JSON.stringify({
  ok: plan.ok,
  updatedPackCount: plan.updatedPackCount,
  versionChange: plan.packs[0]?.versionChange,
  reviewTransition: plan.packs[0]?.reviewTransition,
  addedResourceIds: plan.packs[0]?.addedResourceIds,
  removedResourceIds: plan.packs[0]?.removedResourceIds,
}, null, 2));
