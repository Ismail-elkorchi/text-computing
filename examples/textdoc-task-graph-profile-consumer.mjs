import {
  addTextDocLayerV1,
  createTextDocDocumentFromTextSync,
  isTextDocTaskGraphValidationReportV1,
  textDocTaskGraphProfileSchemaVersion,
  validateTextDocTaskGraphProfile,
} from "@ismail-elkorchi/textdoc";

const raw = createTextDocDocumentFromTextSync("Alice works.", {
  documentId: "example:textdoc-task-graph-profile",
  sourceId: "example:textdoc-task-graph-profile",
  sourceSha256: "1".repeat(64),
});

let document = raw.document;
document = addTextDocLayerV1(
  document,
  {
    id: "entities",
    kind: "entity",
    viewId: "tokenization-view",
    annotations: [
      {
        id: "entity:alice",
        kind: "entity",
        label: "PERSON",
        lifecycle: { state: "active" },
        targets: [{ kind: "span", viewId: "tokenization-view", startCU: 0, endCU: 5 }],
        text: "Alice",
      },
    ],
  },
  { revision: "task-graph-profile-v1" },
);
document = addTextDocLayerV1(
  document,
  {
    id: "relations",
    kind: "relation",
    viewId: "tokenization-view",
    annotations: [
      {
        id: "relation:surface-mention",
        kind: "relation",
        relationType: "surface-mention",
        lifecycle: { state: "active" },
        targets: [
          { kind: "annotation", annotationId: "entity:alice" },
          { kind: "annotation", annotationId: "token-1" },
        ],
        arguments: [
          { role: "entity", annotationId: "entity:alice" },
          { role: "surface", annotationId: "token-1" },
        ],
      },
    ],
  },
  { revision: "task-graph-profile-v2" },
);
document = addTextDocLayerV1(
  document,
  {
    id: "entity-links",
    kind: "entity-link",
    viewId: "tokenization-view",
    annotations: [
      {
        id: "link:alice:nil",
        kind: "entity-link",
        lifecycle: { state: "active" },
        targets: [{ kind: "annotation", annotationId: "entity:alice" }],
        nil: { reason: "example-without-knowledge-base" },
        provenance: {
          references: [{ kind: "example", id: "textdoc-task-graph-profile-consumer" }],
        },
      },
    ],
  },
  { revision: "task-graph-profile-v3" },
);

const profile = {
  schemaVersion: textDocTaskGraphProfileSchemaVersion,
  profileId: "example:entity-surface-link-profile",
  task: "entity-surface-link-graph",
  requiredViews: [{ id: "tokenization-view", kind: "task" }],
  requiredLayers: [
    { id: "tokens", kind: "token", viewId: "tokenization-view", minAnnotations: 1 },
    { id: "entities", kind: "entity", viewId: "tokenization-view", minAnnotations: 1 },
    { id: "relations", kind: "relation", viewId: "tokenization-view", minAnnotations: 1 },
    { id: "entity-links", kind: "entity-link", viewId: "tokenization-view", minAnnotations: 1 },
  ],
  annotationPatterns: [
    {
      id: "entity-span",
      annotationKind: "entity",
      layerId: "entities",
      requiredTargetKinds: ["span"],
      minAnnotations: 1,
    },
    {
      id: "relation-connects-entity-and-token",
      annotationKind: "relation",
      layerId: "relations",
      requiredTargetAnnotationKinds: ["entity", "token"],
      minAnnotations: 1,
    },
  ],
  relationArgumentRules: [
    {
      id: "surface-mention-roles",
      layerId: "relations",
      relationType: "surface-mention",
      minRelations: 1,
      requiredRoles: [
        { role: "entity", targetAnnotationKinds: ["entity"] },
        { role: "surface", targetAnnotationKinds: ["token"] },
      ],
    },
  ],
  coverageRules: [
    {
      id: "entity-has-link",
      sourceAnnotationKind: "entity",
      sourceLayerId: "entities",
      coveringAnnotationKind: "entity-link",
      coveringLayerId: "entity-links",
      mode: "annotation-target",
    },
    {
      id: "entity-covered-by-token",
      sourceAnnotationKind: "entity",
      sourceLayerId: "entities",
      coveringAnnotationKind: "token",
      coveringLayerId: "tokens",
      mode: "span-contained",
    },
  ],
  evidenceRefs: [{ kind: "example", id: "textdoc-task-graph-profile-consumer" }],
  limitations: [
    "This example validates declared graph structure; it does not evaluate named-entity recognition quality.",
  ],
};

const report = validateTextDocTaskGraphProfile(document, profile);
if (!isTextDocTaskGraphValidationReportV1(report) || !report.ok) {
  throw new Error("textdoc task graph profile report is invalid");
}

console.log(JSON.stringify({
  profileId: report.profileId,
  documentId: report.documentId,
  ok: report.ok,
  passCount: report.summary.passCount,
  diagnosticCount: report.summary.diagnosticCount,
}, null, 2));
