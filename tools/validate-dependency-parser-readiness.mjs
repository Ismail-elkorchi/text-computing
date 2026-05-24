import Ajv from "ajv";
import { access, readdir, readFile } from "node:fs/promises";

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

function comparableArcs(arcs) {
  return arcs.map((arc) => ({
    dependent: arc.dependent,
    head: arc.head,
    relation: arc.relation,
  }));
}

function compareExpectedArcs(expectedArcs, outputArcs) {
  const actualArcs = comparableArcs(outputArcs);
  if (expectedArcs.length !== actualArcs.length) {
    return {
      matchesExpected: false,
      differences: [
        {
          kind: "tokenization-mismatch",
          expectedTokenCount: expectedArcs.length,
          actualTokenCount: actualArcs.length,
          message: "Comparator token count differs from frozen CoNLL-U integer word rows.",
        },
      ],
    };
  }

  const outputByDependent = new Map(outputArcs.map((arc) => [arc.dependent, arc]));
  const differences = [];
  for (const expected of expectedArcs) {
    const actual = outputByDependent.get(expected.dependent);
    if (actual === undefined) {
      differences.push({
        kind: "missing-dependent",
        dependent: expected.dependent,
        expectedHead: expected.head,
        expectedRelation: expected.relation,
      });
      continue;
    }
    if (actual.head !== expected.head || actual.relation !== expected.relation) {
      differences.push({
        kind: "arc-mismatch",
        dependent: expected.dependent,
        expectedHead: expected.head,
        expectedRelation: expected.relation,
        actualHead: actual.head,
        actualRelation: actual.relation,
        ...(typeof actual.text === "string" ? { actualText: actual.text } : {}),
      });
    }
  }

  return {
    matchesExpected: differences.length === 0,
    differences,
  };
}

const slicesSchemaPath = "schemas/dependency-parser-slices-v1.schema.json";
const toolVersionsSchemaPath = "schemas/dependency-parser-tool-versions-v1.schema.json";
const expectedSchemaPath = "schemas/dependency-parser-expected-v1.schema.json";
const comparisonSchemaPath = "schemas/dependency-parser-comparison-v1.schema.json";

const validateSlices = ajv.compile(await readJson(slicesSchemaPath));
const validateToolVersions = ajv.compile(await readJson(toolVersionsSchemaPath));
const validateExpected = ajv.compile(await readJson(expectedSchemaPath));
const validateComparison = ajv.compile(await readJson(comparisonSchemaPath));

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
expect(
  slices.comparatorStatus === "executed-captures-recorded",
  "Dependency parser comparator status must record executed captures before more parser work.",
);

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

const comparatorRuntimes = new Set(toolVersions.comparators.map((comparator) => comparator.runtime));
expect(
  comparatorRuntimes.has("python"),
  "Dependency parser readiness requires at least one Python comparator capability record.",
);
expect(
  toolVersions.executionPolicy.includes("JavaScript comparator-backed dependency-parser support is not claimed"),
  "Dependency parser readiness must explicitly state that no JavaScript comparator-backed claim is made.",
);

let executedComparatorCount = 0;
const parserModelExecutedFixtures = new Set();
let stanzaExecuted = false;
let directUdValidationExecuted = false;
for (const comparator of toolVersions.comparators) {
  expect(await fileExists(comparator.capturePath), `${comparator.capturePath} does not exist.`);
  const comparison = await readJson(comparator.capturePath);
  expect(
    validateComparison(comparison),
    `${comparator.capturePath} failed ${comparisonSchemaPath}`,
    validateComparison.errors,
  );
  expect(
    comparison.comparator.name === comparator.name,
    `${comparator.capturePath} comparator name must match tool-versions.json.`,
  );
  expect(
    comparison.executionStatus === comparator.executionStatus,
    `${comparator.capturePath} executionStatus must match tool-versions.json.`,
  );
  if (comparison.executionStatus === "executed") {
    executedComparatorCount += 1;
    expect(
      Array.isArray(comparison.dependencies) && comparison.dependencies.length > 0,
      `${comparator.capturePath} must record installed comparator dependencies.`,
    );
    if (comparison.comparator.name === "Stanza DepparseProcessor") stanzaExecuted = true;
    if (comparison.comparator.name === "UniversalDependencies/tools validator") directUdValidationExecuted = true;
  }
  for (const slice of comparison.slices) {
    const fixture = fixturesById.get(slice.fixtureId);
    expect(fixture !== undefined, `${comparator.capturePath} references unknown fixture ${slice.fixtureId}.`);
    expect(
      slice.expectedArcPath === fixture.expectedPath,
      `${comparator.capturePath} expectedArcPath mismatch for ${slice.fixtureId}.`,
    );
    if (comparison.executionStatus === "capability-recorded") {
      expect(slice.status === "output-not-captured", `${comparator.capturePath} must not imply executed output.`);
      expect(slice.reason, `${comparator.capturePath} must explain missing output for ${slice.fixtureId}.`);
    } else {
      const expected = expectedByFixtureId.get(slice.fixtureId);
      expect(expected !== undefined, `${comparator.capturePath} missing expected arcs for ${slice.fixtureId}.`);
      expect(slice.status === "captured", `${comparator.capturePath} must mark ${slice.fixtureId} as captured.`);
      expect(Array.isArray(slice.outputArcs), `${comparator.capturePath} must include outputArcs for ${slice.fixtureId}.`);
      if (comparison.comparator.name !== "UniversalDependencies/tools validator") {
        parserModelExecutedFixtures.add(slice.fixtureId);
      }
      const comparisonResult = compareExpectedArcs(expected.arcs, slice.outputArcs);
      expect(
        slice.matchesExpected === comparisonResult.matchesExpected,
        `${comparator.capturePath} matchesExpected mismatch for ${slice.fixtureId}.`,
        comparisonResult,
      );
      expect(
        JSON.stringify(slice.differences ?? []) === JSON.stringify(comparisonResult.differences),
        `${comparator.capturePath} differences mismatch for ${slice.fixtureId}.`,
        comparisonResult,
      );
    }
  }
}
expect(executedComparatorCount >= 1, "Dependency parser readiness requires at least one executed comparator capture.");
expect(stanzaExecuted, "Dependency parser readiness requires an executed Stanza comparator capture.");
expect(directUdValidationExecuted, "Dependency parser readiness requires direct UD/CoNLL-U validation capture.");
for (const fixtureId of fixturesById.keys()) {
  expect(
    parserModelExecutedFixtures.has(fixtureId),
    `Dependency parser readiness requires at least one executed parser model-output capture for ${fixtureId}.`,
  );
}

const comparisonDir = "fixtures/dependency-parser/comparisons";
const comparisonFiles = (await readdir(comparisonDir)).filter((file) => file.endsWith(".json")).sort();
expect(comparisonFiles.length >= 3, "Dependency parser readiness requires executed comparator capture files.");

const readinessDoc = await readText("docs/specs/dependency-parser-readiness.md");
for (const heading of [
  "## Why this document exists",
  "## Status",
  "## Input slices",
  "## Expected-output format",
  "## Comparator freeze",
  "## Comparator outputs",
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
