import Ajv from "ajv";
import { readFile } from "node:fs/promises";
import {
  buildTextCorpusRetrievalIndex,
  createTextCorpusCollection,
  isTextCorpusRetrievalIndexV1,
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
      targets: [{ kind: "span", startCU, endCU }],
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
      { id: "source-view", kind: "source" },
      { id: "analysis-view", kind: "analysis", derivedFrom: ["source-view"] },
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
const validateExpected = ajv.compile(expectedSchema);
const retrievalSlices = await readJson("fixtures/retrieval/slices.json");
const corpusSlices = await readJson("fixtures/corpus-tfidf-bm25/slices.json");
const expected = await readJson(retrievalSlices.expectedPath);
expect(validateExpected(expected), `${retrievalSlices.expectedPath} failed retrieval expected schema`, validateExpected.errors);

const corpus = corpusSlices.corpora.find((entry) => entry.id === expected.corpusId);
expect(corpus !== undefined, `missing corpus ${expected.corpusId}`);

const collection = createTextCorpusCollection(corpus.documents.map(entryFromSlice), {
  corpusId: expected.corpusId,
});
const index = buildTextCorpusRetrievalIndex(collection);
expect(isTextCorpusRetrievalIndexV1(index), "retrieval index failed runtime guard.");

const queries = expected.queries.map((query) => parseTextCorpusQuery(query.raw, { id: query.id }));
const result = searchTextCorpusRetrievalIndex(index, queries, { topK: 3, snippetWindow: 1 });
expect(isTextCorpusRetrievalResultV1(result), "retrieval result failed runtime guard.");

const actual = comparableResult(result);
expect(actual.queries.length === expected.queries.length, "retrieval query count mismatch.");
for (const expectedQuery of expected.queries) {
  const actualQuery = actual.queries.find((entry) => entry.id === expectedQuery.id);
  expect(actualQuery !== undefined, `missing retrieval query ${expectedQuery.id}`);
  expect(JSON.stringify(actualQuery.tokens) === JSON.stringify(expectedQuery.tokens), `${expectedQuery.id} token mismatch.`);
  expect(actualQuery.hits.length === expectedQuery.hits.length, `${expectedQuery.id} hit count mismatch.`);
  for (const expectedHit of expectedQuery.hits) {
    const actualHit = actualQuery.hits.find((entry) => entry.docId === expectedHit.docId);
    expect(actualHit !== undefined, `${expectedQuery.id} missing hit ${expectedHit.docId}`);
    assertNear(actualHit.score, expectedHit.score, expected.tolerance, `${expectedQuery.id} ${expectedHit.docId} score`);
    expect(JSON.stringify(actualHit.snippet) === JSON.stringify(expectedHit.snippet), `${expectedQuery.id} ${expectedHit.docId} snippet mismatch.`);
    expect(actualHit.explain.length === expectedHit.explain.length, `${expectedQuery.id} ${expectedHit.docId} explain count mismatch.`);
    for (const expectedTerm of expectedHit.explain) {
      const actualTerm = actualHit.explain.find((entry) => entry.term === expectedTerm.term);
      expect(actualTerm !== undefined, `${expectedQuery.id} ${expectedHit.docId} missing explain term ${expectedTerm.term}`);
      expect(actualTerm.tf === expectedTerm.tf, `${expectedQuery.id} ${expectedTerm.term} tf mismatch.`);
      expect(actualTerm.df === expectedTerm.df, `${expectedQuery.id} ${expectedTerm.term} df mismatch.`);
      assertNear(actualTerm.idf, expectedTerm.idf, expected.tolerance, `${expectedQuery.id} ${expectedTerm.term} idf`);
      assertNear(actualTerm.contribution, expectedTerm.contribution, expected.tolerance, `${expectedQuery.id} ${expectedTerm.term} contribution`);
    }
  }
}

const repeated = searchTextCorpusRetrievalIndex(index, queries, { topK: 3, snippetWindow: 1 });
expect(JSON.stringify(result) === JSON.stringify(repeated), "retrieval output must be deterministic.");

const supportStatus = await readJson("docs/specs/support-status.v1.json");
const task = supportStatus.tasks.find((entry) => entry.id === "nlp-retrieval");
expect(task?.status === "slice-proven", "Support status must mark nlp-retrieval as slice-proven.");

console.log(`Retrieval feature artifacts OK (queries=${expected.queries.length}).`);
