import Ajv from "ajv";
import { readFile } from "node:fs/promises";

const ajv = new Ajv({ allErrors: true, strict: true });

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
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
  for (const [index, view] of document.views.entries()) {
    if (viewIds.has(view.id)) {
      pushError(errors, "duplicate-view-id", `Duplicate view id ${view.id}.`);
    }
    viewIds.add(view.id);
    viewOrder.set(view.id, index);
    for (const ancestorId of view.derivedFrom ?? []) {
      if (ancestorId === view.id) {
        pushError(errors, "self-derived-view", `View ${view.id} cannot derive from itself.`);
        continue;
      }
      const ancestorIndex = viewOrder.get(ancestorId);
      if (ancestorIndex === undefined) {
        pushError(
          errors,
          "dangling-view-reference",
          `View ${view.id} derives from missing or later view ${ancestorId}.`,
        );
      } else if (ancestorIndex >= index) {
        pushError(
          errors,
          "view-order-violation",
          `View ${view.id} must list earlier lineage before derived views.`,
        );
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

    if (target.kind === "document" && layer.kind !== "corpus-feature") {
        pushError(
          errors,
          "document-target-kind-mismatch",
          `Only corpus-feature annotations may target the whole document (${annotation.id}).`,
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

  return errors;
}

const documentSchema = await readJson("schemas/textdoc-document-v1.schema.json");
const validateDocument = ajv.compile(documentSchema);
const resultEnvelopeSchema = await readJson("schemas/textprotocol-result-envelope-v1.schema.json");
const validateResultEnvelope = ajv.compile(resultEnvelopeSchema);
const conformanceReportSchema = await readJson("schemas/textconformance-report-v1.schema.json");
const validateConformanceReport = ajv.compile(conformanceReportSchema);
const textdocPackage = await readJson("packages/textdoc/package.json");

const validFixturePath = "fixtures/textdoc/examples/document-annotation-model-v1.json";
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

const resultEnvelope = {
  schemaId: "urn:ismail-elkorchi:textprotocol:result-envelope:v1",
  schemaVersion: 1,
  producer: {
    package: textdocPackage.name,
    version: textdocPackage.version,
  },
  payloadKind: "textdoc-document",
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
      message: "Document fixture satisfies view, target, overlap, and lifecycle rules.",
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
];

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
