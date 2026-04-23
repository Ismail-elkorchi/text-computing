import Ajv from "ajv";
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
  if (details !== undefined) console.error(JSON.stringify(details, null, 2));
  process.exit(1);
}

function docMapById(documents) {
  return new Map(documents.map((document) => [document.id, document]));
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
]);
const seenPhenomena = new Set();
const corpusIds = new Set();
for (const corpus of slices.corpora) {
  expect(!corpusIds.has(corpus.id), `Duplicate corpus id: ${corpus.id}`);
  corpusIds.add(corpus.id);
  for (const phenomenon of corpus.phenomena) seenPhenomena.add(phenomenon);
  const documentIds = corpus.documents.map((document) => document.id);
  expect(documentIds.join(",") === [...documentIds].sort().join(","), `${corpus.id} documents must be sorted by id.`);
}
for (const phenomenon of requiredPhenomena) {
  expect(seenPhenomena.has(phenomenon), `Corpus TF-IDF/BM25 readiness is missing ${phenomenon}.`);
}

const formulaIds = new Set(toolVersions.formulas.map((formula) => formula.id));
for (const formulaId of [
  "tf.raw-count",
  "df.document-count",
  "tfidf.sklearn-smooth-raw",
  "bm25.okapi.k1-1.5.b-0.75",
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
expect(expectedFiles.length >= corpusIds.size, "Corpus TF-IDF/BM25 readiness requires one expected output per corpus.");
const corporaById = new Map(slices.corpora.map((corpus) => [corpus.id, corpus]));
for (const file of expectedFiles) {
  const filePath = `${expectedDir}/${file}`;
  const expected = await readJson(filePath);
  expect(validateExpected(expected), `${filePath} failed ${expectedSchemaPath}`, validateExpected.errors);
  const corpus = corporaById.get(expected.corpusId);
  expect(corpus !== undefined, `${filePath} references unknown corpus ${expected.corpusId}`);
  const documentsById = docMapById(corpus.documents);
  expect(expected.documentOrder.join(",") === corpus.documents.map((doc) => doc.id).join(","), `${filePath} documentOrder must match slices.json.`);
  for (const document of expected.documents) {
    const source = documentsById.get(document.id);
    expect(source !== undefined, `${filePath} contains unknown document ${document.id}`);
    expect(document.length === source.tokens.length, `${filePath} length mismatch for ${document.id}`);
  }
  expect(expected.tolerance === 1e-12, `${filePath} tolerance must be 1e-12.`);
}

const comparisonDir = "fixtures/corpus-tfidf-bm25/comparisons";
const comparisonFiles = (await readdir(comparisonDir)).filter((file) => file.endsWith(".json")).sort();
expect(comparisonFiles.length >= 2, "Corpus TF-IDF/BM25 readiness requires at least two comparator captures.");
const comparisonRuntimes = new Set();
for (const file of comparisonFiles) {
  const filePath = `${comparisonDir}/${file}`;
  const comparison = await readJson(filePath);
  expect(validateComparison(comparison), `${filePath} failed ${comparisonSchemaPath}`, validateComparison.errors);
  expect(corpusIds.has(comparison.corpusId), `${filePath} references unknown corpus ${comparison.corpusId}`);
  comparisonRuntimes.add(comparison.comparator.runtime);
}
expect(comparisonRuntimes.has("javascript"), "Comparator captures must include JavaScript output.");
expect(comparisonRuntimes.has("python") || comparisonRuntimes.has("jvm"), "Comparator captures must include Python or JVM output.");

const supportStatus = await readJson("docs/specs/support-status.v1.json");
const task = supportStatus.tasks.find((entry) => entry.id === "nlp-corpus-tfidf-bm25");
expect(
  task?.status === "readiness-only" || task?.status === "slice-proven",
  "Support status must mark nlp-corpus-tfidf-bm25 as readiness-only or slice-proven.",
);

console.log("Corpus TF-IDF/BM25 readiness artifacts OK.");
