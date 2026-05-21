import Ajv from "ajv";
import { readFile, readdir, writeFile } from "node:fs/promises";
import {
  analyzePosMorphLemma,
  createTextRulesLexiconResource,
  isTextRulesLexiconResourceData,
} from "../packages/textrules/src/index.ts";
import { resolveTextPackResources } from "../packages/textpack/src/index.ts";

const INPUT_ARG_INDEX = process.argv.indexOf("--input");
const WRITE_ARG_INDEX = process.argv.indexOf("--write");
const INPUT_PATH = INPUT_ARG_INDEX === -1 ? "fixtures/pos-morph-lemma/corpus/ud-style-slice-corpus.v1.json" : process.argv[INPUT_ARG_INDEX + 1];
const WRITE_PATH = WRITE_ARG_INDEX === -1 ? undefined : process.argv[WRITE_ARG_INDEX + 1];

if (!INPUT_PATH) fail("Missing --input path.");
if (WRITE_ARG_INDEX !== -1 && !WRITE_PATH) fail("Missing --write path.");

const ajv = new Ajv({ allErrors: true, strict: true });

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function fail(message, details) {
  console.error(message);
  if (details !== undefined) console.error(JSON.stringify(details, null, 2));
  process.exit(1);
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value).sort(([left], [right]) => left.localeCompare(right));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function materializeSource(source) {
  if (source.kind === "text") return source.text;
  throw new Error(`Unsupported POS/morph/lemma corpus source kind: ${source.kind}`);
}

function findLayer(document, id) {
  return document.layers.find((layer) => layer.id === id);
}

function annotationForToken(document, layerId, tokenId) {
  return findLayer(document, layerId)?.annotations.find((annotation) =>
    annotation.targets?.some((target) => target.kind === "annotation" && target.annotationId === tokenId),
  );
}

function values(annotation) {
  return new Set((annotation?.alternatives ?? []).map((alternative) => alternative.value));
}

function featureKey(feature) {
  return `${feature.name}=${feature.value}`;
}

function morphologyAlternatives(annotation) {
  return (annotation?.alternatives ?? []).map((alternative) => new Set((alternative.features ?? []).map(featureKey)));
}

function morphologySatisfied(actualAlternatives, requiredAlternative) {
  if (requiredAlternative.length === 0) return true;
  const required = new Set(requiredAlternative.map(featureKey));
  return actualAlternatives.some((actual) => [...required].every((feature) => actual.has(feature)));
}

const [corpusSchema, reportSchema, slices, textpackManifestSchema] = await Promise.all([
  readJson("schemas/pos-morph-lemma-corpus-evaluation-v1.schema.json"),
  readJson("schemas/pos-morph-lemma-corpus-evaluation-report-v1.schema.json"),
  readJson("fixtures/pos-morph-lemma/slices.json"),
  readJson("schemas/textpack-manifest-v1.schema.json"),
]);
const validateCorpus = ajv.compile(corpusSchema);
const validateReport = ajv.compile(reportSchema);
const validateTextPackManifest = ajv.compile(textpackManifestSchema);
const corpus = await readJson(INPUT_PATH);
if (!validateCorpus(corpus)) fail(`${INPUT_PATH} failed schemas/pos-morph-lemma-corpus-evaluation-v1.schema.json`, validateCorpus.errors);

const manifestDir = "fixtures/pos-morph-lemma/manifests";
const manifestFiles = (await readdir(manifestDir)).filter((file) => file.endsWith(".json")).sort();
const manifests = [];
for (const file of manifestFiles) {
  const path = `${manifestDir}/${file}`;
  const manifest = await readJson(path);
  if (!validateTextPackManifest(manifest)) fail(`${path} failed schemas/textpack-manifest-v1.schema.json`, validateTextPackManifest.errors);
  manifests.push(manifest);
}

async function loadLexiconResources(languageHint) {
  const requestedLanguages = languageHint.split("+").map((entry) => entry.trim()).filter(Boolean);
  const resolvedResources = [];
  for (const language of requestedLanguages) {
    resolvedResources.push(...resolveTextPackResources(manifests, { kind: "lexicon", language }).resources);
  }
  const uniqueResources = [];
  const seen = new Set();
  for (const resource of resolvedResources) {
    const key = `${resource.packId}:${resource.resourceId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    uniqueResources.push(resource);
  }
  const lexicons = [];
  for (const resource of uniqueResources) {
    const data = await readJson(resource.path);
    if (!isTextRulesLexiconResourceData(data)) fail(`${resource.path} is not a textrules lexicon resource.`);
    lexicons.push(createTextRulesLexiconResource(resource, data));
  }
  return lexicons;
}

const slicesById = new Map(slices.slices.map((slice) => [slice.id, slice]));
const documentResults = [];
let tokenCount = 0;
let passedTokens = 0;
let failedTokens = 0;
let ambiguousGoldTokens = 0;

for (const documentSpec of corpus.documents) {
  const slice = slicesById.get(documentSpec.sourceSliceId);
  if (!slice) fail(`${INPUT_PATH} references unknown slice ${documentSpec.sourceSliceId}.`);
  const expectedRef = `fixtures/pos-morph-lemma/expected/${slice.id}.json`;
  if (documentSpec.expectedOutputRef !== expectedRef) fail(`${documentSpec.id} expectedOutputRef must be ${expectedRef}.`);
  const expected = await readJson(expectedRef);
  const resources = await loadLexiconResources(slice.languageHint);
  const result = analyzePosMorphLemma(
    {
      documentId: `pos-morph-lemma:${slice.id}`,
      text: materializeSource(slice.source),
      sourceId: slice.id,
      sourceSha256: expected.source.sha256,
      languageHint: slice.languageHint,
      phenomena: slice.phenomena,
    },
    resources,
  );
  const tokenLayer = findLayer(result.document, "tokens");
  if (!tokenLayer) fail(`${documentSpec.id} generated document has no token layer.`);

  let documentPassed = 0;
  let documentFailed = 0;
  for (const goldToken of documentSpec.goldTokens) {
    tokenCount += 1;
    if (goldToken.acceptedUpos.length > 1 || goldToken.acceptedLemmas.length > 1 || (goldToken.requiredMorphologyAlternatives ?? []).length > 1) {
      ambiguousGoldTokens += 1;
    }
    const token = tokenLayer.annotations.find((annotation) => annotation.id === goldToken.tokenId);
    const pos = annotationForToken(result.document, "pos", goldToken.tokenId);
    const lemma = annotationForToken(result.document, "lemmas", goldToken.tokenId);
    const morphology = annotationForToken(result.document, "morphology", goldToken.tokenId);
    const posValues = values(pos);
    const lemmaValues = values(lemma);
    const actualMorphology = morphologyAlternatives(morphology);
    const tokenMatches =
      token?.text === goldToken.text &&
      goldToken.acceptedUpos.some((upos) => posValues.has(upos)) &&
      goldToken.acceptedLemmas.some((lemmaValue) => lemmaValues.has(lemmaValue)) &&
      (goldToken.requiredMorphologyAlternatives ?? []).every((requiredAlternative) => morphologySatisfied(actualMorphology, requiredAlternative));
    if (tokenMatches) {
      documentPassed += 1;
      passedTokens += 1;
    } else {
      documentFailed += 1;
      failedTokens += 1;
    }
  }
  documentResults.push({
    id: documentSpec.id,
    sourceSliceId: documentSpec.sourceSliceId,
    language: documentSpec.language,
    splitRole: documentSpec.splitRole,
    tokens: documentSpec.goldTokens.length,
    passedTokens: documentPassed,
    failedTokens: documentFailed,
    diagnostics: [...new Set(result.diagnostics.map((diagnostic) => diagnostic.code))].sort(),
  });
}

const report = {
  schemaVersion: 1,
  taskId: "nlp-pos-morph-lemma",
  evaluationId: corpus.evaluationId,
  generatedAt: "2026-05-20T00:00:00.000Z",
  inputRef: INPUT_PATH,
  summary: {
    documents: corpus.documents.length,
    tokens: tokenCount,
    passedTokens,
    failedTokens,
    ambiguousGoldTokens,
  },
  documents: documentResults,
  limitations: corpus.limitations,
};
if (!validateReport(report)) fail("Generated report failed schemas/pos-morph-lemma-corpus-evaluation-report-v1.schema.json", validateReport.errors);
if (failedTokens !== 0) fail("POS/morph/lemma corpus evaluation has failing token rows.", report.summary);

const serialized = `${JSON.stringify(report, null, 2)}\n`;
if (WRITE_PATH) await writeFile(WRITE_PATH, serialized);
else process.stdout.write(serialized);
