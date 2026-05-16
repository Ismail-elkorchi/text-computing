import Ajv from "ajv";
import { readdir, readFile } from "node:fs/promises";
import {
  analyzeCoreference,
  createCoreferenceConformanceReport,
  createCoreferenceResultEnvelope,
} from "../packages/textrules/src/index.ts";
import { isTextConformanceReportV1 } from "../packages/textconformance/src/index.ts";
import { isTextDocDocumentV1 } from "../packages/textdoc/src/index.ts";
import { isTextProtocolResultEnvelopeV1 } from "../packages/textprotocol/src/index.ts";

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

const slicesSchemaPath = "schemas/coreference-slices-v1.schema.json";
const expectedSchemaPath = "schemas/coreference-expected-v1.schema.json";
const conformanceSchemaPath = "schemas/textconformance-report-v1.schema.json";
const slicesPath = "fixtures/coreference/slices.json";
const reportPath = "fixtures/reports/nlp-coreference/conformance-report.json";

const [slicesSchema, expectedSchema, conformanceSchema, slices, report] = await Promise.all([
  readJson(slicesSchemaPath),
  readJson(expectedSchemaPath),
  readJson(conformanceSchemaPath),
  readJson(slicesPath),
  readJson(reportPath),
]);

const validateSlices = ajv.compile(slicesSchema);
const validateExpected = ajv.compile(expectedSchema);
const validateReport = ajv.compile(conformanceSchema);

expect(validateSlices(slices), `${slicesPath} failed ${slicesSchemaPath}`, validateSlices.errors);
expect(validateReport(report), `${reportPath} failed ${conformanceSchemaPath}`, validateReport.errors);

expect(slices.supportStatus === "slice-proven", "Coreference support status must be slice-proven.");
expect(slices.expectedOutputStatus === "recorded", "Coreference feature gate requires recorded expected outputs.");
expect(slices.comparatorStatus === "capability-recorded", "Coreference readiness must not claim executed comparator captures yet.");

const requiredMentionKinds = ["proper", "nominal", "pronoun", "singleton"];
expect(
  requiredMentionKinds.every((kind) => slices.chainPolicy.mentionKinds.includes(kind)),
  "Coreference chain policy is missing a required mention kind.",
);

const requiredPhenomena = new Set([
  "proper-mention",
  "nominal-mention",
  "pronoun-link",
  "singleton-control",
  "ambiguous-pronoun",
  "split-antecedent-control",
  "non-english-latin-script",
  "non-latin-script",
  "right-to-left-script",
]);
const seenPhenomena = new Set();
const fixtureIds = new Set();
const fixturesById = new Map();
for (const fixture of slices.fixtures) {
  expect(!fixtureIds.has(fixture.id), `Duplicate coreference fixture id: ${fixture.id}`);
  fixtureIds.add(fixture.id);
  fixturesById.set(fixture.id, fixture);
  for (const phenomenon of fixture.phenomena) seenPhenomena.add(phenomenon);
}
for (const phenomenon of requiredPhenomena) {
  expect(seenPhenomena.has(phenomenon), `Coreference readiness is missing ${phenomenon}.`);
}

const negativeFailures = new Set(slices.negativeControls.map((entry) => entry.expectedFailure));
for (const required of ["ambiguous-antecedent", "split-antecedent-unsupported"]) {
  expect(negativeFailures.has(required), `Coreference negative controls are missing ${required}.`);
}

function mentionSpan(mention) {
  const target = mention.targets?.[0];
  expect(target?.kind === "span", `bad coreference mention target for ${mention.id}`);
  return {
    startCU: target.startCU,
    endCU: target.endCU,
    text: mention.text,
  };
}

function projectCoreference(document) {
  const mentionLayer = document.layers.find((layer) => layer.id === "coreference-mentions");
  const chainLayer = document.layers.find((layer) => layer.id === "coreference-chains");
  expect(mentionLayer !== undefined, "coreference output must contain coreference-mentions layer.");
  expect(chainLayer !== undefined, "coreference output must contain coreference-chains layer.");
  const mentionIds = new Set(mentionLayer.annotations.map((mention) => mention.id));
  return {
    mentions: mentionLayer.annotations.map((mention) => ({
      id: mention.id,
      kind: mention.mentionType,
      target: mentionSpan(mention),
    })),
    chains: chainLayer.annotations.map((chain) => {
      for (const mentionId of chain.mentionIds) {
        expect(mentionIds.has(mentionId), `${chain.id} references missing mention ${mentionId}`);
      }
      return {
        id: chain.id,
        mentionIds: chain.mentionIds,
        ...(chain.notes && chain.notes.length > 0 ? { diagnostics: chain.notes } : {}),
      };
    }),
  };
}

const expectedDir = "fixtures/coreference/expected";
const expectedFiles = (await readdir(expectedDir)).filter((file) => file.endsWith(".json")).sort();
const expectedSliceIds = new Set();
for (const file of expectedFiles) {
  const dataPath = `${expectedDir}/${file}`;
  const expected = await readJson(dataPath);
  expect(validateExpected(expected), `${dataPath} failed ${expectedSchemaPath}`, validateExpected.errors);
  const fixture = fixturesById.get(expected.sliceId);
  expect(fixture !== undefined, `${dataPath} references unknown fixture ${expected.sliceId}`);
  expectedSliceIds.add(expected.sliceId);

  const result = analyzeCoreference({
    documentId: `coreference:${expected.sliceId}`,
    text: fixture.source.text,
    sourceId: expected.sliceId,
    languageHint: fixture.language,
  });
  expect(isTextDocDocumentV1(result.document), `${expected.sliceId} output failed textdoc runtime guard.`);
  expect(
    JSON.stringify(projectCoreference(result.document)) ===
      JSON.stringify({ mentions: expected.mentions, chains: expected.chains }),
    `${expected.sliceId} generated coreference output does not match expected output.`,
  );
  const envelope = createCoreferenceResultEnvelope(result, {
    producerVersion: "0.0.0",
    referenceId: expected.sliceId,
  });
  expect(isTextProtocolResultEnvelopeV1(envelope), `${expected.sliceId} envelope failed runtime guard.`);
  const conformance = createCoreferenceConformanceReport(envelope, {
    expectedArtifactPath: dataPath,
    matchesExpected: true,
  });
  expect(isTextConformanceReportV1(conformance), `${expected.sliceId} conformance report failed runtime guard.`);
}

for (const fixtureId of fixtureIds) {
  expect(expectedSliceIds.has(fixtureId), `Coreference expected outputs are missing ${fixtureId}.`);
}

const unsupported = analyzeCoreference({
  documentId: "coreference:unsupported-control",
  text: "The archive opened at noon.",
  sourceId: "unsupported-control",
  languageHint: "en",
});
expect(
  unsupported.diagnostics.some((diagnostic) => diagnostic.code === "unsupported-coreference-pattern"),
  "Unsupported coreference input must emit an explicit diagnostic.",
);

const ambiguousFixture = fixturesById.get("en-ambiguous");
expect(ambiguousFixture !== undefined, "Coreference fixtures are missing en-ambiguous.");
const ambiguous = analyzeCoreference({
  documentId: "coreference:ambiguous-control",
  text: ambiguousFixture.source.text,
  sourceId: "en-ambiguous",
  languageHint: ambiguousFixture.language,
});
expect(
  ambiguous.diagnostics.some((diagnostic) => diagnostic.code === "ambiguous-antecedent"),
  "Ambiguous coreference input must emit an explicit ambiguity diagnostic.",
);

const readinessDoc = await readText("docs/specs/coreference-readiness.md");
for (const heading of [
  "## Why this document exists",
  "## Target representation",
  "## Mention and chain policy",
  "## Ambiguity and loss policy",
  "## Allowed fixture policy",
  "## Input slices",
  "## Comparator and corpus freeze",
  "## Expected-output format",
  "## Verification",
]) {
  expect(readinessDoc.includes(heading), `coreference-readiness.md missing heading: ${heading}`);
}

const researchLedger = await readText("docs/specs/nlp-coreference-research-ledger.md");
for (const heading of [
  "## Scope",
  "## Primary sources",
  "## Comparator capability evidence",
  "## Comparator limitations",
  "## Readiness consequences",
]) {
  expect(researchLedger.includes(heading), `nlp-coreference-research-ledger.md missing heading: ${heading}`);
}

const supportStatus = await readJson("docs/specs/support-status.v1.json");
const task = supportStatus.tasks.find((entry) => entry.id === "nlp-coreference");
expect(task?.status === "slice-proven", "Support status must mark nlp-coreference as slice-proven.");

console.log(`Coreference feature artifacts OK (fixtures=${slices.fixtures.length}).`);
