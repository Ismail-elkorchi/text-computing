import Ajv from "ajv";
import { readdir, readFile } from "node:fs/promises";
import {
  exportTextDocDocumentV1ToConllu,
  importConlluToTextDocDocumentV1,
  isTextDocDocumentV1,
  TextDocConlluError,
  textDocConlluRoundTripPayloadKind,
} from "../packages/textdoc/src/index.ts";

const ajv = new Ajv({ allErrors: true, strict: false });

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

function sentenceIdFromComments(comments, fallback) {
  const sentIdComment = comments.find((line) => line.startsWith("# sent_id = "));
  return sentIdComment?.slice("# sent_id = ".length).trim() || fallback;
}

function isIntegerId(id) {
  return /^[1-9][0-9]*$/.test(id);
}

function parseConllu(text, sourcePath) {
  const sentenceBlocks = text.trimEnd().split(/\n\n+/);
  const sentences = [];
  for (const [sentenceIndex, block] of sentenceBlocks.entries()) {
    const comments = [];
    const rows = [];
    for (const [lineIndex, line] of block.split("\n").entries()) {
      if (line.startsWith("#")) {
        comments.push(line);
        continue;
      }
      const fields = line.split("\t");
      if (fields.length !== 10) {
        throw new Error(`field-count: ${sourcePath}:${lineIndex + 1}`);
      }
      rows.push({
        id: fields[0],
        form: fields[1],
        lemma: fields[2],
        upos: fields[3],
        xpos: fields[4],
        feats: fields[5],
        head: fields[6],
        deprel: fields[7],
        deps: fields[8],
        misc: fields[9],
      });
    }
    if (rows.length === 0) continue;

    const wordRows = rows.filter((row) => isIntegerId(row.id));
    const tokenIds = new Set(wordRows.map((row) => row.id));
    let rootCount = 0;
    for (const row of wordRows) {
      if (!/^[0-9]+$/.test(row.head)) {
        throw new Error(`head-format: ${sourcePath}:${row.id}`);
      }
      if (row.head === "0") {
        rootCount += 1;
      } else if (!tokenIds.has(row.head)) {
        throw new Error(`dangling-head: ${sourcePath}:${row.id}->${row.head}`);
      }
      if (row.deprel === "_" || row.deprel.length === 0) {
        throw new Error(`deprel-missing: ${sourcePath}:${row.id}`);
      }
    }
    if (rootCount !== 1) {
      throw new Error(`root-count: ${sourcePath}:${rootCount}`);
    }

    sentences.push({
      id: sentenceIdFromComments(comments, `${sourcePath}#${sentenceIndex + 1}`),
      rows,
      wordRows,
    });
  }
  expect(sentences.length > 0, `${sourcePath} must contain at least one sentence`);
  return sentences;
}

function dependencyTargetsFromSentences(sentences) {
  const dependencies = [];
  for (const sentence of sentences) {
    for (const row of sentence.wordRows) {
      dependencies.push({
        id: `dep-${sentence.id}-${row.id}`,
        dependentTokenId: `${sentence.id}:token-${row.id}`,
        headTokenId: row.head === "0" ? null : `${sentence.id}:token-${row.head}`,
        relation: row.deprel,
        source: {
          sentenceId: sentence.id,
          conlluId: row.id,
          conlluHead: row.head,
          conlluDeprel: row.deprel,
        },
      });
    }
  }
  dependencies.sort((left, right) => {
    const leftKey = `${left.source.sentenceId}\u0000${left.source.conlluId.padStart(8, "0")}\u0000${left.source.conlluHead.padStart(8, "0")}\u0000${left.relation}`;
    const rightKey = `${right.source.sentenceId}\u0000${right.source.conlluId.padStart(8, "0")}\u0000${right.source.conlluHead.padStart(8, "0")}\u0000${right.relation}`;
    return leftKey.localeCompare(rightKey);
  });
  return {
    schemaVersion: 1,
    scope: "textdoc-dependency-target",
    targetUnit: "token",
    sourceFormat: "conllu",
    dependencies,
    notes: [
      "Readiness-only dependency target synthesized from CoNLL-U fixture rows."
    ],
  };
}

const slicesSchemaPath = "schemas/conllu-dependency-slices-v1.schema.json";
const toolVersionsSchemaPath = "schemas/conllu-dependency-tool-versions-v1.schema.json";
const dependencyTargetSchemaPath = "schemas/textdoc-dependency-target-v1.schema.json";
const expectedSchemaPath = "schemas/conllu-dependency-roundtrip-expected-v1.schema.json";
const validatorCaptureSchemaPath = "schemas/conllu-validator-capture-v1.schema.json";
const textdocSchemaPath = "schemas/textdoc-document-v1.schema.json";
const resultEnvelopeSchemaPath = "schemas/textprotocol-result-envelope-v1.schema.json";
const conformanceReportSchemaPath = "schemas/textconformance-report-v1.schema.json";

const validateSlices = ajv.compile(await readJson(slicesSchemaPath));
const validateToolVersions = ajv.compile(await readJson(toolVersionsSchemaPath));
const validateDependencyTarget = ajv.compile(await readJson(dependencyTargetSchemaPath));
const validateExpected = ajv.compile(await readJson(expectedSchemaPath));
const validateValidatorCapture = ajv.compile(await readJson(validatorCaptureSchemaPath));
const validateTextdoc = ajv.compile(await readJson(textdocSchemaPath));
const validateResultEnvelope = ajv.compile(await readJson(resultEnvelopeSchemaPath));
const validateConformanceReport = ajv.compile(await readJson(conformanceReportSchemaPath));

const slicesPath = "fixtures/conllu-dependency/slices.json";
const toolVersionsPath = "fixtures/conllu-dependency/tool-versions.json";
const slices = await readJson(slicesPath);
const toolVersions = await readJson(toolVersionsPath);
const textdocPackage = await readJson("packages/textdoc/package.json");

expect(validateSlices(slices), `${slicesPath} failed ${slicesSchemaPath}`, validateSlices.errors);
expect(
  validateToolVersions(toolVersions),
  `${toolVersionsPath} failed ${toolVersionsSchemaPath}`,
  validateToolVersions.errors,
);
expect(slices.supportStatus === "slice-proven", "CoNLL-U round-trip support status must be slice-proven.");
expect(slices.expectedRoundTripStatus === "recorded", "CoNLL-U round-trip requires recorded expected outputs.");

const externalFixtureExpectations = new Map();
for (const fixture of slices.fixtures.valid) {
  externalFixtureExpectations.set(fixture.id, {
    path: fixture.path,
    language: fixture.language,
    expectedStatus: "pass",
  });
}
for (const fixture of slices.fixtures.invalid) {
  externalFixtureExpectations.set(fixture.id, {
    path: fixture.path,
    language: fixture.language ?? "en",
    expectedStatus: "fail",
  });
}

const validationDir = "fixtures/conllu-dependency/validation";
const validationFiles = (await readdir(validationDir)).filter((file) => file.endsWith(".json")).sort();
expect(validationFiles.length >= 1, "CoNLL-U readiness requires at least one external validator capture.");

let executedValidatorCaptureCount = 0;
for (const file of validationFiles) {
  const path = `${validationDir}/${file}`;
  const capture = await readJson(path);
  expect(validateValidatorCapture(capture), `${path} failed ${validatorCaptureSchemaPath}`, validateValidatorCapture.errors);
  const validator = toolVersions.validators.find(
    (entry) => entry.name === capture.validator.name && entry.commit === capture.validator.commit,
  );
  expect(validator !== undefined, `${path} validator is not listed in tool-versions.json.`);
  expect(validator?.executionStatus === "executed", `${path} must correspond to an executed validator.`);
  expect(validator?.capturePath === path, `${path} must match capturePath in tool-versions.json.`);
  executedValidatorCaptureCount += 1;

  const seenExternalFixtureIds = new Set();
  for (const result of capture.fixtures) {
    const expected = externalFixtureExpectations.get(result.fixtureId);
    expect(expected !== undefined, `${path} references unknown fixture ${result.fixtureId}.`);
    expect(!seenExternalFixtureIds.has(result.fixtureId), `${path} duplicates fixture ${result.fixtureId}.`);
    seenExternalFixtureIds.add(result.fixtureId);
    expect(result.path === expected.path, `${path} fixture ${result.fixtureId} path mismatch.`);
    expect(result.language === expected.language, `${path} fixture ${result.fixtureId} language mismatch.`);
    expect(result.expectedStatus === expected.expectedStatus, `${path} fixture ${result.fixtureId} expectedStatus mismatch.`);
    if (result.expectedStatus === "pass") {
      expect(result.exitCode === 0, `${path} fixture ${result.fixtureId} must pass external validation.`);
      expect(result.status === "passed-as-expected", `${path} fixture ${result.fixtureId} status mismatch.`);
    } else {
      expect(result.exitCode > 0, `${path} fixture ${result.fixtureId} must fail external validation.`);
      expect(result.status === "failed-as-expected", `${path} fixture ${result.fixtureId} status mismatch.`);
    }
  }
  for (const fixtureId of externalFixtureExpectations.keys()) {
    expect(seenExternalFixtureIds.has(fixtureId), `${path} is missing fixture ${fixtureId}.`);
  }
}

expect(
  executedValidatorCaptureCount >= 1,
  "CoNLL-U readiness requires at least one executed external validator capture.",
);

function countLayer(document, kind) {
  return document.layers.find((layer) => layer.kind === kind)?.annotations.length ?? 0;
}

const seenFixtureIds = new Set();
const seenPhenomena = new Set();
for (const fixture of slices.fixtures.valid) {
  expect(!seenFixtureIds.has(fixture.id), `Duplicate CoNLL-U fixture id: ${fixture.id}`);
  seenFixtureIds.add(fixture.id);
  for (const phenomenon of fixture.phenomena) seenPhenomena.add(phenomenon);

  const text = await readText(fixture.path);
  const sentences = parseConllu(text, fixture.path);
  const dependencyTarget = dependencyTargetsFromSentences(sentences);
  expect(
    validateDependencyTarget(dependencyTarget),
    `${fixture.path} synthesized dependency target failed ${dependencyTargetSchemaPath}`,
    validateDependencyTarget.errors,
  );

  const expected = await readJson(fixture.expectedPath);
  expect(validateExpected(expected), `${fixture.expectedPath} failed ${expectedSchemaPath}`, validateExpected.errors);
  expect(expected.fixtureId === fixture.id, `${fixture.expectedPath} fixtureId must match ${fixture.id}.`);
  expect(expected.sourcePath === fixture.path, `${fixture.expectedPath} sourcePath must match ${fixture.path}.`);

  const document = importConlluToTextDocDocumentV1(text, {
    documentId: expected.documentId,
    sourceId: fixture.id,
  });
  expect(isTextDocDocumentV1(document), `${fixture.path} did not import to TextDocDocumentV1.`);
  expect(validateTextdoc(document), `${fixture.path} imported document failed ${textdocSchemaPath}`, validateTextdoc.errors);
  expect(countLayer(document, "sentence") === expected.expectedCounts.sentences, `${fixture.path} sentence count mismatch.`);
  expect(countLayer(document, "token") === expected.expectedCounts.tokens, `${fixture.path} token count mismatch.`);
  expect(
    countLayer(document, "dependency-node") === expected.expectedCounts.dependencyNodes,
    `${fixture.path} dependency-node count mismatch.`,
  );
  expect(
    countLayer(document, "dependency") === expected.expectedCounts.dependencies,
    `${fixture.path} dependency count mismatch.`,
  );

  const exported = exportTextDocDocumentV1ToConllu(document);
  expect(exported === expected.exportedConllu, `${fixture.path} exported CoNLL-U does not match expected output.`);
  expect(exported === text.trimEnd(), `${fixture.path} exported CoNLL-U must preserve the frozen fixture text.`);

  const resultEnvelope = {
    schemaId: "urn:ismail-elkorchi:textprotocol:result-envelope:v1",
    schemaVersion: 1,
    producer: {
      package: textdocPackage.name,
      version: textdocPackage.version,
    },
    payloadKind: textDocConlluRoundTripPayloadKind,
    payload: {
      document,
      exportedConllu: exported,
    },
    provenance: {
      source: {
        id: fixture.path,
      },
      references: [
        {
          kind: "schema",
          id: textdocSchemaPath,
        },
        {
          kind: "fixture",
          id: fixture.expectedPath,
        },
      ],
    },
  };
  expect(
    validateResultEnvelope(resultEnvelope),
    `${fixture.path} round-trip result failed ${resultEnvelopeSchemaPath}`,
    validateResultEnvelope.errors,
  );

  const conformanceReport = {
    schemaId: "urn:ismail-elkorchi:textconformance:report:v1",
    schemaVersion: 1,
    reportId: `conllu-roundtrip:${fixture.id}`,
    subject: {
      kind: "textprotocol-result-envelope",
      id: expected.documentId,
      schemaId: resultEnvelope.schemaId,
    },
    generatedAt: "2026-05-11T00:00:00.000Z",
    summary: {
      pass: 4,
      fail: 0,
      notRun: 0,
    },
    checks: [
      {
        checkId: "imported-document-valid",
        status: "pass",
        evidenceRefs: [fixture.path, textdocSchemaPath],
      },
      {
        checkId: "export-preserves-fixture",
        status: "pass",
        evidenceRefs: [fixture.path, fixture.expectedPath],
      },
      {
        checkId: "result-envelope-valid",
        status: "pass",
        evidenceRefs: [resultEnvelopeSchemaPath],
      },
      {
        checkId: "no-parser-claim",
        status: "pass",
        evidenceRefs: ["docs/specs/conllu-dependency-readiness.md"],
      },
    ],
  };
  expect(
    validateConformanceReport(conformanceReport),
    `${fixture.path} round-trip conformance report failed ${conformanceReportSchemaPath}`,
    validateConformanceReport.errors,
  );
}

for (const phenomenon of [
  "basic-dependency-tree",
  "root-arc",
  "punctuation-arc",
  "multiword-token",
  "morphological-features",
  "non-english-latin-script",
]) {
  expect(seenPhenomena.has(phenomenon), `CoNLL-U readiness is missing phenomenon coverage for ${phenomenon}.`);
}

for (const fixture of slices.fixtures.invalid) {
  expect(!seenFixtureIds.has(fixture.id), `Duplicate CoNLL-U fixture id: ${fixture.id}`);
  seenFixtureIds.add(fixture.id);
  const text = await readText(fixture.path);
  let failed = false;
  try {
    importConlluToTextDocDocumentV1(text, {
      documentId: `conllu-dependency:${fixture.id}`,
      sourceId: fixture.id,
    });
  } catch (error) {
    failed = true;
    expect(
      error instanceof TextDocConlluError && error.code === fixture.mustFail,
      `${fixture.path} failed for unexpected reason: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  expect(failed, `${fixture.path} must fail with ${fixture.mustFail}`);
}

const futureRuntimes = new Set(toolVersions.futureComparators.map((entry) => entry.runtime));
expect(futureRuntimes.has("javascript"), "CoNLL-U readiness must name a future JavaScript comparator role.");
expect(
  futureRuntimes.has("python") || futureRuntimes.has("jvm"),
  "CoNLL-U readiness must name a future Python or JVM comparator role.",
);

const readinessDoc = await readText("docs/specs/conllu-dependency-readiness.md");
for (const heading of [
  "## Why this document exists",
  "## Readiness boundary",
  "## Fixture policy",
  "## Dependency-target contract",
  "## Round-trip evidence plan",
  "## Verification",
]) {
  expect(readinessDoc.includes(heading), `conllu-dependency-readiness.md is missing ${heading}`);
}

const researchLedger = await readText("docs/specs/nlp-conllu-dependency-research-ledger.md");
for (const heading of [
  "## Scope",
  "## Primary public sources",
  "## Comparator and validator evidence",
  "## Legacy-debt constraints",
  "## Readiness consequences",
]) {
  expect(researchLedger.includes(heading), `nlp-conllu-dependency-research-ledger.md is missing ${heading}`);
}

const targetContract = await readText("docs/specs/textdoc-dependency-target-contract.md");
for (const heading of [
  "## Contract boundary",
  "## Target model",
  "## CoNLL-U mapping",
  "## Non-goals",
]) {
  expect(targetContract.includes(heading), `textdoc-dependency-target-contract.md is missing ${heading}`);
}

const supportStatus = await readJson("docs/specs/support-status.v1.json");
const task = supportStatus.tasks.find((entry) => entry.id === "nlp-conllu-dependency-roundtrip");
expect(task?.status === "slice-proven", "Support status must mark nlp-conllu-dependency-roundtrip as slice-proven.");

console.log("CoNLL-U dependency round-trip artifacts OK.");
