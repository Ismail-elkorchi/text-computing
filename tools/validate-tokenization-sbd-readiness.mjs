import Ajv from "ajv";
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";

const artifactPairs = [
  {
    schemaPath: "schemas/tokenization-sbd-slices-v1.schema.json",
    dataPath: "fixtures/tokenization-sbd/slices.json",
  },
  {
    schemaPath: "schemas/tokenization-sbd-tool-versions-v1.schema.json",
    dataPath: "fixtures/tokenization-sbd/tool-versions.json",
  },
];

const ajv = new Ajv({ allErrors: true, strict: true });

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value).sort(([left], [right]) => left.localeCompare(right));
    const serializedEntries = entries.map(
      ([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`,
    );
    return `{${serializedEntries.join(",")}}`;
  }
  return JSON.stringify(value);
}

function sourceSha256(source) {
  return createHash("sha256").update(stableStringify(source), "utf8").digest("hex");
}

function materializeSource(source) {
  if (source.kind === "text") return source.text;
  if (source.kind === "utf16-code-units") {
    return String.fromCharCode(...source.units.map((unit) => Number.parseInt(unit, 16)));
  }
  throw new Error(`Unsupported tokenization/SBD source kind: ${source.kind}`);
}

for (const pair of artifactPairs) {
  const schema = await readJson(pair.schemaPath);
  const validate = ajv.compile(schema);
  if (!pair.dataPath) continue;

  const data = await readJson(pair.dataPath);
  const valid = validate(data);
  if (!valid) {
    console.error(`${pair.dataPath} failed ${pair.schemaPath}`);
    console.error(JSON.stringify(validate.errors, null, 2));
    process.exit(1);
  }
}

const slices = await readJson("fixtures/tokenization-sbd/slices.json");
const sliceIds = new Set();
const slicesById = new Map();
for (const slice of slices.slices) {
  if (sliceIds.has(slice.id)) {
    console.error(`Duplicate tokenization/SBD slice id: ${slice.id}`);
    process.exit(1);
  }
  sliceIds.add(slice.id);
  slicesById.set(slice.id, slice);
}

const expectedSchema = await readJson("schemas/tokenization-sbd-expected-v1.schema.json");
const validateExpected = ajv.compile(expectedSchema);
const textdocAnnotationSetSchema = await readJson(
  "schemas/textdoc-token-sentence-annotation-set-v1.schema.json",
);
const validateTextdocAnnotationSet = ajv.compile(textdocAnnotationSetSchema);
const resultEnvelopeSchema = await readJson("schemas/textprotocol-result-envelope-v1.schema.json");
const validateResultEnvelope = ajv.compile(resultEnvelopeSchema);
const conformanceReportSchema = await readJson("schemas/textconformance-report-v1.schema.json");
const validateConformanceReport = ajv.compile(conformanceReportSchema);
const toolVersions = await readJson("fixtures/tokenization-sbd/tool-versions.json");
const expectedDir = "fixtures/tokenization-sbd/expected";
const expectedFiles = (await readdir(expectedDir)).filter((file) => file.endsWith(".json")).sort();
if (slices.expectedOutputStatus === "recorded" && expectedFiles.length !== sliceIds.size) {
  console.error(
    `Tokenization/SBD expected outputs are recorded, but ${expectedFiles.length} files exist for ${sliceIds.size} slices.`,
  );
  process.exit(1);
}

const expectedSliceIds = new Set();
for (const file of expectedFiles) {
  const dataPath = `${expectedDir}/${file}`;
  const data = await readJson(dataPath);
  if (!validateExpected(data)) {
    console.error(`${dataPath} failed schemas/tokenization-sbd-expected-v1.schema.json`);
    console.error(JSON.stringify(validateExpected.errors, null, 2));
    process.exit(1);
  }
  const expectedFileName = `${data.sliceId}.json`;
  if (file !== expectedFileName) {
    console.error(`${dataPath} must be named ${expectedFileName}`);
    process.exit(1);
  }
  const slice = slicesById.get(data.sliceId);
  if (!slice) {
    console.error(`${dataPath} references unknown slice ${data.sliceId}`);
    process.exit(1);
  }
  if (data.source.sliceId !== data.sliceId) {
    console.error(`${dataPath} source.sliceId does not match sliceId`);
    process.exit(1);
  }
  const expectedHash = sourceSha256(slice.source);
  if (data.source.sha256 !== expectedHash) {
    console.error(`${dataPath} source hash ${data.source.sha256} does not match ${expectedHash}`);
    process.exit(1);
  }
  const text = materializeSource(slice.source);
  for (const section of ["tokens", "sentences"]) {
    for (const span of data[section]) {
      if (span.endCU < span.startCU || span.endCU > text.length) {
        console.error(`${dataPath} contains invalid ${section} span ${span.id}`);
        process.exit(1);
      }
      if (span.text !== undefined && span.text !== text.slice(span.startCU, span.endCU)) {
        console.error(
          `${dataPath} contains ${section} span ${span.id} text that does not match its offsets`,
        );
        process.exit(1);
      }
    }
  }
  const textdocAnnotationSet = {
    schemaVersion: 1,
    documentId: `tokenization-sbd:${data.sliceId}`,
    source: {
      id: data.source.sliceId,
      sha256: data.source.sha256,
    },
    unicodeVersion: data.unicodeVersion,
    units: data.units,
    tokens: data.tokens,
    sentences: data.sentences,
    ...(data.notes ? { notes: data.notes } : {}),
  };
  if (!validateTextdocAnnotationSet(textdocAnnotationSet)) {
    console.error(`${dataPath} cannot be represented by the textdoc token/sentence annotation set schema`);
    console.error(JSON.stringify(validateTextdocAnnotationSet.errors, null, 2));
    process.exit(1);
  }
  const resultEnvelope = {
    schemaId: "urn:ismail-elkorchi:textprotocol:result-envelope:v1",
    schemaVersion: 1,
    producer: {
      package: "@ismail-elkorchi/textfacts",
      version: toolVersions.packagesUnderTest.find(
        (entry) => entry.name === "@ismail-elkorchi/textfacts",
      )?.version,
    },
    payloadKind: "textdoc-token-sentence-annotation-set",
    payload: textdocAnnotationSet,
    provenance: {
      source: {
        id: data.source.sliceId,
        sha256: data.source.sha256,
      },
      references: [
        {
          kind: "fixture-slice",
          id: data.sliceId,
        },
      ],
    },
    diagnostics: (data.notes ?? []).map((note, noteIndex) => ({
      code: `tokenization-sbd-note-${noteIndex + 1}`,
      severity: "info",
      message: note,
    })),
  };
  if (!validateResultEnvelope(resultEnvelope)) {
    console.error(`${dataPath} cannot be represented by the textprotocol result envelope schema`);
    console.error(JSON.stringify(validateResultEnvelope.errors, null, 2));
    process.exit(1);
  }
  const conformanceReport = {
    schemaId: "urn:ismail-elkorchi:textconformance:report:v1",
    schemaVersion: 1,
    reportId: `tokenization-sbd:${data.sliceId}`,
    subject: {
      kind: "textprotocol-result-envelope",
      id: `tokenization-sbd:${data.sliceId}`,
      schemaId: resultEnvelope.schemaId,
    },
    generatedAt: "2026-04-21T00:00:00.000Z",
    summary: {
      pass: 1,
      fail: 0,
      notRun: 0,
    },
    checks: [
      {
        checkId: "tokenization-sbd-envelope-roundtrip-shape",
        status: "pass",
        message: "Recorded expected output is representable as textdoc and wrapped in a result envelope.",
        evidenceRefs: [
          `fixtures/tokenization-sbd/expected/${data.sliceId}.json`,
          "schemas/textdoc-token-sentence-annotation-set-v1.schema.json",
          "schemas/textprotocol-result-envelope-v1.schema.json",
        ],
      },
    ],
    notes: data.notes,
  };
  if (!validateConformanceReport(conformanceReport)) {
    console.error(`${dataPath} cannot be referenced by the textconformance report schema`);
    console.error(JSON.stringify(validateConformanceReport.errors, null, 2));
    process.exit(1);
  }
  expectedSliceIds.add(data.sliceId);
}

if (slices.expectedOutputStatus === "recorded") {
  for (const sliceId of sliceIds) {
    if (!expectedSliceIds.has(sliceId)) {
      console.error(`Tokenization/SBD expected outputs are missing slice ${sliceId}`);
      process.exit(1);
    }
  }
}

const diagnosticToolKeys = new Set(
  toolVersions.diagnosticTools.map((tool) => `${tool.name}@${tool.version}`),
);
const comparisonSchema = await readJson("schemas/tokenization-sbd-comparison-v1.schema.json");
const validateComparison = ajv.compile(comparisonSchema);
const comparisonDir = "fixtures/tokenization-sbd/comparisons";
const comparisonFiles = (await readdir(comparisonDir))
  .filter((file) => file.endsWith(".json"))
  .sort();
if (comparisonFiles.length < 2) {
  console.error("Tokenization/SBD comparisons require at least two comparator output files.");
  process.exit(1);
}

let hasPythonOrJvmComparator = false;
let hasJavaScriptComparator = false;
for (const file of comparisonFiles) {
  const dataPath = `${comparisonDir}/${file}`;
  const data = await readJson(dataPath);
  if (!validateComparison(data)) {
    console.error(`${dataPath} failed schemas/tokenization-sbd-comparison-v1.schema.json`);
    console.error(JSON.stringify(validateComparison.errors, null, 2));
    process.exit(1);
  }
  const comparatorKey = `${data.comparator.name}@${data.comparator.version}`;
  if (!diagnosticToolKeys.has(comparatorKey)) {
    console.error(`${dataPath} comparator ${comparatorKey} is not listed in tool-versions.json`);
    process.exit(1);
  }
  if (data.comparator.model) {
    const modelKey = `${data.comparator.model.name}@${data.comparator.model.version}`;
    if (!diagnosticToolKeys.has(modelKey)) {
      console.error(`${dataPath} model ${modelKey} is not listed in tool-versions.json`);
      process.exit(1);
    }
  }

  const comparisonSliceIds = new Set(data.slices.map((slice) => slice.sliceId));
  for (const sliceId of sliceIds) {
    if (!comparisonSliceIds.has(sliceId)) {
      console.error(`${dataPath} does not include slice ${sliceId}`);
      process.exit(1);
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

if (!hasPythonOrJvmComparator || !hasJavaScriptComparator) {
  console.error(
    "Tokenization/SBD comparisons require at least one Python/JVM comparator and one JavaScript comparator.",
  );
  process.exit(1);
}

for (const packageUnderTest of toolVersions.packagesUnderTest) {
  const packageJson = await readJson(packageUnderTest.source);
  if (
    packageJson.name !== packageUnderTest.name ||
    packageJson.version !== packageUnderTest.version
  ) {
    console.error(
      `${packageUnderTest.source} does not match ${packageUnderTest.name}@${packageUnderTest.version}`,
    );
    process.exit(1);
  }
}

console.log("Tokenization/SBD readiness artifacts OK.");
