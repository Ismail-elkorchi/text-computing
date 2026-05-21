import Ajv from "ajv";
import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import {
  computeTextCorpusScoring,
  createTextCorpusCollection,
  isTextCorpusScoringResultV1,
} from "../packages/textcorpus/src/index.ts";

const ajv = new Ajv({ allErrors: true, strict: true });
const WRITE_MODE = process.argv.includes("--write");

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function readText(path) {
  return readFile(path, "utf8");
}

function expect(condition, message, details) {
  if (condition) return;
  console.error(message);
  if (details !== undefined) console.error(JSON.stringify(details, null, 2));
  process.exit(1);
}

function docMapById(documents) {
  return new Map(documents.map((document) => [document.id, document]));
}

function sha256Json(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function createDocument(documentId, text, tokenTexts) {
  let cursor = 0;
  const annotations = [];
  for (const [index, tokenText] of tokenTexts.entries()) {
    const startCU = text.indexOf(tokenText, cursor);
    expect(startCU >= 0, `token ${tokenText} not found in ${documentId}`);
    const endCU = startCU + tokenText.length;
    cursor = endCU;
    annotations.push({
      id: `token-${index + 1}`,
      kind: "token",
      tokenKind: "lexical-token",
      lifecycle: { state: "active" },
      targets: [{ kind: "span", viewId: "analysis-view", startCU, endCU }],
      text: tokenText,
    });
  }
  return {
    schemaVersion: 1,
    documentId,
    revision: "corpus-tfidf-bm25-v1",
    textLengthCU: text.length,
    text,
    units: { text: "utf16-code-unit" },
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
        segments:
          text.length === 0
            ? []
            : [
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
        annotations,
      },
    ],
  };
}

function entryFromSlice(document) {
  return {
    id: document.id,
    document: createDocument(`doc:corpus-tfidf-bm25:${document.id}`, document.tokens.join(" "), document.tokens),
    viewId: "analysis-view",
    tokenLayerId: "tokens",
    metadata: document.metadata,
  };
}

function expectedPathForCorpus(corpusId) {
  return `fixtures/corpus-tfidf-bm25/expected/${corpusId}.json`;
}

function scoringOptionsForCorpus(corpus) {
  const hasFormulaVariants = corpus.phenomena.includes("formula-variant");
  return {
    tolerance: 1e-12,
    queries: corpus.queries,
    ...(hasFormulaVariants
      ? {
          tfidfFormulas: ["tfidf.sklearn-smooth-raw", "tfidf.sklearn-smooth-l2"],
          bm25Formulas: ["bm25.okapi.k1-1.5.b-0.75", "bm25.okapi.k1-1.2.b-0.75"],
        }
      : {}),
  };
}

function comparableExpected(scoringResult) {
  return {
    schemaVersion: 1,
    corpusId: scoringResult.corpusId,
    formulaSet: scoringResult.formulaSet,
    documentOrder: scoringResult.documentOrder,
    termOrder: scoringResult.termOrder,
    tolerance: scoringResult.tolerance,
    documents: scoringResult.documents,
    queries: scoringResult.queries,
  };
}

function assertNear(actual, expected, tolerance, label) {
  expect(
    typeof actual === "number" && Math.abs(actual - expected) <= tolerance,
    `${label}: expected ${expected}, got ${actual}`,
  );
}

function assertJsonComparable(actual, expected, tolerance, label) {
  if (typeof expected === "number") {
    assertNear(actual, expected, tolerance, label);
    return;
  }
  if (Array.isArray(expected)) {
    expect(Array.isArray(actual), `${label} must be an array.`);
    expect(actual.length === expected.length, `${label} length mismatch.`);
    for (const [index, expectedEntry] of expected.entries()) {
      assertJsonComparable(actual[index], expectedEntry, tolerance, `${label}[${index}]`);
    }
    return;
  }
  if (expected !== null && typeof expected === "object") {
    expect(actual !== null && typeof actual === "object" && !Array.isArray(actual), `${label} must be an object.`);
    const expectedKeys = Object.keys(expected).sort();
    const actualKeys = Object.keys(actual).sort();
    expect(JSON.stringify(actualKeys) === JSON.stringify(expectedKeys), `${label} keys mismatch.`, { actualKeys, expectedKeys });
    for (const key of expectedKeys) {
      assertJsonComparable(actual[key], expected[key], tolerance, `${label}.${key}`);
    }
    return;
  }
  expect(actual === expected, `${label}: expected ${expected}, got ${actual}`);
}

const slicesSchemaPath = "schemas/corpus-tfidf-bm25-slices-v1.schema.json";
const toolVersionsSchemaPath = "schemas/corpus-tfidf-bm25-tool-versions-v1.schema.json";
const expectedSchemaPath = "schemas/corpus-tfidf-bm25-expected-v1.schema.json";
const comparisonSchemaPath = "schemas/corpus-tfidf-bm25-comparison-v1.schema.json";

const validateSlices = ajv.compile(await readJson(slicesSchemaPath));
const validateToolVersions = ajv.compile(await readJson(toolVersionsSchemaPath));
const validateExpected = ajv.compile(await readJson(expectedSchemaPath));
const validateComparison = ajv.compile(await readJson(comparisonSchemaPath));

const slicesPath = "fixtures/corpus-tfidf-bm25/slices.json";
const toolVersionsPath = "fixtures/corpus-tfidf-bm25/tool-versions.json";
const slices = await readJson(slicesPath);
const toolVersions = await readJson(toolVersionsPath);

expect(validateSlices(slices), `${slicesPath} failed ${slicesSchemaPath}`, validateSlices.errors);
expect(
  validateToolVersions(toolVersions),
  `${toolVersionsPath} failed ${toolVersionsSchemaPath}`,
  validateToolVersions.errors,
);
expect(slices.expectedOutputStatus === "recorded", "Corpus TF-IDF/BM25 readiness requires recorded expected outputs.");

const requiredPhenomena = new Set([
  "repeated-term",
  "shared-term",
  "singleton-term",
  "empty-document",
  "missing-query-term",
  "stable-ordering",
  "larger-corpus",
  "formula-variant",
  "numeric-tolerance",
  "performance-threshold",
]);
const seenPhenomena = new Set();
const corpusIds = new Set();
let scaledCorpusCount = 0;
for (const corpus of slices.corpora) {
  expect(!corpusIds.has(corpus.id), `Duplicate corpus id: ${corpus.id}`);
  corpusIds.add(corpus.id);
  for (const phenomenon of corpus.phenomena) seenPhenomena.add(phenomenon);
  const documentIds = corpus.documents.map((document) => document.id);
  expect(documentIds.join(",") === [...documentIds].sort().join(","), `${corpus.id} documents must be sorted by id.`);
  const tokenCount = corpus.documents.reduce((sum, document) => sum + document.tokens.length, 0);
  if (corpus.performanceThresholds !== undefined) {
    expect(corpus.license === "MIT", `${corpus.id} threshold corpus must declare the repository fixture license as MIT.`);
    expect(typeof corpus.provenance === "string" && corpus.provenance.length > 0, `${corpus.id} must declare provenance.`);
    expect(
      corpus.contentHash === `sha256:${sha256Json(corpus.documents)}`,
      `${corpus.id} contentHash must match its document list.`,
      { actual: corpus.contentHash, expected: `sha256:${sha256Json(corpus.documents)}` },
    );
    expect(
      corpus.documents.length >= corpus.performanceThresholds.minDocuments,
      `${corpus.id} does not satisfy its minDocuments threshold.`,
    );
    expect(tokenCount >= corpus.performanceThresholds.minTokens, `${corpus.id} does not satisfy its minTokens threshold.`);
    expect(corpus.queries.length >= corpus.performanceThresholds.minQueries, `${corpus.id} does not satisfy its minQueries threshold.`);
    scaledCorpusCount += 1;
  }
}
for (const phenomenon of requiredPhenomena) {
  expect(seenPhenomena.has(phenomenon), `Corpus TF-IDF/BM25 readiness is missing ${phenomenon}.`);
}
expect(scaledCorpusCount >= 1, "Corpus TF-IDF/BM25 readiness requires at least one threshold-checked larger corpus.");

const formulaIds = new Set(toolVersions.formulas.map((formula) => formula.id));
for (const formulaId of [
  "tf.raw-count",
  "df.document-count",
  "tfidf.sklearn-smooth-raw",
  "tfidf.sklearn-smooth-l2",
  "bm25.okapi.k1-1.5.b-0.75",
  "bm25.okapi.k1-1.2.b-0.75",
]) {
  expect(formulaIds.has(formulaId), `Corpus TF-IDF/BM25 formula freeze is missing ${formulaId}.`);
}
const runtimes = new Set(toolVersions.comparators.map((entry) => entry.runtime));
expect(runtimes.has("javascript"), "Corpus TF-IDF/BM25 readiness requires a JavaScript comparator.");
expect(runtimes.has("python") || runtimes.has("jvm"), "Corpus TF-IDF/BM25 readiness requires a Python or JVM comparator.");

const readinessDoc = await readText("docs/specs/corpus-tfidf-bm25-readiness.md");
for (const heading of [
  "## Why this document exists",
  "## Token policy",
  "## Formula policy",
  "## Numeric tolerance",
  "## Input slices",
  "## Expected-output format",
  "## Comparator freeze",
  "## Comparator outputs",
  "## Verification",
]) {
  expect(readinessDoc.includes(heading), `corpus-tfidf-bm25-readiness.md is missing ${heading}`);
}
const researchLedger = await readText("docs/specs/nlp-corpus-tfidf-bm25-research-ledger.md");
for (const heading of ["## Scope", "## Primary sources", "## Comparator capability evidence", "## Readiness consequences"]) {
  expect(researchLedger.includes(heading), `nlp-corpus-tfidf-bm25-research-ledger.md is missing ${heading}`);
}
const differencesDoc = await readText("docs/decisions/corpus-tfidf-bm25-output-differences.md");
expect(differencesDoc.includes("## Documented non-failure differences"), "corpus output differences doc must record non-failure differences.");

const expectedDir = "fixtures/corpus-tfidf-bm25/expected";
const expectedFiles = (await readdir(expectedDir)).filter((file) => file.endsWith(".json")).sort();
if (!WRITE_MODE) {
  expect(expectedFiles.length >= corpusIds.size, "Corpus TF-IDF/BM25 readiness requires one expected output per corpus.");
}
const corporaById = new Map(slices.corpora.map((corpus) => [corpus.id, corpus]));
for (const corpus of slices.corpora) {
  const filePath = expectedPathForCorpus(corpus.id);
  const collection = createTextCorpusCollection(corpus.documents.map((document) => entryFromSlice(document)), {
    corpusId: corpus.id,
  });
  const scoringResult = computeTextCorpusScoring(collection, scoringOptionsForCorpus(corpus));
  expect(isTextCorpusScoringResultV1(scoringResult), `${corpus.id} regenerated scoring result failed runtime validation.`);
  const regenerated = comparableExpected(scoringResult);
  if (WRITE_MODE) {
    await writeFile(filePath, `${JSON.stringify(regenerated, null, 2)}\n`);
  }
  const expected = await readJson(filePath);
  expect(validateExpected(expected), `${filePath} failed ${expectedSchemaPath}`, validateExpected.errors);
  const documentsById = docMapById(corpus.documents);
  expect(expected.documentOrder.join(",") === corpus.documents.map((doc) => doc.id).join(","), `${filePath} documentOrder must match slices.json.`);
  for (const document of expected.documents) {
    const source = documentsById.get(document.id);
    expect(source !== undefined, `${filePath} contains unknown document ${document.id}`);
    expect(document.length === source.tokens.length, `${filePath} length mismatch for ${document.id}`);
  }
  expect(expected.tolerance === 1e-12, `${filePath} tolerance must be 1e-12.`);
  if (corpus.phenomena.includes("formula-variant")) {
    expect(
      expected.formulaSet.includes("tfidf.sklearn-smooth-l2"),
      `${filePath} must include the L2-normalized TF-IDF variant.`,
    );
    expect(
      expected.formulaSet.includes("bm25.okapi.k1-1.2.b-0.75"),
      `${filePath} must include the k1=1.2 BM25 variant.`,
    );
    expect(
      expected.documents.some((document) => Array.isArray(document.tfidfVariants) && document.tfidfVariants.length > 1),
      `${filePath} must persist TF-IDF variant outputs.`,
    );
    expect(
      expected.queries.some((query) => Array.isArray(query.bm25Variants) && query.bm25Variants.length > 1),
      `${filePath} must persist BM25 variant outputs.`,
    );
  }
  if (corpus.performanceThresholds !== undefined) {
    const serializedBytes = Buffer.byteLength(JSON.stringify(expected));
    expect(
      serializedBytes <= corpus.performanceThresholds.maxSerializedScoringBytes,
      `${filePath} exceeds maxSerializedScoringBytes.`,
      { serializedBytes, threshold: corpus.performanceThresholds.maxSerializedScoringBytes },
    );
  }
  assertJsonComparable(regenerated, expected, expected.tolerance, filePath);
}
for (const file of expectedFiles) {
  const expected = await readJson(`${expectedDir}/${file}`);
  expect(corporaById.has(expected.corpusId), `${expectedDir}/${file} references unknown corpus ${expected.corpusId}`);
}

const comparisonDir = "fixtures/corpus-tfidf-bm25/comparisons";
const comparisonFiles = (await readdir(comparisonDir)).filter((file) => file.endsWith(".json")).sort();
expect(comparisonFiles.length >= 2, "Corpus TF-IDF/BM25 readiness requires at least two comparator captures.");
const comparisonRuntimes = new Set();
const comparisonCorporaByRuntime = new Map();
for (const file of comparisonFiles) {
  const filePath = `${comparisonDir}/${file}`;
  const comparison = await readJson(filePath);
  expect(validateComparison(comparison), `${filePath} failed ${comparisonSchemaPath}`, validateComparison.errors);
  expect(corpusIds.has(comparison.corpusId), `${filePath} references unknown corpus ${comparison.corpusId}`);
  comparisonRuntimes.add(comparison.comparator.runtime);
  const key = `${comparison.comparator.runtime}:${comparison.corpusId}`;
  comparisonCorporaByRuntime.set(key, (comparisonCorporaByRuntime.get(key) ?? 0) + 1);
}
expect(comparisonRuntimes.has("javascript"), "Comparator captures must include JavaScript output.");
expect(comparisonRuntimes.has("python") || comparisonRuntimes.has("jvm"), "Comparator captures must include Python or JVM output.");
for (const corpus of slices.corpora) {
  if (corpus.performanceThresholds !== undefined) {
    expect(
      comparisonCorporaByRuntime.has(`python:${corpus.id}`) || comparisonCorporaByRuntime.has(`jvm:${corpus.id}`),
      `${corpus.id} must have a Python or JVM comparator capture.`,
    );
  }
}

const supportStatus = await readJson("docs/specs/support-status.v1.json");
const task = supportStatus.tasks.find((entry) => entry.id === "nlp-corpus-tfidf-bm25");
expect(
  task?.status === "readiness-only" || task?.status === "slice-proven",
  "Support status must mark nlp-corpus-tfidf-bm25 as readiness-only or slice-proven.",
);

console.log("Corpus TF-IDF/BM25 readiness artifacts OK.");
