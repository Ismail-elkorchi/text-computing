import Ajv from "ajv";
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";

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

const slicesSchema = await readJson(slicesSchemaPath);
const toolVersionsSchema = await readJson(toolVersionsSchemaPath);
const expectedSchema = await readJson(expectedSchemaPath);
const comparisonSchema = await readJson(comparisonSchemaPath);
const textdocSchema = await readJson(textdocSchemaPath);
const resultEnvelopeSchema = await readJson(resultEnvelopeSchemaPath);
const conformanceSchema = await readJson(conformanceSchemaPath);

const validateSlices = ajv.compile(slicesSchema);
const validateToolVersions = ajv.compile(toolVersionsSchema);
ajv.addSchema(textdocSchema, "textdoc-document-v1.schema.json");
const validateExpected = ajv.compile(expectedSchema);
const validateComparison = ajv.compile(comparisonSchema);
const validateResultEnvelope = ajv.compile(resultEnvelopeSchema);
const validateConformanceReport = ajv.compile(conformanceSchema);

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
