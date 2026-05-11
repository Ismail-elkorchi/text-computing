import Ajv from "ajv";
import { readFile } from "node:fs/promises";

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

const validateSlices = ajv.compile(await readJson(slicesSchemaPath));
const validateToolVersions = ajv.compile(await readJson(toolVersionsSchemaPath));
const validateDependencyTarget = ajv.compile(await readJson(dependencyTargetSchemaPath));

const slicesPath = "fixtures/conllu-dependency/slices.json";
const toolVersionsPath = "fixtures/conllu-dependency/tool-versions.json";
const slices = await readJson(slicesPath);
const toolVersions = await readJson(toolVersionsPath);

expect(validateSlices(slices), `${slicesPath} failed ${slicesSchemaPath}`, validateSlices.errors);
expect(
  validateToolVersions(toolVersions),
  `${toolVersionsPath} failed ${toolVersionsSchemaPath}`,
  validateToolVersions.errors,
);
expect(slices.readinessStatus === "readiness-only", "CoNLL-U readiness status must remain readiness-only.");
expect(slices.expectedRoundTripStatus === "planned", "CoNLL-U readiness cannot claim recorded round-trip outputs yet.");

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
    parseConllu(text, fixture.path);
  } catch (error) {
    failed = true;
    expect(
      error instanceof Error && error.message.includes(fixture.mustFail),
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
const task = supportStatus.tasks.find((entry) => entry.id === "nlp-conllu-dependency-readiness");
expect(task?.status === "readiness-only", "Support status must mark nlp-conllu-dependency-readiness as readiness-only.");

console.log("CoNLL-U dependency readiness artifacts OK.");
