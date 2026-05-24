import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import Ajv from "ajv";

const ROOT = process.cwd();
const TASKS = {
  "tokenization-sbd": {
    taskId: "nlp-tokenization-sbd",
    validatorCommands: [["node", "tools/validate-tokenization-sbd-readiness.mjs"]],
    comparisonDir: "fixtures/tokenization-sbd/comparisons",
    comparisonSchema: "schemas/tokenization-sbd-comparison-v1.schema.json",
    conformanceReportRefs: ["fixtures/reports/nlp-tokenization-sbd/conformance-report.json"],
    externalComparatorCommands: [
      {
        comparatorName: "spaCy",
        expectedVersion: "3.8.14",
        runtime: "python",
        argv: ["python3", "-c", "import spacy; print(spacy.__version__)"],
        comparisonPath: "fixtures/tokenization-sbd/comparisons/spacy-3.8.14.json",
      },
      {
        comparatorName: "wink-nlp",
        expectedVersion: "2.4.0",
        runtime: "node",
        argv: [
          "node",
          "-e",
          "import { createRequire } from 'node:module'; const require = createRequire(process.cwd() + '/'); const pkg = require('wink-nlp/package.json'); console.log(pkg.version);",
        ],
        comparisonPath: "fixtures/tokenization-sbd/comparisons/wink-nlp-2.4.0.json",
      },
    ],
  },
  "pos-morph-lemma": {
    taskId: "nlp-pos-morph-lemma",
    validatorCommands: [
      ["node", "tools/validate-pos-morph-lemma-readiness.mjs"],
      ["node", "tools/validate-pos-morph-lemma-feature.mjs"],
    ],
    comparisonDir: "fixtures/pos-morph-lemma/comparisons",
    comparisonSchema: "schemas/pos-morph-lemma-comparison-v1.schema.json",
    conformanceReportRefs: ["fixtures/reports/nlp-pos-morph-lemma/conformance-report.json"],
    knownGap: "Only committed spaCy and Stanza captures exist; no live JavaScript comparator command is configured for this task.",
  },
  "rule-backed-ner": {
    taskId: "nlp-rule-backed-ner",
    validatorCommands: [["node", "tools/validate-rule-backed-ner-readiness.mjs"]],
    comparisonDir: "fixtures/rule-backed-ner/comparisons",
    comparisonSchema: "schemas/rule-backed-ner-comparison-v1.schema.json",
    conformanceReportRefs: ["fixtures/reports/nlp-rule-backed-ner/conformance-report.json"],
  },
  "corpus-tfidf-bm25": {
    taskId: "nlp-corpus-tfidf-bm25",
    validatorCommands: [["node", "tools/validate-corpus-tfidf-bm25-readiness.mjs"]],
    comparisonDir: "fixtures/corpus-tfidf-bm25/comparisons",
    comparisonSchema: "schemas/corpus-tfidf-bm25-comparison-v1.schema.json",
    conformanceReportRefs: ["fixtures/reports/nlp-corpus-tfidf-bm25/conformance-report.json"],
  },
  conllu: {
    taskId: "nlp-conllu-dependency-roundtrip",
    validatorCommands: [["node", "tools/validate-conllu-dependency-readiness.mjs"]],
    comparisonDir: "fixtures/conllu-dependency/validation",
    comparisonSchema: "schemas/conllu-validator-capture-v1.schema.json",
    conformanceReportRefs: ["fixtures/reports/nlp-conllu-dependency-roundtrip/conformance-report.json"],
    knownGap: "External CoNLL-U evidence is validator-format evidence only; no live validator command is configured here.",
  },
  "dependency-parser": {
    taskId: "nlp-dependency-parser",
    validatorCommands: [
      ["node", "tools/validate-dependency-parser-readiness.mjs"],
      ["node", "tools/validate-dependency-parser-feature.mjs"],
    ],
    comparisonDir: "fixtures/dependency-parser/comparisons",
    comparisonSchema: "schemas/dependency-parser-comparison-v1.schema.json",
    conformanceReportRefs: ["fixtures/reports/nlp-dependency-parser/conformance-report.json"],
    knownGap: "Dependency parser comparison captures are committed fixtures; no live parser comparator command is configured here.",
  },
  retrieval: {
    taskId: "nlp-retrieval",
    validatorCommands: [["node", "tools/validate-retrieval-feature.mjs"]],
    comparisonDir: null,
    comparisonSchema: null,
    conformanceReportRefs: ["fixtures/reports/nlp-retrieval/conformance-report.json"],
  },
  "relation-extraction": {
    taskId: "nlp-relation-extraction",
    validatorCommands: [["node", "tools/validate-relation-extraction-readiness.mjs"]],
    comparisonDir: null,
    comparisonSchema: null,
    conformanceReportRefs: ["fixtures/reports/nlp-relation-extraction/conformance-report.json"],
  },
  coreference: {
    taskId: "nlp-coreference",
    validatorCommands: [["node", "tools/validate-coreference-readiness.mjs"]],
    comparisonDir: null,
    comparisonSchema: null,
    conformanceReportRefs: ["fixtures/reports/nlp-coreference/conformance-report.json"],
  },
};

const positionalArgs = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
if (positionalArgs[0] === "replay") {
  fail("Comparator replay manifests were removed. Use live execution: node tools/compare/run.mjs execute [task].");
}
const mode = positionalArgs[0] === "execute" ? "execute" : "execute";
const taskArg = (positionalArgs[0] === "execute" ? positionalArgs[1] : positionalArgs[0]) ?? "all";
const taskNames = taskArg === "all" ? Object.keys(TASKS) : [taskArg];

function fail(message, details) {
  console.error(message);
  if (details !== undefined) console.error(JSON.stringify(details, null, 2));
  process.exit(1);
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(ROOT, relativePath), "utf8"));
}

async function sha256(relativePath) {
  const data = await readFile(path.join(ROOT, relativePath));
  return createHash("sha256").update(data).digest("hex");
}

function runCommand(command) {
  const [binary, ...args] = command;
  const started = Date.now();
  const output = execFileSync(binary, args, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return {
    durationMs: Date.now() - started,
    stdout: output,
  };
}

function sanitizeExecutionText(text) {
  return String(text)
    .replaceAll(ROOT, "<repo>")
    .replace(/\/home\/[^/\s]+\/[^\s"']*/gu, "<local-path>");
}

function runOptionalExternalComparator(command) {
  const started = Date.now();
  const [binary, ...args] = command.argv;
  const result = spawnSync(binary, args, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const durationMs = Date.now() - started;
  const stdout = sanitizeExecutionText(result.stdout ?? "");
  const stderr = sanitizeExecutionText(result.stderr ?? "");
  if (result.error !== undefined || result.status !== 0) {
    return {
      comparatorName: command.comparatorName,
      expectedVersion: command.expectedVersion,
      runtime: command.runtime,
      argv: command.argv,
      comparisonPath: command.comparisonPath,
      status: "not-run",
      observedVersion: null,
      skipReason: result.error?.message ?? (stderr.trim() || `exit ${result.status}`),
      durationMs,
      stdout,
      stderr,
    };
  }
  const observedVersion = stdout.trim();
  if (observedVersion !== command.expectedVersion) {
    return {
      comparatorName: command.comparatorName,
      expectedVersion: command.expectedVersion,
      runtime: command.runtime,
      argv: command.argv,
      comparisonPath: command.comparisonPath,
      status: "fail",
      observedVersion,
      skipReason: `expected ${command.expectedVersion}, observed ${observedVersion}`,
      durationMs,
      stdout,
      stderr,
    };
  }
  return {
    comparatorName: command.comparatorName,
    expectedVersion: command.expectedVersion,
    runtime: command.runtime,
    argv: command.argv,
    comparisonPath: command.comparisonPath,
    status: "pass",
    observedVersion,
    skipReason: null,
    durationMs,
    stdout,
    stderr,
  };
}

async function comparisonFiles(config) {
  if (config.comparisonDir === null) return [];
  const entries = await readdir(path.join(ROOT, config.comparisonDir));
  return entries
    .filter((entry) => entry.endsWith(".json"))
    .sort()
    .map((entry) => `${config.comparisonDir}/${entry}`);
}

function makeValidatorRun({ config, command, commandResult, repoHead, dirty }) {
  return {
    schemaId: "urn:ismail-elkorchi:evidence:run:v1",
    schemaVersion: 1,
    runId: `evidence-run:${config.taskId}:repository-validator:${command.join("-")}`,
    taskId: config.taskId,
    repo: { headSha: repoHead, dirty },
    generatedAt: new Date(0).toISOString(),
    inputs: [{ role: "source", path: command[1], sha256: "0".repeat(64) }],
    comparator: { name: "repository-validator", version: "1", runtime: "node", source: command[1] },
    command: { argv: command, cwd: "." },
    runtime: { name: "node", version: process.versions.node, platform: process.platform },
    environment: { node: process.versions.node },
    execution: { exitCode: 0, stdout: commandResult.stdout, stderr: "", durationMs: commandResult.durationMs },
    status: "pass",
    outputs: [],
    differences: [],
    conformanceReportRefs: config.conformanceReportRefs,
    notes: config.knownGap ? [config.knownGap] : [],
  };
}

function makeComparisonCaptureRun({ config, comparison, comparisonPath, comparisonHash, repoHead, dirty }) {
  const comparator = comparison.comparator ?? comparison.validator ?? {};
  return {
    schemaId: "urn:ismail-elkorchi:evidence:run:v1",
    schemaVersion: 1,
    runId: `evidence-run:${config.taskId}:${String(comparator.name ?? "comparator")}:${comparisonPath}`,
    taskId: config.taskId,
    repo: { headSha: repoHead, dirty },
    generatedAt: comparison.capturedDate ? `${comparison.capturedDate}T00:00:00.000Z` : new Date(0).toISOString(),
    inputs: [{ role: "comparison", path: comparisonPath, sha256: comparisonHash }],
    comparator: {
      name: String(comparator.name ?? "unknown"),
      version: String(comparator.version ?? comparator.commit ?? "unknown"),
      runtime: String(comparator.runtime ?? "unknown"),
      ...(comparator.model ? { model: comparator.model } : {}),
      ...(comparator.license ? { license: comparator.license } : {}),
      source: comparisonPath,
    },
    command: { argv: ["node", "tools/compare/run.mjs", "execute", taskArg], cwd: "." },
    runtime: { name: "node", version: process.versions.node, platform: process.platform },
    environment: { node: process.versions.node },
    execution: { exitCode: 0, stdout: "", stderr: "", durationMs: 0 },
    status: "not-run",
    outputs: [{ kind: "comparison-capture", path: comparisonPath, sha256: comparisonHash }],
    differences: [],
    conformanceReportRefs: config.conformanceReportRefs,
    notes: [
      "Committed comparator capture was schema-validated; no live comparator execution is claimed by this run.",
      ...(config.knownGap ? [config.knownGap] : []),
    ],
  };
}

function makeExternalComparatorAttemptRun({ config, attempt, repoHead, dirty }) {
  return {
    schemaId: "urn:ismail-elkorchi:evidence:run:v1",
    schemaVersion: 1,
    runId: `evidence-run:${config.taskId}:${attempt.comparatorName}:external-execute:${attempt.expectedVersion}`,
    taskId: config.taskId,
    repo: { headSha: repoHead, dirty },
    generatedAt: new Date(0).toISOString(),
    inputs: [{ role: "comparison", path: attempt.comparisonPath, sha256: "0".repeat(64) }],
    comparator: {
      name: attempt.comparatorName,
      version: attempt.expectedVersion,
      runtime: attempt.runtime,
      source: attempt.comparisonPath,
    },
    command: { argv: attempt.argv, cwd: "." },
    runtime: { name: attempt.runtime, version: attempt.observedVersion ?? "unavailable", platform: process.platform },
    environment: { node: process.versions.node },
    execution: {
      exitCode: attempt.status === "pass" ? 0 : attempt.status === "fail" ? 1 : 127,
      stdout: attempt.stdout,
      stderr: attempt.stderr,
      durationMs: attempt.durationMs,
    },
    status: attempt.status,
    outputs: [],
    differences:
      attempt.status === "fail"
        ? [
            {
              kind: "version-mismatch",
              severity: "failure",
              message: attempt.skipReason,
              expected: attempt.expectedVersion,
              actual: attempt.observedVersion,
            },
          ]
        : [],
    conformanceReportRefs: config.conformanceReportRefs,
    notes: attempt.status === "not-run" ? [`Comparator unavailable: ${attempt.skipReason}`] : [],
  };
}

const ajv = new Ajv({ allErrors: true, strict: false });
const validateEvidenceRun = ajv.compile(await readJson("schemas/evidence-run-v1.schema.json"));
const schemaValidators = new Map();
const repoHead = execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
const dirty = execFileSync("git", ["status", "--porcelain"], { cwd: ROOT, encoding: "utf8" }).trim().length > 0;
const summaries = [];
const missingLiveComparatorTasks = [];

for (const taskName of taskNames) {
  const config = TASKS[taskName];
  if (config === undefined) fail(`Unknown compare task: ${taskName}`);

  let evidenceRunCount = 0;
  let captureValidationCount = 0;
  let liveComparatorPassCount = 0;
  const externalExecutions = [];

  for (const command of config.validatorCommands) {
    const commandResult = runCommand(command);
    const run = makeValidatorRun({ config, command, commandResult, repoHead, dirty });
    run.inputs[0].sha256 = await sha256(run.inputs[0].path);
    if (!validateEvidenceRun(run)) {
      fail(`${taskName} generated validator evidence run failed schema validation`, validateEvidenceRun.errors);
    }
    evidenceRunCount += 1;
  }

  const files = await comparisonFiles(config);
  if (config.comparisonSchema !== null && files.length === 0) fail(`${taskName} has comparison schema but no comparison files`);

  let validateComparison = null;
  if (config.comparisonSchema !== null) {
    if (!schemaValidators.has(config.comparisonSchema)) {
      schemaValidators.set(config.comparisonSchema, ajv.compile(await readJson(config.comparisonSchema)));
    }
    validateComparison = schemaValidators.get(config.comparisonSchema);
  }

  for (const file of files) {
    const comparison = await readJson(file);
    if (!validateComparison(comparison)) fail(`${file} failed ${config.comparisonSchema}`, validateComparison.errors);
    const comparisonHash = await sha256(file);
    const run = makeComparisonCaptureRun({ config, comparison, comparisonPath: file, comparisonHash, repoHead, dirty });
    if (!validateEvidenceRun(run)) {
      fail(`${taskName} generated comparison-capture evidence run failed schema validation`, validateEvidenceRun.errors);
    }
    captureValidationCount += 1;
    evidenceRunCount += 1;
  }

  for (const command of config.externalComparatorCommands ?? []) {
    const attempt = runOptionalExternalComparator(command);
    const run = makeExternalComparatorAttemptRun({ config, attempt, repoHead, dirty });
    run.inputs[0].sha256 = await sha256(attempt.comparisonPath);
    if (!validateEvidenceRun(run)) {
      fail(`${taskName} generated external comparator evidence run failed schema validation`, validateEvidenceRun.errors);
    }
    externalExecutions.push({
      comparator: attempt.comparatorName,
      expectedVersion: attempt.expectedVersion,
      observedVersion: attempt.observedVersion,
      status: attempt.status,
      command: attempt.argv,
      comparisonPath: attempt.comparisonPath,
      ...(attempt.skipReason ? { skipReason: attempt.skipReason } : {}),
    });
    if (attempt.status === "fail") fail(`${taskName} external comparator version check failed`, externalExecutions.at(-1));
    if (attempt.status === "pass") liveComparatorPassCount += 1;
    evidenceRunCount += 1;
  }

  if (files.length > 0 && liveComparatorPassCount === 0) missingLiveComparatorTasks.push(taskName);

  summaries.push({
    task: taskName,
    taskId: config.taskId,
    validators: config.validatorCommands.length,
    comparisonCapturesValidated: captureValidationCount,
    liveComparatorExecutions: liveComparatorPassCount,
    evidenceRuns: evidenceRunCount,
    externalExecutions,
    status: files.length === 0 ? "no-comparison-captures" : liveComparatorPassCount === 0 ? "no-live-comparator" : "ok",
  });
}

console.log(JSON.stringify({ schemaVersion: 1, mode, repoHead, dirty, summaries }, null, 2));
if (missingLiveComparatorTasks.length > 0) {
  fail("Comparator execution did not produce live comparator evidence for every task with committed comparison captures.", {
    missingLiveComparatorTasks,
  });
}
