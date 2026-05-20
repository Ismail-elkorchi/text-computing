import Ajv from "ajv";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import {
  buildTextCorpusRetrievalIndex,
  createTextCorpusCollection,
  evaluateTextCorpusRetrieval,
  isTextCorpusRetrievalIndexV1,
  isTextCorpusRetrievalQrelsV1,
  isTextCorpusRetrievalResultV1,
  parseTextCorpusQuery,
  searchTextCorpusRetrievalIndex,
} from "../packages/textcorpus/src/index.ts";

const ajv = new Ajv({ allErrors: true, strict: false });

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function expect(condition, message, details) {
  if (condition) return;
  console.error(message);
  if (details !== undefined) console.error(JSON.stringify(details, null, 2));
  process.exit(1);
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
    revision: "retrieval-v1",
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
    document: createDocument(`doc:retrieval:${document.id}`, document.tokens.join(" "), document.tokens),
    viewId: "analysis-view",
    tokenLayerId: "tokens",
    metadata: document.metadata,
  };
}

function assertNear(actual, expected, tolerance, message) {
  expect(
    typeof actual === "number" && Math.abs(actual - expected) <= tolerance,
    `${message}: expected ${expected}, got ${actual}`,
  );
}

function comparableResult(result) {
  return {
    schemaVersion: result.schemaVersion,
    taskId: "nlp-retrieval",
    corpusId: result.corpusId,
    formula: result.formula,
    tolerance: 1e-12,
    queries: result.results.map((queryResult) => ({
      id: queryResult.query.id,
      raw: queryResult.query.raw,
      tokens: queryResult.query.tokens,
      hits: queryResult.hits.map((hit) => ({
        docId: hit.docId,
        score: hit.score,
        snippet: hit.snippet,
        explain: hit.explain,
      })),
    })),
  };
}

const expectedSchema = await readJson("schemas/retrieval-expected-v1.schema.json");
const qrelsSchema = await readJson("schemas/retrieval-qrels-v1.schema.json");
const evaluationSchema = await readJson("schemas/retrieval-evaluation-v1.schema.json");
const validateExpected = ajv.compile(expectedSchema);
const validateQrels = ajv.compile(qrelsSchema);
const validateEvaluation = ajv.compile(evaluationSchema);
const retrievalSlices = await readJson("fixtures/retrieval/slices.json");
const corpusSlices = await readJson("fixtures/corpus-tfidf-bm25/slices.json");
const expectedPaths = retrievalSlices.expectedPaths ?? [retrievalSlices.expectedPath];
expect(
  Array.isArray(expectedPaths) && expectedPaths.length >= 1,
  "retrieval slices must declare one or more expected paths.",
);
const allCorpora = [...corpusSlices.corpora, ...(retrievalSlices.fieldedCorpora ?? [])];
const qrelsSets = retrievalSlices.qrelsSets ?? [
  {
    id: "legacy-qrels-set",
    expectedPath: retrievalSlices.qrelsExpectedPath,
    qrelsPath: retrievalSlices.qrelsPath,
    evaluationPath: retrievalSlices.evaluationPath,
  },
];
const qrelsSetByExpectedPath = new Map(qrelsSets.map((entry) => [entry.expectedPath, entry]));
let expectedQueryCount = 0;
let evaluatedQueryCount = 0;
let thresholdCheckedCount = 0;

for (const corpus of retrievalSlices.fieldedCorpora ?? []) {
  if (corpus.license !== undefined || corpus.provenance !== undefined || corpus.contentHash !== undefined) {
    expect(corpus.license === "MIT", `${corpus.id} must declare the repository fixture license as MIT.`);
    expect(typeof corpus.provenance === "string" && corpus.provenance.length > 0, `${corpus.id} must declare provenance.`);
    expect(
      corpus.contentHash === `sha256:${sha256Json(corpus.documents)}`,
      `${corpus.id} contentHash must match its document list.`,
      { actual: corpus.contentHash, expected: `sha256:${sha256Json(corpus.documents)}` },
    );
    for (const document of corpus.documents) {
      expect(
        document.metadata?.license === corpus.license,
        `${corpus.id}/${document.id} must carry matching license metadata.`,
      );
    }
  }
}

function buildOptions(expected) {
  if (expected.formula === "bm25f.k1-1.2.b-0.75.fielded") {
    return {
      formula: expected.formula,
      fields: expected.fieldSpecs,
    };
  }
  return {
    formula: expected.formula,
  };
}

function assertExplanation(actualTerm, expectedTerm, tolerance, label) {
  expect(actualTerm !== undefined, `${label} missing explain term ${expectedTerm.term}`);
  expect(actualTerm.field === expectedTerm.field, `${label} ${expectedTerm.term} field mismatch.`);
  assertNear(actualTerm.tf, expectedTerm.tf, tolerance, `${label} ${expectedTerm.term} tf`);
  expect(actualTerm.df === expectedTerm.df, `${label} ${expectedTerm.term} df mismatch.`);
  assertNear(actualTerm.idf, expectedTerm.idf, tolerance, `${label} ${expectedTerm.term} idf`);
  assertNear(actualTerm.contribution, expectedTerm.contribution, tolerance, `${label} ${expectedTerm.term} contribution`);
  const actualContributions = actualTerm.fieldContributions ?? [];
  const expectedContributions = expectedTerm.fieldContributions ?? [];
  expect(
    actualContributions.length === expectedContributions.length,
    `${label} ${expectedTerm.term} field contribution count mismatch.`,
  );
  for (const expectedContribution of expectedContributions) {
    const actualContribution = actualContributions.find((entry) => entry.field === expectedContribution.field);
    expect(actualContribution !== undefined, `${label} missing field contribution ${expectedContribution.field}.`);
    assertNear(actualContribution.tf, expectedContribution.tf, tolerance, `${label} ${expectedContribution.field} tf`);
    expect(actualContribution.length === expectedContribution.length, `${label} ${expectedContribution.field} length mismatch.`);
    assertNear(
      actualContribution.averageLength,
      expectedContribution.averageLength,
      tolerance,
      `${label} ${expectedContribution.field} average length`,
    );
    assertNear(actualContribution.weight, expectedContribution.weight, tolerance, `${label} ${expectedContribution.field} weight`);
    assertNear(
      actualContribution.normalizedTf,
      expectedContribution.normalizedTf,
      tolerance,
      `${label} ${expectedContribution.field} normalized tf`,
    );
  }
}

function assertMetricObject(actual, expected, tolerance, label) {
  for (const key of ["precisionAtK", "recallAtK", "mrr", "ndcgAtK"]) {
    if (expected[key] !== undefined) {
      assertNear(actual[key], expected[key], tolerance, `${label} ${key}`);
    }
  }
}

function assertEvaluation(actual, expected, tolerance, label) {
  expect(actual.schemaVersion === expected.schemaVersion, `${label} evaluation schema version mismatch.`);
  expect(actual.taskId === expected.taskId, `${label} evaluation task id mismatch.`);
  expect(actual.corpusId === expected.corpusId, `${label} evaluation corpus id mismatch.`);
  expect(actual.formula === expected.formula, `${label} evaluation formula mismatch.`);
  expect(actual.k === expected.k, `${label} evaluation k mismatch.`);
  expect(
    actual.relevantGradeThreshold === expected.relevantGradeThreshold,
    `${label} evaluation relevant grade threshold mismatch.`,
  );
  assertNear(actual.tolerance, expected.tolerance, tolerance, `${label} evaluation tolerance`);
  assertMetricObject(actual.summary, expected.summary, tolerance, `${label} summary`);
  expect(actual.queries.length === expected.queries.length, `${label} evaluation query count mismatch.`);
  for (const expectedQuery of expected.queries) {
    const actualQuery = actual.queries.find((entry) => entry.queryId === expectedQuery.queryId);
    expect(actualQuery !== undefined, `${label} missing evaluation query ${expectedQuery.queryId}`);
    expect(
      JSON.stringify(actualQuery.retrieved) === JSON.stringify(expectedQuery.retrieved),
      `${label} ${expectedQuery.queryId} retrieved docs mismatch.`,
    );
    expect(
      JSON.stringify(actualQuery.relevant) === JSON.stringify(expectedQuery.relevant),
      `${label} ${expectedQuery.queryId} relevant docs mismatch.`,
    );
    assertMetricObject(actualQuery, expectedQuery, tolerance, `${label} ${expectedQuery.queryId}`);
    assertNear(
      actualQuery.reciprocalRank,
      expectedQuery.reciprocalRank,
      tolerance,
      `${label} ${expectedQuery.queryId} reciprocalRank`,
    );
  }
}

for (const expectedPath of expectedPaths) {
  const expected = await readJson(expectedPath);
  expect(validateExpected(expected), `${expectedPath} failed retrieval expected schema`, validateExpected.errors);

  const corpus = allCorpora.find((entry) => entry.id === expected.corpusId);
  expect(corpus !== undefined, `missing corpus ${expected.corpusId}`);

  const collection = createTextCorpusCollection(corpus.documents.map(entryFromSlice), {
    corpusId: expected.corpusId,
  });
  const index = buildTextCorpusRetrievalIndex(collection, buildOptions(expected));
  expect(isTextCorpusRetrievalIndexV1(index), `${expectedPath} retrieval index failed runtime guard.`);

  const serializedIndex = JSON.stringify(index, null, 2);
  expect(
    JSON.stringify(JSON.parse(serializedIndex)) === JSON.stringify(index),
    `${expectedPath} retrieval index JSON persistence round-trip failed.`,
  );

  const queries = expected.queries.map((query) => parseTextCorpusQuery(query.raw, { id: query.id }));
  const result = searchTextCorpusRetrievalIndex(index, queries, { topK: 3, snippetWindow: 1 });
  expect(isTextCorpusRetrievalResultV1(result), `${expectedPath} retrieval result failed runtime guard.`);

  const actual = comparableResult(result);
  expect(actual.formula === expected.formula, `${expectedPath} formula mismatch.`);
  expect(actual.queries.length === expected.queries.length, `${expectedPath} retrieval query count mismatch.`);
  expectedQueryCount += expected.queries.length;
  for (const expectedQuery of expected.queries) {
    const actualQuery = actual.queries.find((entry) => entry.id === expectedQuery.id);
    expect(actualQuery !== undefined, `${expectedPath} missing retrieval query ${expectedQuery.id}`);
    expect(JSON.stringify(actualQuery.tokens) === JSON.stringify(expectedQuery.tokens), `${expectedQuery.id} token mismatch.`);
    expect(actualQuery.hits.length === expectedQuery.hits.length, `${expectedQuery.id} hit count mismatch.`);
    for (const expectedHit of expectedQuery.hits) {
      const actualHit = actualQuery.hits.find((entry) => entry.docId === expectedHit.docId);
      expect(actualHit !== undefined, `${expectedQuery.id} missing hit ${expectedHit.docId}`);
      assertNear(actualHit.score, expectedHit.score, expected.tolerance, `${expectedQuery.id} ${expectedHit.docId} score`);
      expect(JSON.stringify(actualHit.snippet) === JSON.stringify(expectedHit.snippet), `${expectedQuery.id} ${expectedHit.docId} snippet mismatch.`);
      expect(actualHit.explain.length === expectedHit.explain.length, `${expectedQuery.id} ${expectedHit.docId} explain count mismatch.`);
      for (const expectedTerm of expectedHit.explain) {
        const actualTerm = actualHit.explain.find(
          (entry) => entry.term === expectedTerm.term && entry.field === expectedTerm.field,
        );
        assertExplanation(actualTerm, expectedTerm, expected.tolerance, `${expectedQuery.id} ${expectedHit.docId}`);
      }
    }
  }

  for (const judgment of expected.relevanceJudgments ?? []) {
    const actualQuery = actual.queries.find((entry) => entry.id === judgment.queryId);
    expect(actualQuery !== undefined, `${expectedPath} relevance query ${judgment.queryId} is missing.`);
    const positiveDocIds = judgment.ratings
      .filter((rating) => rating.grade > 0)
      .map((rating) => rating.docId)
      .sort();
    const actualDocIds = actualQuery.hits.map((hit) => hit.docId).sort();
    expect(
      positiveDocIds.every((docId) => actualDocIds.includes(docId)),
      `${expectedPath} relevance positives are absent from hits for ${judgment.queryId}.`,
      { positiveDocIds, actualDocIds },
    );
  }

  const qrelsSet = qrelsSetByExpectedPath.get(expectedPath);
  if (qrelsSet !== undefined) {
    const qrels = await readJson(qrelsSet.qrelsPath);
    const expectedEvaluation = await readJson(qrelsSet.evaluationPath);
    expect(validateQrels(qrels), `${qrelsSet.qrelsPath} failed retrieval qrels schema`, validateQrels.errors);
    expect(isTextCorpusRetrievalQrelsV1(qrels), `${qrelsSet.qrelsPath} failed retrieval qrels runtime guard.`);
    expect(
      JSON.stringify(qrels.judgments) === JSON.stringify(expected.relevanceJudgments),
      `${qrelsSet.qrelsPath} must match relevance judgments embedded in ${expectedPath}.`,
    );
    expect(
      validateEvaluation(expectedEvaluation),
      `${qrelsSet.evaluationPath} failed retrieval evaluation schema`,
      validateEvaluation.errors,
    );
    const evaluation = evaluateTextCorpusRetrieval(result, qrels, {
      k: expectedEvaluation.k,
      relevantGradeThreshold: expectedEvaluation.relevantGradeThreshold,
      tolerance: expectedEvaluation.tolerance,
    });
    assertEvaluation(evaluation, expectedEvaluation, expectedEvaluation.tolerance, qrelsSet.evaluationPath);
    evaluatedQueryCount += evaluation.queries.length;
    const threshold = corpus.thresholds;
    if (threshold !== undefined) {
      const tokenCount = corpus.documents.reduce((sum, document) => sum + document.tokens.length, 0);
      const serializedIndexBytes = Buffer.byteLength(serializedIndex, "utf8");
      expect(corpus.documents.length >= threshold.minDocuments, `${corpus.id} document threshold failed.`);
      expect(tokenCount >= threshold.minTokens, `${corpus.id} token threshold failed.`);
      expect(expected.queries.length >= threshold.minQueries, `${corpus.id} query threshold failed.`);
      expect(
        serializedIndexBytes <= threshold.maxSerializedIndexBytes,
        `${corpus.id} serialized index threshold failed.`,
        { serializedIndexBytes, threshold: threshold.maxSerializedIndexBytes },
      );
      thresholdCheckedCount += 1;
    }
  }

  const repeated = searchTextCorpusRetrievalIndex(index, queries, { topK: 3, snippetWindow: 1 });
  expect(JSON.stringify(result) === JSON.stringify(repeated), `${expectedPath} retrieval output must be deterministic.`);
}

const supportStatus = await readJson("docs/specs/support-status.v1.json");
const task = supportStatus.tasks.find((entry) => entry.id === "nlp-retrieval");
expect(task?.status === "slice-proven", "Support status must mark nlp-retrieval as slice-proven.");

console.log(
  `Retrieval feature artifacts OK (expectedFiles=${expectedPaths.length} queries=${expectedQueryCount} evaluatedQueries=${evaluatedQueryCount} thresholdSets=${thresholdCheckedCount}).`,
);
