import Ajv from "ajv";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const ARTIFACT_PATH = "fixtures/package-release/downstream-api-stability.v1.json";
const SCHEMA_PATH = "schemas/downstream-api-stability-v1.schema.json";
const RELEASE_GATES_PATH = "fixtures/package-release/gates.v1.json";

function fail(message, details) {
  console.error(message);
  if (details !== undefined) console.error(JSON.stringify(details, null, 2));
  process.exit(1);
}

function expect(condition, message, details) {
  if (!condition) fail(message, details);
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(ROOT, relativePath), "utf8"));
}

async function readText(relativePath) {
  return readFile(path.join(ROOT, relativePath), "utf8");
}

async function fileExists(relativePath) {
  try {
    await access(path.join(ROOT, relativePath));
    return true;
  } catch {
    return false;
  }
}

function assertRepoRef(ref, label) {
  expect(!path.isAbsolute(ref), `${label} must be repository-relative: ${ref}`);
  expect(!ref.includes(".."), `${label} must not traverse outside the repository: ${ref}`);
  expect(!ref.includes("\\"), `${label} must use forward slashes: ${ref}`);
  expect(!/^https?:\/\//.test(ref), `${label} must reference a committed repository artifact: ${ref}`);
}

async function workspacePackageJsons() {
  const entries = await readdir(path.join(ROOT, "packages"), { withFileTypes: true });
  const packages = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    packages.push(await readJson(`packages/${entry.name}/package.json`));
  }
  return packages;
}

function downstreamByPackage(packageJsons) {
  const packageNames = new Set(packageJsons.map((entry) => entry.name));
  const downstream = new Map([...packageNames].map((name) => [name, []]));
  for (const packageJson of packageJsons) {
    for (const dependencyName of Object.keys(packageJson.dependencies ?? {})) {
      if (packageNames.has(dependencyName)) downstream.get(dependencyName)?.push(packageJson.name);
    }
  }
  for (const value of downstream.values()) value.sort();
  return downstream;
}

async function assertDeclaredImports(entry) {
  for (const dependent of entry.dependents) {
    for (const ref of dependent.evidenceRefs) {
      assertRepoRef(ref, `${dependent.packageName} evidenceRefs`);
      expect(await fileExists(ref), `${dependent.packageName} evidence ref does not exist: ${ref}`);
    }

    const evidenceText = (await Promise.all(dependent.evidenceRefs.map((ref) => readText(ref)))).join("\n");
    for (const importSurface of dependent.importSurfaces) {
      const importPattern = new RegExp(`from\\s+["']${importSurface.replace("/", "\\/")}["']|import\\(["']${importSurface.replace("/", "\\/")}["']\\)`);
      expect(
        importPattern.test(evidenceText),
        `${dependent.packageName} does not import declared API surface ${importSurface}`,
      );
    }

    const siblingPath = `packages/${entry.packageName.split("/")[1]}`;
    const siblingPathPattern = new RegExp(`(^|[^A-Za-z0-9_-])${siblingPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:/|$)`);
    expect(!siblingPathPattern.test(evidenceText), `${dependent.packageName} evidence must not import sibling path ${siblingPath}`);
  }
}

async function assertBuiltPackageSmoke() {
  const releaseGates = await readJson(RELEASE_GATES_PATH);
  const validatedPackages = releaseGates.packages
    .filter(
      (entry) =>
        entry.downstreamApiStability?.requiredBeforeRelease === true &&
        entry.downstreamApiStability?.status === "validated",
    )
    .map((entry) => entry.packageName)
    .sort();

  for (const packageName of validatedPackages) {
    const packageDir = packageName.split("/")[1];
    expect(await fileExists(`packages/${packageDir}/dist/index.js`), `${packageName} dist output is missing; run npm run -s build first.`);
  }

  const textdoc = await import("@ismail-elkorchi/textdoc");
  const textprotocol = await import("@ismail-elkorchi/textprotocol");
  const textconformance = await import("@ismail-elkorchi/textconformance");
  const textpack = await import("@ismail-elkorchi/textpack");
  const textpipeline = await import("@ismail-elkorchi/textpipeline");
  const textcorpus = await import("@ismail-elkorchi/textcorpus");
  const textrules = await import("@ismail-elkorchi/textrules");
  const textlab = await import("@ismail-elkorchi/textlab");

  const document = {
    schemaVersion: 1,
    documentId: "doc:downstream-api",
    revision: "r1",
    text: "Alice works.",
    textLengthCU: 12,
    units: { text: "utf16-code-unit" },
    views: [{ id: "source-view", kind: "raw" }],
    layers: [
      {
        id: "tokens",
        kind: "token",
        viewId: "source-view",
        annotations: [
          {
            id: "token-1",
            kind: "token",
            tokenKind: "lexical-token",
            lifecycle: { state: "active" },
            targets: [{ kind: "span", viewId: "source-view", startCU: 0, endCU: 5 }],
            text: "Alice",
          },
          {
            id: "token-2",
            kind: "token",
            tokenKind: "lexical-token",
            lifecycle: { state: "active" },
            targets: [{ kind: "span", viewId: "source-view", startCU: 6, endCU: 11 }],
            text: "works",
          },
        ],
      },
    ],
  };

  expect(textdoc.isTextDocDocumentV1(document), "textdoc built API should validate a downstream document fixture.");

  const envelope = {
    schemaId: textprotocol.resultEnvelopeSchemaId,
    schemaVersion: textprotocol.resultEnvelopeSchemaVersion,
    producer: { package: "@ismail-elkorchi/textdoc", version: "0.0.0" },
    payloadKind: textdoc.textDocDocumentPayloadKind,
    payload: document,
  };
  expect(textprotocol.isTextProtocolResultEnvelopeV1(envelope), "textprotocol built API should validate a result envelope.");

  const conformanceReport = textconformance.runTextConformanceChecks(
    [
      {
        checkId: "downstream-api-smoke",
        run: () => ({
          checkId: "downstream-api-smoke",
          status: "pass",
          message: "Built package APIs are importable by downstream smoke checks.",
          evidenceRefs: [ARTIFACT_PATH],
        }),
      },
    ],
    {
      reportId: "downstream-api-stability",
      subject: {
        kind: "package-release-gate",
        id: "downstream-api-stability",
        schemaId: "urn:ismail-elkorchi:package-release:downstream-api-stability:v1",
      },
    },
  );
  expect(textconformance.isTextConformanceReportV1(conformanceReport), "textconformance built API should produce a report.");

  const pipelineRun = textpipeline.runTextPipeline(document, [
    {
      descriptor: {
        id: "identity",
        version: "1.0.0",
        purity: "pure",
        parallelSafe: true,
      },
      run(inputDocument) {
        return { document: inputDocument };
      },
    },
  ]);
  expect(textdoc.isTextDocDocumentV1(pipelineRun.document), "textpipeline should preserve the textdoc document contract.");
  expect(textpipeline.isTextPipelineTraceV1(pipelineRun.trace), "textpipeline should emit a valid trace.");
  const traceInspection = textlab.inspectTextPipelineTrace(pipelineRun.trace);
  expect(traceInspection.entryCount === 1, "textlab should inspect textpipeline traces through package APIs.");

  const collection = textcorpus.createTextCorpusCollection(
    [
      {
        id: "doc-a",
        document,
        viewId: "source-view",
        tokenLayerId: "tokens",
      },
    ],
    { corpusId: "corpus:downstream-api" },
  );
  expect(textcorpus.isTextCorpusCollectionV1(collection), "textcorpus should consume textdoc documents through package APIs.");
  const inspection = textlab.inspectTextdocAnnotations(document);
  expect(inspection.layerCount === 1, "textlab should inspect textdoc documents through package APIs.");

  const manifest = {
    manifestVersion: "1.0.0",
    id: "pack:downstream-api",
    packageName: "@ismail-elkorchi/textpack-downstream-api",
    version: "0.1.0",
    kind: ["language"],
    targets: { languages: ["en"], scripts: ["Latn"] },
    engines: { "@ismail-elkorchi/textpack": "^0.1.0" },
    externalData: { unicode: "17.0.0" },
    capabilities: { lexicons: true },
    resources: { lexicons: ["resources/lexicon.tsv"] },
    provides: { lexicons: ["lexicon-downstream-api"] },
    entrypoints: { manifest: "pack.manifest.json" },
    licenses: { code: ["MIT"], data: ["CC0-1.0"] },
    provenance: { sources: ["repo:tools/check-downstream-api-stability.mjs"], generated: false },
    tests: {
      smoke: ["resources/lexicon.tsv"],
      negative: ["negative:no-hidden-canonicalizer"],
      representative: ["representative:alice"],
    },
    reviewState: "experimental",
    composition: { overlayPrecedence: 1 },
  };
  expect(textpack.isTextPackManifestV1(manifest), "textpack built API should validate a manifest.");

  const loadedPack = textpack.loadTextPackResources(
    [manifest],
    { kind: "lexicon", language: "en" },
    { "resources/lexicon.tsv": "Alice\tpos=PROPN\tlemma=Alice\n" },
  );
  expect(loadedPack.diagnostics.length === 0, "textpack built API should load smoke lexicon resources.");

  const lexiconResources = textrules.createTextRulesLexiconResourcesFromLoadedPack(loadedPack.resources);
  expect(lexiconResources.diagnostics.length === 0, "textrules should consume loaded textpack resources.");
  expect(lexiconResources.resources.length === 1, "textrules should expose one loaded lexicon resource.");
  const compiledRules = textrules.compileTextRulesFromTextPackResources(loadedPack.resources);
  expect(compiledRules.diagnostics.length === 0, "textrules should compile loaded textpack resources.");
  const packRuleRun = textrules.runTextPackRulesOverTextDoc({ document, compiled: compiledRules.compiled });
  const packRuleInspection = textlab.inspectPackBackedRuleAnnotations(packRuleRun.document);
  expect(packRuleInspection.ruleAnnotationCount === 1, "textlab should inspect pack-backed textrules annotations through package APIs.");
}

const [schema, artifact, releaseGates] = await Promise.all([
  readJson(SCHEMA_PATH),
  readJson(ARTIFACT_PATH),
  readJson(RELEASE_GATES_PATH),
]);
const ajv = new Ajv({ allErrors: true, strict: false });
const validate = ajv.compile(schema);
expect(validate(artifact), `${ARTIFACT_PATH} failed ${SCHEMA_PATH}`, validate.errors);

const packageJsons = await workspacePackageJsons();
const downstream = downstreamByPackage(packageJsons);
const expectedProvenPackageNames = releaseGates.packages
  .filter(
    (entry) =>
      entry.downstreamApiStability?.requiredBeforeRelease === true &&
      entry.downstreamApiStability?.status === "validated",
  )
  .map((entry) => entry.packageName)
  .sort();
const declaredPackageNames = artifact.packages.map((entry) => entry.packageName).sort();
expect(
  JSON.stringify(declaredPackageNames) === JSON.stringify(expectedProvenPackageNames),
  "downstream API artifact must cover exactly the release-gate validated package set.",
  { expected: expectedProvenPackageNames, actual: declaredPackageNames },
);

for (const entry of artifact.packages) {
  const expectedDependents = downstream.get(entry.packageName) ?? [];
  const actualDependents = entry.dependents.map((dependent) => dependent.packageName).sort();
  expect(
    JSON.stringify(actualDependents) === JSON.stringify(expectedDependents),
    `${entry.packageName} downstream dependent list must match workspace package dependencies.`,
    { expected: expectedDependents, actual: actualDependents },
  );
  for (const ref of entry.evidenceRefs) {
    assertRepoRef(ref, `${entry.packageName} evidenceRefs`);
    expect(await fileExists(ref), `${entry.packageName} evidence ref does not exist: ${ref}`);
  }
  await assertDeclaredImports(entry);
}

await assertBuiltPackageSmoke();

console.log(`Downstream API stability OK (packages=${artifact.packages.length}).`);
