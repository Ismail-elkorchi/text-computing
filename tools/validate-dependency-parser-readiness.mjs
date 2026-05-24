import Ajv from "ajv";
import { access, readFile } from "node:fs/promises";

const ajv = new Ajv({ allErrors: true, strict: true });

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function readText(path) {
  return readFile(path, "utf8");
}

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function expect(condition, message, details) {
  if (condition) return;
  console.error(message);
  if (details !== undefined) console.error(JSON.stringify(details, null, 2));
  process.exit(1);
}

function isIntegerId(id) {
  return /^[1-9][0-9]*$/.test(id);
}

function sentenceIdFromComments(comments, fallback) {
  const sentIdComment = comments.find((line) => line.startsWith("# sent_id = "));
  return sentIdComment?.slice("# sent_id = ".length).trim() || fallback;
}

function parseConlluArcs(text, sourcePath) {
  const blocks = text.trimEnd().split(/\n\n+/);
  const sentences = [];
  for (const [sentenceIndex, block] of blocks.entries()) {
    const comments = [];
    const rows = [];
    for (const [lineIndex, line] of block.split("\n").entries()) {
      if (line.startsWith("#")) {
        comments.push(line);
        continue;
      }
      const fields = line.split("\t");
      expect(fields.length === 10, `${sourcePath}:${lineIndex + 1} must contain 10 CoNLL-U fields.`);
      rows.push({
        id: fields[0],
        head: fields[6],
        relation: fields[7],
      });
    }
    const wordRows = rows.filter((row) => isIntegerId(row.id));
    if (wordRows.length === 0) continue;
    sentences.push({
      sentenceId: sentenceIdFromComments(comments, `${sourcePath}#${sentenceIndex + 1}`),
      tokenOrder: wordRows.map((row) => row.id),
      arcs: wordRows.map((row) => ({
        dependent: row.id,
        head: row.head,
        relation: row.relation,
      })),
      rootCount: wordRows.filter((row) => row.head === "0").length,
    });
  }
  expect(sentences.length === 1, `${sourcePath} must contain exactly one sentence for this readiness gate.`);
  return sentences[0];
}

const slicesSchemaPath = "schemas/dependency-parser-slices-v1.schema.json";
const toolVersionsSchemaPath = "schemas/dependency-parser-tool-versions-v1.schema.json";
const expectedSchemaPath = "schemas/dependency-parser-expected-v1.schema.json";

const validateSlices = ajv.compile(await readJson(slicesSchemaPath));
const validateToolVersions = ajv.compile(await readJson(toolVersionsSchemaPath));
const validateExpected = ajv.compile(await readJson(expectedSchemaPath));

const slicesPath = "fixtures/dependency-parser/slices.json";
const toolVersionsPath = "fixtures/dependency-parser/tool-versions.json";
const slices = await readJson(slicesPath);
const toolVersions = await readJson(toolVersionsPath);

expect(validateSlices(slices), `${slicesPath} failed ${slicesSchemaPath}`, validateSlices.errors);
expect(
  validateToolVersions(toolVersions),
  `${toolVersionsPath} failed ${toolVersionsSchemaPath}`,
  validateToolVersions.errors,
);
expect(slices.expectedOutputStatus === "recorded", "Dependency parser expected arcs must be recorded.");
const requiredPhenomena = new Set([
  "root-arc",
  "subject-arc",
  "object-arc",
  "punctuation-arc",
  "multiword-token",
  "non-english-latin-script",
  "non-latin-script",
  "right-to-left-script",
]);
const seenPhenomena = new Set();
const fixturesById = new Map();
for (const fixture of slices.fixtures) {
  expect(!fixturesById.has(fixture.id), `Duplicate dependency parser fixture id: ${fixture.id}`);
  fixturesById.set(fixture.id, fixture);
  expect(await fileExists(fixture.sourceConlluPath), `${fixture.sourceConlluPath} does not exist.`);
  expect(await fileExists(fixture.expectedPath), `${fixture.expectedPath} does not exist.`);
  for (const phenomenon of fixture.phenomena) seenPhenomena.add(phenomenon);
}
for (const phenomenon of requiredPhenomena) {
  expect(seenPhenomena.has(phenomenon), `Dependency parser readiness is missing ${phenomenon}.`);
}

const negativeControlsById = new Map();
for (const control of slices.negativeControls) {
  expect(!negativeControlsById.has(control.id), `Duplicate dependency parser negative control id: ${control.id}`);
  negativeControlsById.set(control.id, control);
  expect(await fileExists(control.sourceConlluPath), `${control.sourceConlluPath} does not exist.`);
}
for (const expectedFailure of ["invalid-head", "dangling-head", "missing-root", "multiple-roots"]) {
  expect(
    slices.negativeControls.some((control) => control.expectedFailure === expectedFailure),
    `Dependency parser readiness is missing negative control ${expectedFailure}.`,
  );
}

const expectedByFixtureId = new Map();
for (const fixture of slices.fixtures) {
  const expected = await readJson(fixture.expectedPath);
  expectedByFixtureId.set(fixture.id, expected);
  expect(validateExpected(expected), `${fixture.expectedPath} failed ${expectedSchemaPath}`, validateExpected.errors);
  expect(expected.fixtureId === fixture.id, `${fixture.expectedPath} fixtureId must match ${fixture.id}.`);
  expect(
    expected.sourceConlluPath === fixture.sourceConlluPath,
    `${fixture.expectedPath} sourceConlluPath must match ${fixture.sourceConlluPath}.`,
  );
  expect(
    expected.supportBoundary.toLocaleLowerCase("und").includes("frozen"),
    `${fixture.expectedPath} must preserve a frozen-slice support boundary.`,
  );

  const source = parseConlluArcs(await readText(fixture.sourceConlluPath), fixture.sourceConlluPath);
  expect(expected.sentenceId === source.sentenceId, `${fixture.expectedPath} sentenceId mismatch.`);
  expect(
    JSON.stringify(expected.tokenOrder) === JSON.stringify(source.tokenOrder),
    `${fixture.expectedPath} tokenOrder does not match source CoNLL-U rows.`,
  );
  expect(
    JSON.stringify(expected.arcs) === JSON.stringify(source.arcs),
    `${fixture.expectedPath} arcs do not match source CoNLL-U HEAD/DEPREL rows.`,
  );
  expect(expected.rootCount === source.rootCount, `${fixture.expectedPath} rootCount mismatch.`);
  expect(expected.rootCount === 1, `${fixture.expectedPath} must contain exactly one root.`);
}

const readinessDoc = await readText("docs/specs/dependency-parser-readiness.md");
for (const heading of [
  "## Why this document exists",
  "## Status",
  "## Input slices",
  "## Expected-output format",
  "## Documented non-failure differences",
  "## Verification",
]) {
  expect(readinessDoc.includes(heading), `dependency-parser-readiness.md is missing ${heading}`);
}

const differencesDoc = await readText("docs/decisions/dependency-parser-output-differences.md");
expect(
  differencesDoc.includes("## Documented non-failure differences"),
  "dependency-parser-output-differences.md must record non-failure differences.",
);


console.log("Dependency parser readiness artifacts OK.");
