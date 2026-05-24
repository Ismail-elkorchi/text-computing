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
  if (details !== undefined) {
    console.error(JSON.stringify(details, null, 2));
  }
  process.exit(1);
}

const slicesSchemaPath = "schemas/pos-morph-lemma-slices-v1.schema.json";
const toolVersionsSchemaPath = "schemas/pos-morph-lemma-tool-versions-v1.schema.json";
const expectedSchemaPath = "schemas/pos-morph-lemma-expected-v1.schema.json";
const corpusEvaluationSchemaPath = "schemas/pos-morph-lemma-corpus-evaluation-v1.schema.json";
const corpusEvaluationReportSchemaPath = "schemas/pos-morph-lemma-corpus-evaluation-report-v1.schema.json";
const textdocSchemaPath = "schemas/textdoc-document-v1.schema.json";

const slicesSchema = await readJson(slicesSchemaPath);
const toolVersionsSchema = await readJson(toolVersionsSchemaPath);
const expectedSchema = await readJson(expectedSchemaPath);
const corpusEvaluationSchema = await readJson(corpusEvaluationSchemaPath);
const corpusEvaluationReportSchema = await readJson(corpusEvaluationReportSchemaPath);
const textdocSchema = await readJson(textdocSchemaPath);

const validateSlices = ajv.compile(slicesSchema);
const validateToolVersions = ajv.compile(toolVersionsSchema);
const validateCorpusEvaluation = ajv.compile(corpusEvaluationSchema);
const validateCorpusEvaluationReport = ajv.compile(corpusEvaluationReportSchema);
ajv.addSchema(textdocSchema, textdocSchema.$id);
ajv.compile(expectedSchema);

const slicesPath = "fixtures/pos-morph-lemma/slices.json";
const toolVersionsPath = "fixtures/pos-morph-lemma/tool-versions.json";
const corpusEvaluationPath = "fixtures/pos-morph-lemma/corpus/ud-style-slice-corpus.v1.json";
const corpusEvaluationReportPath = "fixtures/pos-morph-lemma/corpus/ud-style-slice-report.v1.json";

const slices = await readJson(slicesPath);
const toolVersions = await readJson(toolVersionsPath);
const corpusEvaluation = await readJson(corpusEvaluationPath);
const corpusEvaluationReport = await readJson(corpusEvaluationReportPath);

expect(validateSlices(slices), `${slicesPath} failed ${slicesSchemaPath}`, validateSlices.errors);
expect(
  validateToolVersions(toolVersions),
  `${toolVersionsPath} failed ${toolVersionsSchemaPath}`,
  validateToolVersions.errors,
);
expect(
  validateCorpusEvaluation(corpusEvaluation),
  `${corpusEvaluationPath} failed ${corpusEvaluationSchemaPath}`,
  validateCorpusEvaluation.errors,
);
expect(
  validateCorpusEvaluationReport(corpusEvaluationReport),
  `${corpusEvaluationReportPath} failed ${corpusEvaluationReportSchemaPath}`,
  validateCorpusEvaluationReport.errors,
);

const requiredPhenomena = new Set([
  "unknown-word",
  "multiword-token",
  "clitic",
  "historical-spelling",
  "code-switching",
  "rich-morphology",
]);
const seenPhenomena = new Set();
const sliceIds = new Set();
const corpusEvaluationSplitRoles = new Set();
const corpusEvaluationSliceIds = new Set();
for (const slice of slices.slices) {
  expect(!sliceIds.has(slice.id), `Duplicate POS/morph/lemma slice id ${slice.id}.`);
  sliceIds.add(slice.id);
  for (const phenomenon of slice.phenomena) {
    seenPhenomena.add(phenomenon);
  }
}
for (const document of corpusEvaluation.documents) {
  corpusEvaluationSplitRoles.add(document.splitRole);
  corpusEvaluationSliceIds.add(document.sourceSliceId);
  expect(sliceIds.has(document.sourceSliceId), `${corpusEvaluationPath} references unknown slice ${document.sourceSliceId}.`);
}
for (const phenomenon of requiredPhenomena) {
  expect(
    seenPhenomena.has(phenomenon),
    `POS/morph/lemma readiness is missing required phenomenon coverage for ${phenomenon}.`,
  );
}
for (const splitRole of ["development", "validation", "holdout"]) {
  expect(
    corpusEvaluationSplitRoles.has(splitRole),
    `POS/morph/lemma corpus evaluation is missing split role ${splitRole}.`,
  );
}
for (const requiredSliceId of [
  "en-unknown-word",
  "es-multiword-token",
  "fr-clitic-historical",
  "code-switch-en-fr",
  "fi-rich-morphology",
]) {
  expect(
    corpusEvaluationSliceIds.has(requiredSliceId),
    `POS/morph/lemma corpus evaluation is missing slice ${requiredSliceId}.`,
  );
}
expect(
  corpusEvaluationReport.inputRef === corpusEvaluationPath,
  "POS/morph/lemma corpus evaluation report must point to the corpus input.",
);
expect(
  corpusEvaluationReport.summary.documents === corpusEvaluation.documents.length,
  "POS/morph/lemma corpus evaluation report document count must match input.",
);
expect(
  corpusEvaluationReport.summary.failedTokens === 0,
  "POS/morph/lemma corpus evaluation report must have zero failing tokens.",
);
expect(
  corpusEvaluationReport.summary.ambiguousGoldTokens > 0,
  "POS/morph/lemma corpus evaluation must preserve at least one ambiguous gold token.",
);

expect(
  toolVersions.notes.some((note) => note.includes("target tag and morphology contract")),
  "POS/morph/lemma readiness must describe the target tag and morphology contract.",
);

const readinessDoc = await readText("docs/specs/pos-morph-lemma-readiness.md");

expect(
  readinessDoc.includes("## Tag mapping policy"),
  "POS/morph/lemma readiness doc must define a tag mapping policy section.",
);
expect(
  readinessDoc.includes("## Expected-output format"),
  "POS/morph/lemma readiness doc must define an expected-output format section.",
);

console.log("POS/morph/lemma readiness artifacts OK.");
