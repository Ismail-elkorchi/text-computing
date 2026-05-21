import Ajv from "ajv";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import {
  applyTextDocAnnotationBundlePayloadV1,
  exportTextDocAnnotationBundlePayloadV1,
} from "../packages/textdoc/src/index.ts";
import {
  canonicalizeTextProtocolJson,
  isTextProtocolAnnotationBundleV1,
  textProtocolAnnotationBundleSchemaId,
  textProtocolSchemaVersion,
} from "../packages/textprotocol/src/index.ts";

const ajv = new Ajv({ allErrors: true, strict: true });
const WRITE_MODE = process.argv.includes("--write");

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function writeJson(path, value) {
  await mkdir(path.split("/").slice(0, -1).join("/"), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value).sort(([left], [right]) => left.localeCompare(right));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function spanOverlaps(left, right) {
  return left.startCU < right.endCU && right.startCU < left.endCU;
}

function pushError(errors, code, message) {
  errors.push({ code, message });
}

function validateAlternativeRanks(annotation, errors) {
  if (!Array.isArray(annotation.alternatives)) return;
  let previousRank = 0;
  const seenRanks = new Set();
  for (const alternative of annotation.alternatives) {
    if (seenRanks.has(alternative.rank)) {
      pushError(
        errors,
        "duplicate-alternative-rank",
        `Annotation ${annotation.id} repeats alternative rank ${alternative.rank}.`,
      );
    }
    seenRanks.add(alternative.rank);
    if (alternative.rank <= previousRank) {
      pushError(
        errors,
        "unordered-alternatives",
        `Annotation ${annotation.id} alternatives must be ordered by increasing rank.`,
      );
    }
    previousRank = alternative.rank;
  }
}

function annotationEntry(annotationsById, annotationId) {
  return annotationsById.get(annotationId);
}

function referencedAnnotationKind(annotationsById, annotationId) {
  return annotationEntry(annotationsById, annotationId)?.annotation.kind;
}

function validateDocumentSemantics(document) {
  const errors = [];

  if (typeof document.text === "string" && document.text.length !== document.textLengthCU) {
    pushError(
      errors,
      "text-length-mismatch",
      `Document ${document.documentId} text length does not match textLengthCU.`,
    );
  }

  const viewIds = new Set();
  const viewOrder = new Map();
  const viewById = new Map();
  for (const [index, view] of document.views.entries()) {
    if (viewIds.has(view.id)) {
      pushError(errors, "duplicate-view-id", `Duplicate view id ${view.id}.`);
    }
    viewIds.add(view.id);
    viewOrder.set(view.id, index);
    viewById.set(view.id, view);
    const parentId = view.parentViewId;
    if (parentId === undefined) continue;
    if (parentId === view.id) {
      pushError(errors, "self-parent-view", `View ${view.id} cannot parent itself.`);
      continue;
    }
    const parentIndex = viewOrder.get(parentId);
    if (parentIndex === undefined) {
      pushError(
        errors,
        "dangling-view-reference",
        `View ${view.id} references missing or later parent view ${parentId}.`,
      );
    } else if (parentIndex >= index) {
      pushError(errors, "view-order-violation", `View ${view.id} must list parent views first.`);
    }
    const visited = new Set();
    let cursor = view;
    while (cursor?.parentViewId) {
      if (visited.has(cursor.id)) {
        pushError(errors, "view-parent-cycle", `View ${view.id} participates in a parent cycle.`);
        break;
      }
      visited.add(cursor.id);
      cursor = viewById.get(cursor.parentViewId);
    }
  }

  const spanMapById = new Map();
  for (const spanMap of document.spanMaps ?? []) {
    if (spanMapById.has(spanMap.id)) {
      pushError(errors, "duplicate-span-map-id", `Duplicate span map id ${spanMap.id}.`);
    }
    spanMapById.set(spanMap.id, spanMap);
    if (!viewIds.has(spanMap.sourceViewId)) {
      pushError(errors, "dangling-span-map-source", `Span map ${spanMap.id} references missing source view.`);
    }
    if (!viewIds.has(spanMap.targetViewId)) {
      pushError(errors, "dangling-span-map-target", `Span map ${spanMap.id} references missing target view.`);
    }
    if (spanMap.sourceViewId === spanMap.targetViewId) {
      pushError(errors, "self-span-map", `Span map ${spanMap.id} cannot map a view to itself.`);
    }
    if (spanMap.lifecycle.state === "superseded" && !spanMap.lifecycle.supersededBy) {
      pushError(errors, "missing-span-map-superseded-by", `Span map ${spanMap.id} is superseded without supersededBy.`);
    }
    if (
      spanMap.lifecycle.state !== "superseded" &&
      spanMap.lifecycle.supersededBy !== undefined
    ) {
      pushError(errors, "invalid-span-map-superseded-by-state", `Only superseded span maps may declare supersededBy.`);
    }
    if (
      (spanMap.lifecycle.state === "partial" || spanMap.lifecycle.state === "invalidated") &&
      !spanMap.lifecycle.reason
    ) {
      pushError(errors, "missing-span-map-reason", `Partial or invalidated span map ${spanMap.id} needs a reason.`);
    }
    let previousSourceEnd = -1;
    for (const segment of spanMap.segments) {
      if (
        segment.source.startCU < 0 ||
        segment.source.endCU < segment.source.startCU ||
        segment.source.endCU > document.textLengthCU ||
        segment.target.startCU < 0 ||
        segment.target.endCU < segment.target.startCU ||
        segment.target.endCU > document.textLengthCU
      ) {
        pushError(errors, "span-map-segment-out-of-range", `Span map ${spanMap.id} has an out-of-range segment.`);
      }
      if (segment.source.startCU < previousSourceEnd) {
        pushError(errors, "span-map-segment-order", `Span map ${spanMap.id} segments must be source ordered.`);
      }
      previousSourceEnd = segment.source.endCU;
    }
  }

  for (const view of document.views) {
    for (const spanMapId of view.spanMapIds ?? []) {
      const spanMap = spanMapById.get(spanMapId);
      if (!spanMap) {
        pushError(errors, "dangling-view-span-map", `View ${view.id} references missing span map ${spanMapId}.`);
        continue;
      }
      if (spanMap.targetViewId !== view.id) {
        pushError(errors, "view-span-map-target-mismatch", `View ${view.id} references a span map with a different target view.`);
      }
      if (view.parentViewId && spanMap.sourceViewId !== view.parentViewId) {
        pushError(errors, "view-span-map-parent-mismatch", `View ${view.id} span map must map from its parent view.`);
      }
    }
  }

  const layerIds = new Set();
  const annotationsById = new Map();

  for (const layer of document.layers) {
    if (layerIds.has(layer.id)) {
      pushError(errors, "duplicate-layer-id", `Duplicate layer id ${layer.id}.`);
    }
    layerIds.add(layer.id);

    if (!viewIds.has(layer.viewId)) {
      pushError(
        errors,
        "dangling-layer-view",
        `Layer ${layer.id} references unknown view ${layer.viewId}.`,
      );
    }

    for (const annotation of layer.annotations) {
      if (annotation.kind !== layer.kind) {
        pushError(
          errors,
          "layer-kind-mismatch",
          `Layer ${layer.id} contains annotation ${annotation.id} with mismatched kind ${annotation.kind}.`,
        );
      }
      if (annotationsById.has(annotation.id)) {
        pushError(errors, "duplicate-annotation-id", `Duplicate annotation id ${annotation.id}.`);
      }
      annotationsById.set(annotation.id, { layer, annotation });
      validateAlternativeRanks(annotation, errors);
    }

    if (layer.allowSpanOverlap === true) continue;

    const activeSpanAnnotations = layer.annotations
      .filter((annotation) => annotation.lifecycle.state === "active")
      .map((annotation) => ({
        annotation,
        spans: annotation.targets.filter((target) => target.kind === "span"),
      }))
      .filter((entry) => entry.spans.length > 0);

    for (let index = 0; index < activeSpanAnnotations.length; index += 1) {
      const left = activeSpanAnnotations[index];
      if (!left) continue;
      for (let otherIndex = index + 1; otherIndex < activeSpanAnnotations.length; otherIndex += 1) {
        const right = activeSpanAnnotations[otherIndex];
        if (!right) continue;
        for (const leftSpan of left.spans) {
          for (const rightSpan of right.spans) {
            if (spanOverlaps(leftSpan, rightSpan)) {
              pushError(
                errors,
                "overlap-without-policy",
                `Layer ${layer.id} contains overlapping active spans in ${left.annotation.id} and ${right.annotation.id}.`,
              );
            }
          }
        }
      }
    }
  }

  for (const { layer, annotation } of annotationsById.values()) {
    if (annotation.targets.length === 0) {
      pushError(errors, "missing-targets", `Annotation ${annotation.id} must declare targets.`);
    }

    for (const target of annotation.targets) {
      if (target.kind === "span") {
        if (
          !viewIds.has(target.viewId) ||
          !Number.isInteger(target.startCU) ||
          !Number.isInteger(target.endCU) ||
          target.startCU < 0 ||
          target.endCU < target.startCU ||
          target.endCU > document.textLengthCU
        ) {
          pushError(
            errors,
            "span-out-of-range",
            `Annotation ${annotation.id} has span target outside textLengthCU.`,
          );
        }
        if (target.viewId !== layer.viewId) {
          pushError(
            errors,
            "span-target-layer-view-mismatch",
            `Annotation ${annotation.id} span target view does not match layer ${layer.id}.`,
          );
        }
        if (
          typeof annotation.text === "string" &&
          typeof document.text === "string" &&
          document.text.slice(target.startCU, target.endCU) !== annotation.text
        ) {
          pushError(
            errors,
            "text-span-mismatch",
            `Annotation ${annotation.id} text does not match its span target.`,
          );
        }
      }

      if (target.kind === "annotation") {
        if (!annotationsById.has(target.annotationId)) {
          pushError(
            errors,
            "dangling-annotation-target",
            `Annotation ${annotation.id} references missing annotation ${target.annotationId}.`,
          );
        } else if (target.annotationId === annotation.id) {
          pushError(
            errors,
            "self-annotation-target",
            `Annotation ${annotation.id} cannot target itself.`,
          );
        }
      }

      if (
        target.kind === "document" &&
        layer.kind !== "corpus-feature" &&
        layer.kind !== "dependency-node" &&
        layer.kind !== "extension"
      ) {
        pushError(
          errors,
          "document-target-kind-mismatch",
          `Only corpus-feature annotations may target the whole document (${annotation.id}).`,
        );
      }
    }

    if (annotation.kind === "relation") {
      for (const argument of annotation.arguments) {
        const targetKind = referencedAnnotationKind(annotationsById, argument.annotationId);
        if (!targetKind) {
          pushError(
            errors,
            "dangling-relation-argument",
            `Relation ${annotation.id} argument ${argument.role} references missing annotation ${argument.annotationId}.`,
          );
        }
      }
      const targetIds = new Set(
        annotation.targets
          .filter((target) => target.kind === "annotation")
          .map((target) => target.annotationId),
      );
      for (const argument of annotation.arguments) {
        if (!targetIds.has(argument.annotationId)) {
          pushError(
            errors,
            "relation-target-argument-mismatch",
            `Relation ${annotation.id} must target argument annotation ${argument.annotationId}.`,
          );
        }
      }
    }

    if (annotation.kind === "coreference-chain") {
      const targetIds = new Set(
        annotation.targets
          .filter((target) => target.kind === "annotation")
          .map((target) => target.annotationId),
      );
      for (const mentionId of annotation.mentionIds) {
        const mentionKind = referencedAnnotationKind(annotationsById, mentionId);
        if (!mentionKind) {
          pushError(
            errors,
            "dangling-coreference-mention",
            `Coreference chain ${annotation.id} references missing mention ${mentionId}.`,
          );
        } else if (mentionKind !== "coreference-mention") {
          pushError(
            errors,
            "coreference-mention-kind-mismatch",
            `Coreference chain ${annotation.id} references ${mentionId}, but it is ${mentionKind}.`,
          );
        }
        if (!targetIds.has(mentionId)) {
          pushError(
            errors,
            "coreference-target-mention-mismatch",
            `Coreference chain ${annotation.id} must target mention ${mentionId}.`,
          );
        }
      }
      if (
        annotation.representativeMentionId &&
        !annotation.mentionIds.includes(annotation.representativeMentionId)
      ) {
        pushError(
          errors,
          "representative-mention-not-in-chain",
          `Coreference chain ${annotation.id} representative ${annotation.representativeMentionId} is not in mentionIds.`,
        );
      }
    }

    if (annotation.kind === "entity-link") {
      const target = annotation.targets[0];
      if (target?.kind !== "annotation") {
        pushError(errors, "entity-link-target-kind", `Entity-link ${annotation.id} must target an entity annotation.`);
      } else {
        const targetKind = referencedAnnotationKind(annotationsById, target.annotationId);
        if (!targetKind) {
          pushError(
            errors,
            "dangling-entity-link-target",
            `Entity-link ${annotation.id} references missing annotation ${target.annotationId}.`,
          );
        } else if (targetKind !== "entity") {
          pushError(
            errors,
            "entity-link-target-kind",
            `Entity-link ${annotation.id} must target entity annotations, not ${targetKind}.`,
          );
        }
      }
      if ((annotation.link === undefined) === (annotation.nil === undefined)) {
        pushError(
          errors,
          "entity-link-resolution-mismatch",
          `Entity-link ${annotation.id} must declare exactly one of link or nil.`,
        );
      }
    }

    if (
      annotation.kind === "corpus-feature" &&
      annotation.value === undefined &&
      annotation.numericValue === undefined
    ) {
      pushError(
        errors,
        "missing-corpus-feature-value",
        `Corpus-feature annotation ${annotation.id} must declare value or numericValue.`,
      );
    }

    if (annotation.lifecycle.state === "superseded" && !annotation.lifecycle.supersededBy) {
      pushError(
        errors,
        "missing-superseded-by",
        `Superseded annotation ${annotation.id} must reference its replacement.`,
      );
    }

    if (annotation.lifecycle.state !== "superseded" && annotation.lifecycle.supersededBy) {
      pushError(
        errors,
        "invalid-superseded-by-state",
        `Only superseded annotations may declare supersededBy (${annotation.id}).`,
      );
    }

    for (const olderId of annotation.lifecycle.supersedes ?? []) {
      const older = annotationsById.get(olderId)?.annotation;
      if (!older) {
        pushError(
          errors,
          "dangling-supersedes-reference",
          `Annotation ${annotation.id} supersedes missing annotation ${olderId}.`,
        );
        continue;
      }
      if (older.lifecycle.state !== "superseded") {
        pushError(
          errors,
          "supersedes-state-mismatch",
          `Annotation ${annotation.id} supersedes ${olderId}, but ${olderId} is not marked superseded.`,
        );
      }
      if (older.lifecycle.supersededBy !== annotation.id) {
        pushError(
          errors,
          "supersession-link-mismatch",
          `Annotation ${olderId} must point back to ${annotation.id} via supersededBy.`,
        );
      }
    }

    if (annotation.lifecycle.state === "superseded" && annotation.lifecycle.supersededBy) {
      const replacement = annotationsById.get(annotation.lifecycle.supersededBy)?.annotation;
      if (!replacement) {
        pushError(
          errors,
          "dangling-superseded-by-reference",
          `Annotation ${annotation.id} points to missing replacement ${annotation.lifecycle.supersededBy}.`,
        );
      } else if (!(replacement.lifecycle.supersedes ?? []).includes(annotation.id)) {
        pushError(
          errors,
          "superseded-by-link-mismatch",
          `Replacement ${replacement.id} must list ${annotation.id} in supersedes.`,
        );
      }
    }
  }

  const selectedAmbiguitySets = new Map();
  const ambiguityRanks = new Map();
  for (const { annotation } of annotationsById.values()) {
    if (!annotation.ambiguitySet || annotation.lifecycle.state !== "active") continue;
    const setId = annotation.ambiguitySet.id;
    if (annotation.ambiguitySet.role === "selected") {
      const existing = selectedAmbiguitySets.get(setId);
      if (existing) {
        pushError(
          errors,
          "multiple-selected-ambiguity-members",
          `Ambiguity set ${setId} selects both ${existing} and ${annotation.id}.`,
        );
      } else {
        selectedAmbiguitySets.set(setId, annotation.id);
      }
    }
    if (annotation.ambiguitySet.rank !== undefined) {
      const rankKey = `${setId}:${annotation.ambiguitySet.rank}`;
      const existing = ambiguityRanks.get(rankKey);
      if (existing) {
        pushError(
          errors,
          "duplicate-ambiguity-rank",
          `Ambiguity set ${setId} repeats rank ${annotation.ambiguitySet.rank} in ${existing} and ${annotation.id}.`,
        );
      } else {
        ambiguityRanks.set(rankKey, annotation.id);
      }
    }
  }

  const dependencyNodes = new Map();
  for (const { annotation } of annotationsById.values()) {
    if (annotation.kind === "dependency-node") {
      dependencyNodes.set(annotation.id, annotation);
    }
  }

  const dependencyByDependent = new Map();
  for (const { annotation } of annotationsById.values()) {
    if (annotation.kind !== "dependency") continue;
    const dependent = dependencyNodes.get(annotation.dependentNodeId);
    if (!dependent) {
      pushError(
        errors,
        "dangling-dependent-node",
        `Dependency ${annotation.id} references missing dependent node ${annotation.dependentNodeId}.`,
      );
    } else if (dependent.sentenceId !== annotation.source.sentenceId) {
      pushError(
        errors,
        "dependency-sentence-mismatch",
        `Dependency ${annotation.id} source sentence does not match dependent node sentence.`,
      );
    }
    if (annotation.headNodeId !== null) {
      const head = dependencyNodes.get(annotation.headNodeId);
      if (!head) {
        pushError(
          errors,
          "dangling-head-node",
          `Dependency ${annotation.id} references missing head node ${annotation.headNodeId}.`,
        );
      } else if (dependent && head.sentenceId !== dependent.sentenceId) {
        pushError(
          errors,
          "dependency-cross-sentence-head",
          `Dependency ${annotation.id} crosses sentence boundary from ${dependent.sentenceId} to ${head.sentenceId}.`,
        );
      }
    }
    if (dependencyByDependent.has(annotation.dependentNodeId)) {
      pushError(
        errors,
        "duplicate-dependent-arc",
        `Dependency node ${annotation.dependentNodeId} has more than one dependency arc.`,
      );
    }
    dependencyByDependent.set(annotation.dependentNodeId, annotation);
  }

  const rootsBySentence = new Map();
  for (const dependency of dependencyByDependent.values()) {
    if (dependency.headNodeId !== null) continue;
    rootsBySentence.set(
      dependency.source.sentenceId,
      (rootsBySentence.get(dependency.source.sentenceId) ?? 0) + 1,
    );
  }
  for (const node of dependencyNodes.values()) {
    if (node.nodeKind !== "word") continue;
    if (!rootsBySentence.has(node.sentenceId)) {
      pushError(
        errors,
        "missing-dependency-root",
        `Dependency sentence ${node.sentenceId} has no root arc.`,
      );
    }
  }

  for (const dependency of dependencyByDependent.values()) {
    const seen = new Set();
    let cursor = dependency;
    while (cursor?.headNodeId) {
      if (seen.has(cursor.dependentNodeId)) {
        pushError(
          errors,
          "dependency-cycle",
          `Dependency graph contains a cycle at node ${cursor.dependentNodeId}.`,
        );
        break;
      }
      seen.add(cursor.dependentNodeId);
      cursor = dependencyByDependent.get(cursor.headNodeId);
    }
  }

  return errors;
}

const documentSchema = await readJson("schemas/textdoc-document-v1.schema.json");
const validateDocument = ajv.compile(documentSchema);
const resultEnvelopeSchema = await readJson("schemas/textprotocol-result-envelope-v1.schema.json");
const validateResultEnvelope = ajv.compile(resultEnvelopeSchema);
const annotationBundleSchema = await readJson("schemas/textprotocol-annotation-bundle-v1.schema.json");
const validateAnnotationBundle = ajv.compile(annotationBundleSchema);
const conformanceReportSchema = await readJson("schemas/textconformance-report-v1.schema.json");
const validateConformanceReport = ajv.compile(conformanceReportSchema);
const textdocPackage = await readJson("packages/textdoc/package.json");

const validFixturePaths = [
  "fixtures/textdoc/examples/document-annotation-model-v1.json",
  "fixtures/textdoc/examples/document-extension-model-v1.json",
];

for (const validFixturePath of validFixturePaths) {
  const validDocument = await readJson(validFixturePath);

  if (!validateDocument(validDocument)) {
    console.error(`${validFixturePath} failed schemas/textdoc-document-v1.schema.json`);
    console.error(JSON.stringify(validateDocument.errors, null, 2));
    process.exit(1);
  }

  const semanticErrors = validateDocumentSemantics(validDocument);
  if (semanticErrors.length > 0) {
    console.error(`${validFixturePath} failed semantic validation`);
    console.error(JSON.stringify(semanticErrors, null, 2));
    process.exit(1);
  }

  const roundTripString = stableStringify(JSON.parse(JSON.stringify(validDocument)));
  if (roundTripString !== stableStringify(validDocument)) {
    console.error(`${validFixturePath} failed stable round-trip serialization`);
    process.exit(1);
  }
}

const validFixturePath = validFixturePaths[0];
const validDocument = await readJson(validFixturePath);
const annotationBundlePath =
  "fixtures/textdoc/roundtrip/document-annotation-model-annotation-bundle.v1.json";
const heldOutAnnotationBundleCases = [
  {
    sourceDocumentPath: "fixtures/textdoc/heldout/web-annotation-style-source-document-v1.json",
    annotationBundlePath: "fixtures/textdoc/heldout/web-annotation-style-annotation-bundle.v1.json",
    producerPackage: "interchange.web-annotation-style-exporter",
    precedentRef: "w3c-web-annotation-data-model",
    minAnnotations: 10,
  },
  {
    sourceDocumentPath: "fixtures/textdoc/heldout/uima-style-source-document-v1.json",
    annotationBundlePath: "fixtures/textdoc/heldout/uima-style-annotation-bundle.v1.json",
    producerPackage: "interchange.uima-style-exporter",
    precedentRef: "uima-cas-style-stand-off",
    minAnnotations: 14,
  },
];

const resultEnvelope = {
  schemaId: "urn:ismail-elkorchi:textprotocol:result-envelope:v1",
  schemaVersion: 1,
  producer: {
    package: textdocPackage.name,
    version: textdocPackage.version,
  },
  payloadKind: "textdoc-document-v1",
  payload: validDocument,
  provenance: {
    source: validDocument.source,
    references: [
      {
        kind: "fixture",
        id: "textdoc-document-annotation-model-v1",
      },
    ],
  },
};

if (!validateResultEnvelope(resultEnvelope)) {
  console.error(`${validFixturePath} could not be wrapped in the result envelope schema`);
  console.error(JSON.stringify(validateResultEnvelope.errors, null, 2));
  process.exit(1);
}

const annotationBundlePayload = exportTextDocAnnotationBundlePayloadV1(validDocument);
const annotationBundleEnvelope = {
  schemaId: textProtocolAnnotationBundleSchemaId,
  schemaVersion: textProtocolSchemaVersion,
  producer: {
    package: textdocPackage.name,
    version: textdocPackage.version,
  },
  payload: annotationBundlePayload,
  provenance: {
    source: validDocument.source,
    references: [
      {
        kind: "fixture",
        id: "textdoc-document-annotation-model-v1",
      },
      {
        kind: "schema",
        id: "schemas/textprotocol-annotation-bundle-v1.schema.json",
      },
    ],
  },
  limitations: [
    "Stand-off annotation bundle evidence covers the committed document-model fixture only.",
    "No external document-model comparator is claimed by this artifact.",
  ],
};

if (!isTextProtocolAnnotationBundleV1(annotationBundleEnvelope)) {
  console.error(`${annotationBundlePath} failed the textprotocol annotation-bundle runtime guard`);
  process.exit(1);
}

if (!validateAnnotationBundle(annotationBundleEnvelope)) {
  console.error(`${annotationBundlePath} failed schemas/textprotocol-annotation-bundle-v1.schema.json`);
  console.error(JSON.stringify(validateAnnotationBundle.errors, null, 2));
  process.exit(1);
}

const annotationSkeletonDocument = {
  ...validDocument,
  layers: validDocument.layers.map((layer) => ({ ...layer, annotations: [] })),
};
const annotationBundleRoundTrip = applyTextDocAnnotationBundlePayloadV1(
  annotationSkeletonDocument,
  annotationBundlePayload,
);
if (
  !annotationBundleRoundTrip.ok ||
  stableStringify(annotationBundleRoundTrip.document.layers) !== stableStringify(validDocument.layers)
) {
  console.error(`${annotationBundlePath} failed textdoc annotation-bundle round-trip restoration`);
  console.error(JSON.stringify(annotationBundleRoundTrip.diagnostics, null, 2));
  process.exit(1);
}

const firstAnnotationBundleEntry = annotationBundlePayload.annotations[0];
if (firstAnnotationBundleEntry === undefined) {
  console.error(`${annotationBundlePath} must contain annotation evidence.`);
  process.exit(1);
}

const duplicateBundleResult = applyTextDocAnnotationBundlePayloadV1(annotationSkeletonDocument, {
  ...annotationBundlePayload,
  annotations: [...annotationBundlePayload.annotations, firstAnnotationBundleEntry],
});
if (
  !duplicateBundleResult.diagnostics.some(
    (entry) => entry.code === "textdoc.annotation-bundle.annotation-duplicate",
  )
) {
  console.error("Duplicate annotation-bundle entries must be rejected.");
  process.exit(1);
}

const targetDriftResult = applyTextDocAnnotationBundlePayloadV1(annotationSkeletonDocument, {
  ...annotationBundlePayload,
  annotations: [
    {
      ...firstAnnotationBundleEntry,
      target: { kind: "document" },
    },
    ...annotationBundlePayload.annotations.slice(1),
  ],
});
if (
  !targetDriftResult.diagnostics.some(
    (entry) => entry.code === "textdoc.annotation-bundle.target-mismatch",
  )
) {
  console.error("Annotation-bundle target drift must be rejected.");
  process.exit(1);
}

if (WRITE_MODE) {
  await writeJson(annotationBundlePath, annotationBundleEnvelope);
}
const committedAnnotationBundle = await readJson(annotationBundlePath);
if (!validateAnnotationBundle(committedAnnotationBundle)) {
  console.error(`${annotationBundlePath} committed artifact failed its schema`);
  console.error(JSON.stringify(validateAnnotationBundle.errors, null, 2));
  process.exit(1);
}
if (!isTextProtocolAnnotationBundleV1(committedAnnotationBundle)) {
  console.error(`${annotationBundlePath} committed artifact failed its runtime guard`);
  process.exit(1);
}
if (
  canonicalizeTextProtocolJson(committedAnnotationBundle) !==
    canonicalizeTextProtocolJson(annotationBundleEnvelope)
) {
  console.error(`${annotationBundlePath} is stale; run node tools/validate-textdoc-document-model.mjs --write.`);
  process.exit(1);
}

for (const heldOutCase of heldOutAnnotationBundleCases) {
  const sourceDocument = await readJson(heldOutCase.sourceDocumentPath);
  if (!validateDocument(sourceDocument)) {
    console.error(`${heldOutCase.sourceDocumentPath} failed schemas/textdoc-document-v1.schema.json`);
    console.error(JSON.stringify(validateDocument.errors, null, 2));
    process.exit(1);
  }
  const sourceSemanticErrors = validateDocumentSemantics(sourceDocument);
  if (sourceSemanticErrors.length > 0) {
    console.error(`${heldOutCase.sourceDocumentPath} failed semantic validation`);
    console.error(JSON.stringify(sourceSemanticErrors, null, 2));
    process.exit(1);
  }

  const heldOutBundle = await readJson(heldOutCase.annotationBundlePath);
  if (!validateAnnotationBundle(heldOutBundle)) {
    console.error(`${heldOutCase.annotationBundlePath} failed schemas/textprotocol-annotation-bundle-v1.schema.json`);
    console.error(JSON.stringify(validateAnnotationBundle.errors, null, 2));
    process.exit(1);
  }
  if (!isTextProtocolAnnotationBundleV1(heldOutBundle)) {
    console.error(`${heldOutCase.annotationBundlePath} failed its runtime guard`);
    process.exit(1);
  }
  if (heldOutBundle.producer.package !== heldOutCase.producerPackage) {
    console.error(`${heldOutCase.annotationBundlePath} must preserve its held-out producer identity.`);
    process.exit(1);
  }
  if (
    !heldOutBundle.provenance?.references?.some(
      (entry) => entry.kind === "interchange-precedent" && entry.id === heldOutCase.precedentRef,
    )
  ) {
    console.error(`${heldOutCase.annotationBundlePath} must name its external interchange precedent.`);
    process.exit(1);
  }
  if (heldOutBundle.payload.annotations.length < heldOutCase.minAnnotations) {
    console.error(`${heldOutCase.annotationBundlePath} does not contain enough held-out annotation coverage.`);
    process.exit(1);
  }

  const heldOutRoundTrip = applyTextDocAnnotationBundlePayloadV1(
    sourceDocument,
    heldOutBundle.payload,
  );
  if (!heldOutRoundTrip.ok || heldOutRoundTrip.document === undefined) {
    console.error(`${heldOutCase.annotationBundlePath} failed held-out annotation-bundle restoration.`);
    console.error(JSON.stringify(heldOutRoundTrip.diagnostics, null, 2));
    process.exit(1);
  }
  const restoredSemanticErrors = validateDocumentSemantics(heldOutRoundTrip.document);
  if (restoredSemanticErrors.length > 0) {
    console.error(`${heldOutCase.annotationBundlePath} restored document failed semantic validation`);
    console.error(JSON.stringify(restoredSemanticErrors, null, 2));
    process.exit(1);
  }

  const heldOutFirstAnnotation = heldOutBundle.payload.annotations[0];
  if (heldOutFirstAnnotation === undefined) {
    console.error(`${heldOutCase.annotationBundlePath} must contain annotations.`);
    process.exit(1);
  }

  const heldOutDuplicateResult = applyTextDocAnnotationBundlePayloadV1(sourceDocument, {
    ...heldOutBundle.payload,
    annotations: [...heldOutBundle.payload.annotations, heldOutFirstAnnotation],
  });
  if (
    !heldOutDuplicateResult.diagnostics.some(
      (entry) => entry.code === "textdoc.annotation-bundle.annotation-duplicate",
    )
  ) {
    console.error(`${heldOutCase.annotationBundlePath} duplicate annotation control was accepted.`);
    process.exit(1);
  }

  const heldOutLayerMissingResult = applyTextDocAnnotationBundlePayloadV1(sourceDocument, {
    ...heldOutBundle.payload,
    annotations: [
      {
        ...heldOutFirstAnnotation,
        layerId: "missing-heldout-layer",
      },
      ...heldOutBundle.payload.annotations.slice(1),
    ],
  });
  if (
    !heldOutLayerMissingResult.diagnostics.some(
      (entry) => entry.code === "textdoc.annotation-bundle.layer-missing",
    )
  ) {
    console.error(`${heldOutCase.annotationBundlePath} missing-layer control was accepted.`);
    process.exit(1);
  }

  const heldOutRevisionMismatch = applyTextDocAnnotationBundlePayloadV1(sourceDocument, {
    ...heldOutBundle.payload,
    documentRevision: `${heldOutBundle.payload.documentRevision}-drift`,
  });
  if (
    !heldOutRevisionMismatch.diagnostics.some(
      (entry) => entry.code === "textdoc.annotation-bundle.revision-mismatch",
    )
  ) {
    console.error(`${heldOutCase.annotationBundlePath} revision drift control was accepted.`);
    process.exit(1);
  }
}

const conformanceReport = {
  schemaId: "urn:ismail-elkorchi:textconformance:report:v1",
  schemaVersion: 1,
  reportId: "textdoc:document-annotation-model",
  subject: {
    kind: "textprotocol-result-envelope",
    id: validDocument.documentId,
    schemaId: resultEnvelope.schemaId,
  },
  generatedAt: "2026-04-21T00:00:00.000Z",
  summary: {
    pass: 4,
    fail: 0,
    notRun: 0,
  },
  checks: [
    {
      checkId: "textdoc-document-schema",
      status: "pass",
      message: "Document fixture validates against the textdoc schema.",
      evidenceRefs: [validFixturePath, "schemas/textdoc-document-v1.schema.json"],
    },
    {
      checkId: "textdoc-document-semantics",
      status: "pass",
      message: "Document fixture satisfies view, target, graph, overlap, and lifecycle rules.",
      evidenceRefs: [validFixturePath, "docs/specs/textdoc-document-annotation-model.md"],
    },
    {
      checkId: "textdoc-document-envelope",
      status: "pass",
      message: "Document fixture is serializable as a textprotocol result envelope.",
      evidenceRefs: [validFixturePath, "schemas/textprotocol-result-envelope-v1.schema.json"],
    },
    {
      checkId: "textdoc-document-conformance",
      status: "pass",
      message: "Document fixture is referenceable by a textconformance report.",
      evidenceRefs: [validFixturePath, "schemas/textconformance-report-v1.schema.json"],
    },
  ],
};

if (!validateConformanceReport(conformanceReport)) {
  console.error(`${validFixturePath} could not be referenced by the conformance report schema`);
  console.error(JSON.stringify(validateConformanceReport.errors, null, 2));
  process.exit(1);
}

const invalidCases = [
  {
    path: "fixtures/textdoc/invalid/dangling-view.json",
    expectedCode: "dangling-layer-view",
  },
  {
    path: "fixtures/textdoc/invalid/dangling-target.json",
    expectedCode: "dangling-annotation-target",
  },
  {
    path: "fixtures/textdoc/invalid/overlap-without-policy.json",
    expectedCode: "overlap-without-policy",
  },
  {
    path: "fixtures/textdoc/invalid/lifecycle-mismatch.json",
    expectedCode: "superseded-by-link-mismatch",
  },
  {
    path: "fixtures/textdoc/invalid/dangling-relation-argument.json",
    expectedCode: "dangling-relation-argument",
  },
  {
    path: "fixtures/textdoc/invalid/coreference-missing-mention.json",
    expectedCode: "dangling-coreference-mention",
  },
  {
    path: "fixtures/textdoc/invalid/entity-link-target-kind.json",
    expectedCode: "entity-link-target-kind",
  },
  {
    path: "fixtures/textdoc/invalid/dependency-cycle.json",
    expectedCode: "dependency-cycle",
  },
  {
    path: "fixtures/textdoc/invalid/ambiguity-multiple-selected.json",
    expectedCode: "multiple-selected-ambiguity-members",
  },
];

const schemaInvalidCases = [
  {
    path: "fixtures/textdoc/invalid/extension-bad-id.json",
  },
];

for (const invalidCase of schemaInvalidCases) {
  const invalidDocument = await readJson(invalidCase.path);
  if (validateDocument(invalidDocument)) {
    console.error(`${invalidCase.path} must fail schemas/textdoc-document-v1.schema.json`);
    process.exit(1);
  }
}

for (const invalidCase of invalidCases) {
  const invalidDocument = await readJson(invalidCase.path);
  if (!validateDocument(invalidDocument)) {
    console.error(`${invalidCase.path} must remain schema-valid so semantic checks can falsify it.`);
    console.error(JSON.stringify(validateDocument.errors, null, 2));
    process.exit(1);
  }
  const invalidErrors = validateDocumentSemantics(invalidDocument);
  if (!invalidErrors.some((entry) => entry.code === invalidCase.expectedCode)) {
    console.error(
      `${invalidCase.path} did not trigger the expected semantic error ${invalidCase.expectedCode}.`,
    );
    console.error(JSON.stringify(invalidErrors, null, 2));
    process.exit(1);
  }
}

console.log("Textdoc document-model fixtures OK.");
