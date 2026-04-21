import Ajv from "ajv";
import { createHash } from "node:crypto";
import { access, readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  analyzePosMorphLemma,
  createPosMorphLemmaConformanceReport,
  createPosMorphLemmaResultEnvelope,
  createTextRulesLexiconResource,
  isTextRulesLexiconResourceData,
} from "../packages/textrules/src/index.ts";
import { resolveTextPackResources } from "../packages/textpack/src/index.ts";

const ajv = new Ajv({ allErrors: true, strict: true });

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value).sort(([left], [right]) => left.localeCompare(right));
    return `{${entries
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function sourceSha256(source) {
  return createHash("sha256").update(stableStringify(source), "utf8").digest("hex");
}

function materializeSource(source) {
  if (source.kind === "text") return source.text;
  throw new Error(`Unsupported POS/morph/lemma source kind: ${source.kind}`);
}

function findLayer(document, id) {
  return document.layers.find((layer) => layer.id === id);
}

function findAnnotation(layer, id) {
  return layer?.annotations.find((annotation) => annotation.id === id);
}

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

const textdocSchema = await readJson("schemas/textdoc-document-v1.schema.json");
ajv.addSchema(textdocSchema, "textdoc-document-v1.schema.json");

const expectedSchema = await readJson("schemas/pos-morph-lemma-expected-v1.schema.json");
const validateExpected = ajv.compile(expectedSchema);
const validateTextdoc = ajv.compile(textdocSchema);
const validateResultEnvelope = ajv.compile(
  await readJson("schemas/textprotocol-result-envelope-v1.schema.json"),
);
const validateConformanceReport = ajv.compile(
  await readJson("schemas/textconformance-report-v1.schema.json"),
);
const validateTextPackManifest = ajv.compile(await readJson("schemas/textpack-manifest-v1.schema.json"));

const slices = await readJson("fixtures/pos-morph-lemma/slices.json");
const expectedDir = "fixtures/pos-morph-lemma/expected";
const manifestDir = "fixtures/pos-morph-lemma/manifests";
const manifestFiles = (await readdir(manifestDir)).filter((file) => file.endsWith(".json")).sort();

if (manifestFiles.length === 0) {
  console.error("POS/morph/lemma feature validation requires at least one textpack manifest.");
  process.exit(1);
}

const manifests = [];
for (const file of manifestFiles) {
  const path = `${manifestDir}/${file}`;
  const manifest = await readJson(path);
  if (!validateTextPackManifest(manifest)) {
    console.error(`${path} failed schemas/textpack-manifest-v1.schema.json`);
    console.error(JSON.stringify(validateTextPackManifest.errors, null, 2));
    process.exit(1);
  }

  for (const resource of manifest.resources) {
    if (!(await fileExists(resource.path))) {
      console.error(`${path} references missing resource path ${resource.path}`);
      process.exit(1);
    }
  }

  manifests.push(manifest);
}

const expectedFiles = (await readdir(expectedDir)).filter((file) => file.endsWith(".json")).sort();
if (slices.expectedOutputStatus !== "recorded") {
  console.error("POS/morph/lemma feature validation requires expectedOutputStatus to be recorded.");
  process.exit(1);
}

if (expectedFiles.length !== slices.slices.length) {
  console.error(
    `POS/morph/lemma expected outputs must cover all slices: ${expectedFiles.length} files for ${slices.slices.length} slices.`,
  );
  process.exit(1);
}

for (const slice of slices.slices) {
  const expectedPath = `${expectedDir}/${slice.id}.json`;
  const expected = await readJson(expectedPath);
  if (!validateExpected(expected)) {
    console.error(`${expectedPath} failed schemas/pos-morph-lemma-expected-v1.schema.json`);
    console.error(JSON.stringify(validateExpected.errors, null, 2));
    process.exit(1);
  }
  if (!validateTextdoc(expected.document)) {
    console.error(`${expectedPath} contains an invalid textdoc document.`);
    console.error(JSON.stringify(validateTextdoc.errors, null, 2));
    process.exit(1);
  }

  const expectedHash = sourceSha256(slice.source);
  if (expected.source.sliceId !== slice.id) {
    console.error(`${expectedPath} source.sliceId does not match slice id ${slice.id}`);
    process.exit(1);
  }
  if (expected.source.sha256 !== expectedHash) {
    console.error(`${expectedPath} source hash ${expected.source.sha256} does not match ${expectedHash}`);
    process.exit(1);
  }

  const requestedLanguages = slice.languageHint.split("+").map((entry) => entry.trim()).filter(Boolean);
  const resolvedResources = [];
  for (const language of requestedLanguages) {
    const resolved = resolveTextPackResources(manifests, {
      kind: "lexicon",
      language,
    });
    resolvedResources.push(...resolved.resources);
  }

  const uniqueResolvedResources = [];
  const seenResolvedResourceIds = new Set();
  for (const resource of resolvedResources) {
    const key = `${resource.packId}:${resource.resourceId}`;
    if (seenResolvedResourceIds.has(key)) continue;
    seenResolvedResourceIds.add(key);
    uniqueResolvedResources.push(resource);
  }

  if (uniqueResolvedResources.length === 0) {
    console.error(`No lexicon resources resolved for slice ${slice.id}`);
    process.exit(1);
  }

  const lexiconResources = [];
  for (const resource of uniqueResolvedResources) {
    const resourceData = await readJson(resource.path);
    if (!isTextRulesLexiconResourceData(resourceData)) {
      console.error(`${resource.path} does not satisfy the textrules lexicon resource data shape`);
      process.exit(1);
    }
    lexiconResources.push(createTextRulesLexiconResource(resource, resourceData));
  }

  const result = analyzePosMorphLemma(
    {
      documentId: `pos-morph-lemma:${slice.id}`,
      text: materializeSource(slice.source),
      sourceId: slice.id,
      sourceSha256: expectedHash,
      languageHint: slice.languageHint,
      phenomena: slice.phenomena,
    },
    lexiconResources,
  );

  if (stableStringify(result.document) !== stableStringify(expected.document)) {
    console.error(`${expectedPath} does not match generated textrules output`);
    process.exit(1);
  }

  const tokenLayer = findLayer(result.document, "tokens");
  const posLayer = findLayer(result.document, "pos");
  const lemmaLayer = findLayer(result.document, "lemmas");
  const morphologyLayer = findLayer(result.document, "morphology");
  if (!tokenLayer || !posLayer || !lemmaLayer || !morphologyLayer) {
    console.error(`${expectedPath} is missing a required analysis layer`);
    process.exit(1);
  }

  const tokenIds = new Set(tokenLayer.annotations.map((annotation) => annotation.id));
  for (const layer of [posLayer, lemmaLayer, morphologyLayer]) {
    for (const annotation of layer.annotations) {
      const target = annotation.targets[0];
      if (!target || target.kind !== "annotation" || !tokenIds.has(target.annotationId)) {
        console.error(`${expectedPath} contains a dangling annotation target in layer ${layer.id}`);
        process.exit(1);
      }
    }
  }

  if (slice.phenomena.includes("unknown-word")) {
    if (!result.diagnostics.some((diagnostic) => diagnostic.code === "unknown-word")) {
      console.error(`${expectedPath} must emit an unknown-word diagnostic`);
      process.exit(1);
    }
  }
  if (slice.phenomena.includes("multiword-token")) {
    if (!result.diagnostics.some((diagnostic) => diagnostic.code === "multiword-token")) {
      console.error(`${expectedPath} must emit a multiword-token diagnostic`);
      process.exit(1);
    }
  }
  if (slice.phenomena.includes("clitic")) {
    if (!result.diagnostics.some((diagnostic) => diagnostic.code === "clitic-token")) {
      console.error(`${expectedPath} must emit a clitic-token diagnostic`);
      process.exit(1);
    }
  }
  if (slice.phenomena.includes("historical-spelling")) {
    if (!result.diagnostics.some((diagnostic) => diagnostic.code === "historical-spelling")) {
      console.error(`${expectedPath} must emit a historical-spelling diagnostic`);
      process.exit(1);
    }
  }
  if (slice.phenomena.includes("code-switching")) {
    if (!result.diagnostics.some((diagnostic) => diagnostic.code === "code-switching-slice")) {
      console.error(`${expectedPath} must emit a code-switching-slice diagnostic`);
      process.exit(1);
    }
  }

  if (slice.id === "en-unknown-word") {
    if ((findAnnotation(posLayer, "token-2:pos")?.alternatives?.length ?? 0) < 2) {
      console.error(`${expectedPath} must preserve ambiguity for the unknown token florped`);
      process.exit(1);
    }
  }

  if (slice.id === "es-multiword-token") {
    if ((findAnnotation(posLayer, "token-1:pos")?.alternatives?.length ?? 0) < 2) {
      console.error(`${expectedPath} must preserve contraction ambiguity for Del`);
      process.exit(1);
    }
    if ((findAnnotation(posLayer, "token-3:pos")?.alternatives?.length ?? 0) < 2) {
      console.error(`${expectedPath} must preserve POS ambiguity for vino`);
      process.exit(1);
    }
  }

  if (slice.id === "fr-clitic-historical") {
    if ((findAnnotation(lemmaLayer, "token-2:lemma")?.alternatives?.length ?? 0) < 2) {
      console.error(`${expectedPath} must preserve historical lemma ambiguity for hoste`);
      process.exit(1);
    }
    if ((findAnnotation(lemmaLayer, "token-4:lemma")?.alternatives?.length ?? 0) < 2) {
      console.error(`${expectedPath} must preserve historical lemma ambiguity for escrist`);
      process.exit(1);
    }
  }

  if (slice.id === "code-switch-en-fr") {
    if ((findAnnotation(posLayer, "token-3:pos")?.alternatives?.length ?? 0) < 2) {
      console.error(`${expectedPath} must preserve ambiguity for signs in the code-switch slice`);
      process.exit(1);
    }
  }

  const envelope = createPosMorphLemmaResultEnvelope(result, {
    producerVersion: "0.0.0",
    referenceId: slice.id,
  });
  if (!validateResultEnvelope(envelope)) {
    console.error(`${expectedPath} cannot be wrapped by the textprotocol result envelope schema`);
    console.error(JSON.stringify(validateResultEnvelope.errors, null, 2));
    process.exit(1);
  }

  const report = createPosMorphLemmaConformanceReport(envelope, {
    expectedArtifactPath: expectedPath,
    matchesExpected: true,
  });
  if (!validateConformanceReport(report)) {
    console.error(`${expectedPath} cannot be referenced by the textconformance report schema`);
    console.error(JSON.stringify(validateConformanceReport.errors, null, 2));
    process.exit(1);
  }
}
