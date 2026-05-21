import Ajv from "ajv";
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import {
  analyzeRuleBackedNer,
  createTextRulesEntityResource,
  isTextRulesEntityResourceData,
} from "../packages/textrules/src/index.ts";
import { resolveTextPackResources } from "../packages/textpack/src/index.ts";

const ajv = new Ajv({ allErrors: true, strict: true });

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function readText(path) {
  return readFile(path, "utf8");
}

function expect(condition, message, details) {
  if (condition) return;
  console.error(message);
  if (details !== undefined) {
    console.error(JSON.stringify(details, null, 2));
  }
  process.exit(1);
}

function sha256Text(text) {
  return createHash("sha256").update(text).digest("hex");
}

function spansOverlap(left, right) {
  return left.startCU < right.endCU && right.startCU < left.endCU;
}

const slicesSchemaPath = "schemas/rule-backed-ner-slices-v1.schema.json";
const toolVersionsSchemaPath = "schemas/rule-backed-ner-tool-versions-v1.schema.json";
const expectedSchemaPath = "schemas/rule-backed-ner-expected-v1.schema.json";
const comparisonSchemaPath = "schemas/rule-backed-ner-comparison-v1.schema.json";
const textdocSchemaPath = "schemas/textdoc-document-v1.schema.json";
const resultEnvelopeSchemaPath = "schemas/textprotocol-result-envelope-v1.schema.json";
const conformanceSchemaPath = "schemas/textconformance-report-v1.schema.json";
const textpackManifestSchemaPath = "schemas/textpack-manifest-v1.schema.json";

const slicesSchema = await readJson(slicesSchemaPath);
const toolVersionsSchema = await readJson(toolVersionsSchemaPath);
const expectedSchema = await readJson(expectedSchemaPath);
const comparisonSchema = await readJson(comparisonSchemaPath);
const textdocSchema = await readJson(textdocSchemaPath);
const resultEnvelopeSchema = await readJson(resultEnvelopeSchemaPath);
const conformanceSchema = await readJson(conformanceSchemaPath);
const textpackManifestSchema = await readJson(textpackManifestSchemaPath);

const validateSlices = ajv.compile(slicesSchema);
const validateToolVersions = ajv.compile(toolVersionsSchema);
ajv.addSchema(textdocSchema, "textdoc-document-v1.schema.json");
const validateExpected = ajv.compile(expectedSchema);
const validateComparison = ajv.compile(comparisonSchema);
const validateResultEnvelope = ajv.compile(resultEnvelopeSchema);
const validateConformanceReport = ajv.compile(conformanceSchema);
const validateTextPackManifest = ajv.compile(textpackManifestSchema);

const slicesPath = "fixtures/rule-backed-ner/slices.json";
const toolVersionsPath = "fixtures/rule-backed-ner/tool-versions.json";

const slices = await readJson(slicesPath);
const toolVersions = await readJson(toolVersionsPath);

expect(validateSlices(slices), `${slicesPath} failed ${slicesSchemaPath}`, validateSlices.errors);
expect(
  validateToolVersions(toolVersions),
  `${toolVersionsPath} failed ${toolVersionsSchemaPath}`,
  validateToolVersions.errors,
);

expect(
  slices.expectedOutputStatus === "recorded",
  "Rule-backed NER readiness requires recorded expected outputs.",
);

const requiredPhenomena = new Set([
  "nested-span",
  "overlapping-span",
  "alias",
  "capitalization-ambiguity",
  "false-match",
  "latin-script-non-english",
  "non-latin-script",
]);
const seenPhenomena = new Set();
const sliceIds = new Set();
const slicesById = new Map();
for (const slice of slices.slices) {
  expect(!sliceIds.has(slice.id), `Duplicate rule-backed NER slice id: ${slice.id}`);
  sliceIds.add(slice.id);
  slicesById.set(slice.id, slice);
  for (const phenomenon of slice.phenomena) {
    seenPhenomena.add(phenomenon);
  }
}
for (const phenomenon of requiredPhenomena) {
  expect(
    seenPhenomena.has(phenomenon),
    `Rule-backed NER readiness is missing phenomenon coverage for ${phenomenon}.`,
  );
}

expect(
  toolVersions.targetLabels.join(",") === "PER,ORG,LOC",
  "Rule-backed NER targetLabels must be exactly PER, ORG, LOC.",
);
expect(
  slices.labelPolicyControls.emittedLabels.join(",") === toolVersions.targetLabels.join(","),
  "Rule-backed NER label policy controls must match frozen target labels.",
);
for (const label of ["MISC", "PRODUCT", "EVENT"]) {
  expect(
    slices.labelPolicyControls.rejectedLabels.some((entry) => entry.label === label),
    `Rule-backed NER label policy controls must reject ${label}.`,
  );
}

const runtimes = new Set(toolVersions.comparators.map((entry) => entry.runtime));
expect(
  runtimes.has("javascript"),
  "Rule-backed NER readiness requires at least one frozen JavaScript comparator.",
);
expect(
  runtimes.has("python") || runtimes.has("jvm"),
  "Rule-backed NER readiness requires at least one frozen Python or JVM comparator.",
);

const readinessDoc = await readText("docs/specs/rule-backed-ner-readiness.md");
for (const heading of [
  "## Why this document exists",
  "## Label policy",
  "## Allowed fixture policy",
  "## Input slices",
  "## Rule priority and tie-break policy",
  "## Overlap and nested-span policy",
  "## Expected-output format",
  "## Comparator freeze",
  "## Comparator outputs",
  "## Verification",
]) {
  expect(
    readinessDoc.includes(heading),
    `docs/specs/rule-backed-ner-readiness.md is missing heading: ${heading}`,
  );
}

const researchLedger = await readText("docs/specs/nlp-rule-backed-ner-research-ledger.md");
for (const heading of [
  "## Scope",
  "## Primary sources",
  "## Comparator capability evidence",
  "## Comparator limitations",
  "## Readiness consequences",
]) {
  expect(
    researchLedger.includes(heading),
    `docs/specs/nlp-rule-backed-ner-research-ledger.md is missing heading: ${heading}`,
  );
}

const outputDifferences = await readText("docs/decisions/rule-backed-ner-output-differences.md");
expect(
  outputDifferences.includes("## Documented non-failure differences"),
  "docs/decisions/rule-backed-ner-output-differences.md is missing documented differences.",
);

const expectedDir = "fixtures/rule-backed-ner/expected";
const expectedFiles = (await readdir(expectedDir))
  .filter((file) => file.endsWith(".json"))
  .sort();
expect(
  expectedFiles.length >= sliceIds.size,
  "Rule-backed NER readiness requires one expected output per slice.",
);

const expectedSliceIds = new Set();
const allowedLabels = new Set(toolVersions.targetLabels);
const corpusDocumentBySliceId = new Map();
const splitRoles = new Set();
const holdoutLanguages = new Set();
let zeroEntityNegativeControls = 0;
for (const resourceRef of slices.corpusEvidence.resourceRefs) {
  expect(
    resourceRef.startsWith("fixtures/rule-backed-ner/"),
    `Rule-backed NER corpus resource ref must stay under fixtures/rule-backed-ner/: ${resourceRef}`,
  );
}
expect(
  slices.corpusEvidence.license === "CC0-1.0",
  "Rule-backed NER corpus evidence must record a CC0-1.0 fixture license.",
);
expect(
  slices.corpusEvidence.documents.map((entry) => entry.sliceId).join(",") ===
    [...slices.corpusEvidence.documents.map((entry) => entry.sliceId)].sort().join(","),
  "Rule-backed NER corpus evidence documents must be sorted by slice id.",
);
for (const document of slices.corpusEvidence.documents) {
  expect(!corpusDocumentBySliceId.has(document.sliceId), `Duplicate NER corpus document for ${document.sliceId}.`);
  corpusDocumentBySliceId.set(document.sliceId, document);
  splitRoles.add(document.splitRole);
  if (document.splitRole === "holdout") holdoutLanguages.add(document.language);
  if (document.splitRole === "negative-control" && document.entityCount === 0) {
    zeroEntityNegativeControls += 1;
  }
  const slice = slicesById.get(document.sliceId);
  expect(slice !== undefined, `NER corpus evidence references unknown slice ${document.sliceId}.`);
  expect(
    document.expectedPath === `fixtures/rule-backed-ner/expected/${document.sliceId}.json`,
    `${document.sliceId} corpus expectedPath must point to the committed expected output.`,
  );
  expect(
    document.sourceSha256 === sha256Text(slice.source.text),
    `${document.sliceId} corpus source hash mismatch.`,
  );
  expect(document.language === slice.languageHint, `${document.sliceId} corpus language mismatch.`);
}
for (const splitRole of ["development", "validation", "holdout", "negative-control"]) {
  expect(splitRoles.has(splitRole), `Rule-backed NER corpus evidence is missing split role ${splitRole}.`);
}
for (const language of ["ar", "es", "fr", "ja"]) {
  expect(holdoutLanguages.has(language), `Rule-backed NER corpus evidence is missing holdout language ${language}.`);
}
expect(
  zeroEntityNegativeControls >= 1,
  "Rule-backed NER corpus evidence must include at least one zero-entity negative control.",
);
expect(
  slices.corpusEvidence.documents.length === sliceIds.size,
  "Rule-backed NER corpus evidence must cover every frozen slice.",
);

function tokenizeFixtureText(text) {
  const tokens = [];
  let cursor = 0;
  let tokenIndex = 1;
  const boundaryPunctuation = new Set([".", ",", "(", ")", "،", "。"]);
  const hasWhitespace = /\s/u.test(text);
  while (cursor < text.length) {
    const current = text[cursor];
    if (current === undefined) break;
    if (/\s/u.test(current)) {
      cursor += 1;
      continue;
    }
    if (boundaryPunctuation.has(current)) {
      tokens.push({ id: `token-${tokenIndex}`, startCU: cursor, endCU: cursor + 1, text: current });
      tokenIndex += 1;
      cursor += 1;
      continue;
    }
    const startCU = cursor;
    if (!hasWhitespace) {
      const [codePoint] = Array.from(text.slice(cursor));
      const width = codePoint.length;
      tokens.push({ id: `token-${tokenIndex}`, startCU, endCU: cursor + width, text: codePoint });
      tokenIndex += 1;
      cursor += width;
      continue;
    }
    while (
      cursor < text.length &&
      !/\s/u.test(text[cursor] ?? "") &&
      !boundaryPunctuation.has(text[cursor] ?? "")
    ) {
      cursor += 1;
    }
    tokens.push({ id: `token-${tokenIndex}`, startCU, endCU: cursor, text: text.slice(startCU, cursor) });
    tokenIndex += 1;
  }
  return tokens;
}

function createInputDocument(slice) {
  const text = slice.source.text;
  const tokens = tokenizeFixtureText(text);
  return {
    schemaVersion: 1,
    documentId: `rule-backed-ner:${slice.id}`,
    revision: "pre-ner",
    textLengthCU: text.length,
    text,
    source: {
      id: slice.id,
      sha256: sha256Text(text),
    },
    unicodeVersion: "17.0.0",
    units: {
      text: "utf16-code-unit",
    },
    views: [
      { id: "source-view", kind: "raw" },
      {
        id: "analysis-view",
        kind: "task",
        parentViewId: "source-view",
        spanMapIds: ["span-map-source-analysis"],
      },
    ],
    spanMaps: [
      {
        id: "span-map-source-analysis",
        sourceViewId: "source-view",
        targetViewId: "analysis-view",
        lifecycle: { state: "active" },
        segments: [
          {
            source: { startCU: 0, endCU: text.length },
            target: { startCU: 0, endCU: text.length },
            kind: "unchanged",
            reversible: true,
          },
        ],
      },
    ],
    layers: [
      {
        id: "tokens",
        kind: "token",
        viewId: "analysis-view",
        annotations: tokens.map((token) => ({
          id: token.id,
          kind: "token",
          tokenKind: "lexical-token",
          lifecycle: { state: "active" },
          targets: [
            {
              kind: "span",
              viewId: "analysis-view",
              startCU: token.startCU,
              endCU: token.endCU,
            },
          ],
          text: token.text,
        })),
      },
      {
        id: "sentences",
        kind: "sentence",
        viewId: "analysis-view",
        annotations: [
          {
            id: "sentence-1",
            kind: "sentence",
            sentenceKind: "uax29-sentence",
            lifecycle: { state: "active" },
            targets: [{ kind: "span", viewId: "analysis-view", startCU: 0, endCU: text.length }],
            text,
          },
        ],
      },
    ],
  };
}

function entityProjection(document) {
  const entityLayer = document.layers.find((layer) => layer.kind === "entity");
  if (!entityLayer) return [];
  return entityLayer.annotations.map((annotation) => {
    const target = annotation.targets[0];
    expect(target?.kind === "span", `Entity ${annotation.id} must target a span.`);
    return {
      label: annotation.label,
      text: annotation.text,
      startCU: target.startCU,
      endCU: target.endCU,
    };
  });
}

const manifestDir = "fixtures/rule-backed-ner/manifests";
const manifestFiles = (await readdir(manifestDir)).filter((file) => file.endsWith(".json")).sort();
const manifests = [];
for (const file of manifestFiles) {
  const manifestPath = `${manifestDir}/${file}`;
  const manifest = await readJson(manifestPath);
  expect(validateTextPackManifest(manifest), `${manifestPath} failed ${textpackManifestSchemaPath}`, validateTextPackManifest.errors);
  manifests.push(manifest);
}
const entityResources = [];
for (const resource of resolveTextPackResources(manifests, { kind: "gazetteer" }).resources) {
  const data = await readJson(resource.path);
  expect(isTextRulesEntityResourceData(data), `${resource.path} is not a valid textrules entity resource.`);
  entityResources.push(createTextRulesEntityResource(resource, data));
}
expect(entityResources.length > 0, "Rule-backed NER validation requires at least one explicit gazetteer resource.");

for (const file of expectedFiles) {
  const dataPath = `${expectedDir}/${file}`;
  const data = await readJson(dataPath);
  expect(validateExpected(data), `${dataPath} failed ${expectedSchemaPath}`, validateExpected.errors);

  const slice = slicesById.get(data.sliceId);
  expect(slice !== undefined, `${dataPath} references unknown slice ${data.sliceId}`);

  const expectedSha = sha256Text(slice.source.text);
  expect(
    data.source.sliceId === slice.id,
    `${dataPath} source.sliceId must match the recorded slice id`,
  );
  expect(
    data.source.sha256 === expectedSha,
    `${dataPath} source.sha256 does not match the recorded slice text`,
  );
  expect(
    data.document.text === slice.source.text,
    `${dataPath} document.text does not match slices.json`,
  );
  expect(
    data.document.textLengthCU === slice.source.text.length,
    `${dataPath} document.textLengthCU does not match the recorded slice text`,
  );
  expect(
    data.document.source?.id === slice.id && data.document.source?.sha256 === expectedSha,
    `${dataPath} document.source must match the frozen slice id and sha256`,
  );

  const tokenLayer = data.document.layers.find((layer) => layer.id === "tokens" && layer.kind === "token");
  const sentenceLayer = data.document.layers.find(
    (layer) => layer.id === "sentences" && layer.kind === "sentence",
  );
  const entityLayer = data.document.layers.find((layer) => layer.id === "entities" && layer.kind === "entity");
  expect(tokenLayer !== undefined, `${dataPath} must define a token layer`);
  expect(sentenceLayer !== undefined, `${dataPath} must define a sentence layer`);
  expect(entityLayer !== undefined, `${dataPath} must define an entity layer`);

  for (const annotation of entityLayer.annotations) {
    expect(
      allowedLabels.has(annotation.label),
      `${dataPath} contains unsupported entity label ${annotation.label}`,
    );
  }
  const generated = analyzeRuleBackedNer(
    {
      document: createInputDocument(slice),
      languageHint: slice.languageHint,
      allowSpanOverlap: slice.phenomena.includes("nested-span") || slice.phenomena.includes("overlapping-span"),
    },
    entityResources,
  );
  expect(
    JSON.stringify(entityProjection(generated.document)) === JSON.stringify(entityProjection(data.document)),
    `${dataPath} generated rule-backed NER entities do not match expected output.`,
  );
  const corpusDocument = corpusDocumentBySliceId.get(data.sliceId);
  expect(corpusDocument !== undefined, `${dataPath} is missing corpus evidence.`);
  expect(
    corpusDocument.entityCount === entityLayer.annotations.length,
    `${dataPath} corpus entityCount does not match expected output.`,
  );

  const spans = entityLayer.annotations.map((annotation) => annotation.targets[0]);
  let needsOverlapPolicy = false;
  for (let index = 0; index < spans.length; index += 1) {
    for (let other = index + 1; other < spans.length; other += 1) {
      if (spansOverlap(spans[index], spans[other])) {
        needsOverlapPolicy = true;
      }
    }
  }
  if (needsOverlapPolicy) {
    expect(
      entityLayer.allowSpanOverlap === true,
      `${dataPath} contains overlapping or nested entity spans but does not enable allowSpanOverlap`,
    );
  }

  const resultEnvelope = {
    schemaId: "urn:ismail-elkorchi:textprotocol:result-envelope:v1",
    schemaVersion: 1,
    producer: {
      package: "@ismail-elkorchi/textrules",
      version: "0.0.0-readiness",
    },
    payloadKind: "rule-backed-ner-expected",
    payload: data.document,
    provenance: {
      source: {
        id: slice.id,
        sha256: expectedSha,
      },
    },
  };
  expect(
    validateResultEnvelope(resultEnvelope),
    `${dataPath} cannot be represented by the textprotocol result envelope schema`,
    validateResultEnvelope.errors,
  );

  const conformanceReport = {
    schemaId: "urn:ismail-elkorchi:textconformance:report:v1",
    schemaVersion: 1,
    reportId: `rule-backed-ner:${slice.id}`,
    subject: {
      kind: "textprotocol-result-envelope",
      id: `rule-backed-ner:${slice.id}`,
      schemaId: resultEnvelope.schemaId,
    },
    generatedAt: "2026-04-23T00:00:00.000Z",
    summary: {
      pass: 1,
      fail: 0,
      notRun: 0,
    },
    checks: [
      {
        checkId: "rule-backed-ner-envelope-roundtrip-shape",
        status: "pass",
        message: "Recorded expected output is representable as textdoc and wrapped in a result envelope.",
        evidenceRefs: [
          `fixtures/rule-backed-ner/expected/${slice.id}.json`,
          "schemas/rule-backed-ner-expected-v1.schema.json",
          "schemas/textprotocol-result-envelope-v1.schema.json",
        ],
      },
    ],
    notes: data.notes,
  };
  expect(
    validateConformanceReport(conformanceReport),
    `${dataPath} cannot be referenced by the textconformance report schema`,
    validateConformanceReport.errors,
  );

  expectedSliceIds.add(data.sliceId);
}

for (const sliceId of sliceIds) {
  expect(
    expectedSliceIds.has(sliceId),
    `Rule-backed NER expected outputs are missing slice ${sliceId}`,
  );
}

const comparisonDir = "fixtures/rule-backed-ner/comparisons";
const comparisonFiles = (await readdir(comparisonDir))
  .filter((file) => file.endsWith(".json"))
  .sort();
expect(
  comparisonFiles.length >= 2,
  "Rule-backed NER comparisons require at least two comparator output files.",
);

let hasPythonOrJvmComparator = false;
let hasJavaScriptComparator = false;
for (const file of comparisonFiles) {
  const dataPath = `${comparisonDir}/${file}`;
  const data = await readJson(dataPath);
  expect(validateComparison(data), `${dataPath} failed ${comparisonSchemaPath}`, validateComparison.errors);

  const comparator = toolVersions.comparators.find(
    (entry) => entry.name === data.comparator.name && entry.version === data.comparator.version,
  );
  expect(
    comparator !== undefined,
    `${dataPath} comparator ${data.comparator.name}@${data.comparator.version} is not listed in tool-versions.json`,
  );
  if (data.comparator.model) {
    expect(
      comparator.model === data.comparator.model.name &&
        comparator.modelVersion === data.comparator.model.version,
      `${dataPath} model ${data.comparator.model.name}@${data.comparator.model.version} does not match tool-versions.json`,
    );
  }

  const comparisonSliceIds = new Set(data.slices.map((slice) => slice.sliceId));
  for (const sliceId of sliceIds) {
    expect(comparisonSliceIds.has(sliceId), `${dataPath} does not include slice ${sliceId}`);
  }

  for (const slice of data.slices) {
    if (slice.status === "not-run") {
      expect(
        typeof slice.reason === "string" && slice.reason.length > 0,
        `${dataPath} slice ${slice.sliceId} is not-run but does not record a reason`,
      );
    }
  }

  const runtime = data.comparator.runtime.toLowerCase();
  if (runtime.includes("python") || runtime.includes("jvm") || runtime.includes("java")) {
    hasPythonOrJvmComparator = true;
  }
  if (runtime.includes("node") || runtime.includes("javascript") || runtime.includes("js")) {
    hasJavaScriptComparator = true;
  }
}

expect(
  hasPythonOrJvmComparator && hasJavaScriptComparator,
  "Rule-backed NER comparisons require at least one Python/JVM comparator and one JavaScript comparator.",
);

console.log("Rule-backed NER readiness artifacts OK.");
