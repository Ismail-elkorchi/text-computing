import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import Ajv from "ajv";

const ROOT = process.cwd();
const REPLAY_MANIFEST_PATH = "fixtures/reports/evidence-replay.v1.json";
const MODES = new Set(["replay", "execute"]);
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
    knownGap: "Only committed spaCy and Stanza captures are comparator-backed; no JavaScript POS/morph/lemma comparator-backed claim is made.",
    gapDisposition: "executed-captures-and-narrowed-claim",
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
    knownGap: "External CoNLL-U evidence is validator-format evidence only; it is not parser-accuracy evidence.",
    gapDisposition: "executed-captures-and-narrowed-claim",
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
    knownGap: "Dependency parser behavior remains limited to frozen slices; no JavaScript dependency-parser comparator-backed claim is made.",
    gapDisposition: "executed-captures-and-narrowed-claim",
  },
  retrieval: {
    taskId: "nlp-retrieval",
    validatorCommands: [["node", "tools/validate-retrieval-feature.mjs"]],
    comparisonDir: null,
    comparisonSchema: null,
    conformanceReportRefs: ["fixtures/reports/nlp-retrieval/conformance-report.json"],
    knownGap: "Retrieval behavior remains limited to committed explicit-token corpora, qrels, and deterministic thresholds; no external comparator-backed retrieval claim is made.",
    claimDowngraded: true,
    gapDisposition: "claim-narrowed",
  },
  "relation-extraction": {
    taskId: "nlp-relation-extraction",
    validatorCommands: [["node", "tools/validate-relation-extraction-readiness.mjs"]],
    comparisonDir: null,
    comparisonSchema: null,
    conformanceReportRefs: ["fixtures/reports/nlp-relation-extraction/conformance-report.json"],
    knownGap: "Relation extraction behavior remains limited to the frozen repository-authored corpus slice; no external comparator-backed relation extraction claim is made.",
    claimDowngraded: true,
    gapDisposition: "claim-narrowed",
  },
  coreference: {
    taskId: "nlp-coreference",
    validatorCommands: [["node", "tools/validate-coreference-readiness.mjs"]],
    comparisonDir: null,
    comparisonSchema: null,
    conformanceReportRefs: ["fixtures/reports/nlp-coreference/conformance-report.json"],
    knownGap: "Coreference behavior remains limited to the frozen repository-authored corpus slice; no external comparator-backed coreference claim is made.",
    claimDowngraded: true,
    gapDisposition: "claim-narrowed",
  },
};

const writeMode = process.argv.includes("--write");
const positionalArgs = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
const firstArg = positionalArgs[0];
const mode = MODES.has(firstArg) ? firstArg : "replay";
const taskArg = (mode === firstArg ? positionalArgs[1] : firstArg) ?? "all";
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

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
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
    repo: {
      headSha: repoHead,
      dirty,
    },
    generatedAt: new Date(0).toISOString(),
    inputs: [
      {
        role: "source",
        path: command[1],
        sha256: "0".repeat(64),
      },
    ],
    comparator: {
      name: "repository-validator",
      version: "1",
      runtime: "node",
      source: command[1],
    },
    command: {
      argv: command,
      cwd: ".",
    },
    runtime: {
      name: "node",
      version: process.versions.node,
      platform: process.platform,
    },
    environment: {
      node: process.versions.node,
    },
    execution: {
      exitCode: 0,
      stdout: commandResult.stdout,
      stderr: "",
      durationMs: commandResult.durationMs,
    },
    status: "pass",
    outputs: [],
    differences: [],
    conformanceReportRefs: config.conformanceReportRefs,
    notes: config.knownGap ? [config.knownGap] : [],
  };
}

function makeComparisonRun({ config, comparison, comparisonPath, comparisonHash, repoHead, dirty }) {
  const comparator = comparison.comparator ?? comparison.validator ?? {};
  const status = comparison.executionStatus === "capability-recorded" ? "not-run" : "pass";
  return {
    schemaId: "urn:ismail-elkorchi:evidence:run:v1",
    schemaVersion: 1,
    runId: `evidence-run:${config.taskId}:${String(comparator.name ?? "comparator")}:${comparisonPath}`,
    taskId: config.taskId,
    repo: {
      headSha: repoHead,
      dirty,
    },
    generatedAt: comparison.capturedDate ? `${comparison.capturedDate}T00:00:00.000Z` : new Date(0).toISOString(),
    inputs: [
      {
        role: "comparison",
        path: comparisonPath,
        sha256: comparisonHash,
      },
    ],
    comparator: {
      name: String(comparator.name ?? "unknown"),
      version: String(comparator.version ?? comparator.commit ?? "unknown"),
      runtime: String(comparator.runtime ?? "unknown"),
      ...(comparator.model ? { model: comparator.model } : {}),
      ...(comparator.license ? { license: comparator.license } : {}),
      source: comparisonPath,
    },
    command: {
      argv: ["node", "tools/compare/run.mjs", mode, taskArg],
      cwd: ".",
    },
    runtime: {
      name: "node",
      version: process.versions.node,
      platform: process.platform,
    },
    environment: {
      node: process.versions.node,
    },
    execution: {
      exitCode: 0,
      stdout: "",
      stderr: "",
      durationMs: 0,
    },
    status,
    outputs: [
      {
        kind: "comparison-capture",
        path: comparisonPath,
        sha256: comparisonHash,
      },
    ],
    differences: [],
    conformanceReportRefs: config.conformanceReportRefs,
    notes: config.knownGap ? [config.knownGap] : [],
  };
}

function makeExternalComparatorAttemptRun({ config, attempt, repoHead, dirty }) {
  return {
    schemaId: "urn:ismail-elkorchi:evidence:run:v1",
    schemaVersion: 1,
    runId: `evidence-run:${config.taskId}:${attempt.comparatorName}:external-execute:${attempt.expectedVersion}`,
    taskId: config.taskId,
    repo: {
      headSha: repoHead,
      dirty,
    },
    generatedAt: new Date(0).toISOString(),
    inputs: [
      {
        role: "comparison",
        path: attempt.comparisonPath,
        sha256: "0".repeat(64),
      },
    ],
    comparator: {
      name: attempt.comparatorName,
      version: attempt.expectedVersion,
      runtime: attempt.runtime,
      source: attempt.comparisonPath,
    },
    command: {
      argv: attempt.argv,
      cwd: ".",
    },
    runtime: {
      name: attempt.runtime,
      version: attempt.observedVersion ?? "unavailable",
      platform: process.platform,
    },
    environment: {
      node: process.versions.node,
    },
    execution: {
      exitCode: attempt.status === "pass" ? 0 : attempt.status === "fail" ? 1 : 127,
      stdout: attempt.stdout,
      stderr: attempt.stderr,
      durationMs: attempt.durationMs,
    },
    status: attempt.status,
    outputs: [],
    differences: attempt.status === "fail"
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
const validateEvidenceReplay = ajv.compile(await readJson("schemas/evidence-replay-v1.schema.json"));
const schemaValidators = new Map();
const repoHead = execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
const dirty = execFileSync("git", ["status", "--porcelain"], { cwd: ROOT, encoding: "utf8" }).trim().length > 0;
const summaries = [];
const replayTasks = [];

for (const taskName of taskNames) {
  const config = TASKS[taskName];
  if (config === undefined) {
    fail(`Unknown compare task: ${taskName}`);
  }

  let runCount = 0;
  const externalExecutions = [];
  const validatorRefs = [];
  for (const command of config.validatorCommands) {
    const commandResult = runCommand(command);
    const run = makeValidatorRun({ config, command, commandResult, repoHead, dirty });
    if (run.inputs[0]?.path !== undefined) {
      run.inputs[0].sha256 = await sha256(run.inputs[0].path);
    }
    if (!validateEvidenceRun(run)) {
      fail(`${taskName} generated validator evidence run failed schema validation`, validateEvidenceRun.errors);
    }
    validatorRefs.push({
      argv: command,
      path: command[1],
      sha256: run.inputs[0].sha256,
    });
    runCount += 1;
  }

  const files = await comparisonFiles(config);
  if (config.comparisonSchema !== null && files.length === 0) {
    fail(`${taskName} has comparison schema but no comparison files`);
  }

  let validateComparison = null;
  if (config.comparisonSchema !== null) {
    if (!schemaValidators.has(config.comparisonSchema)) {
      schemaValidators.set(config.comparisonSchema, ajv.compile(await readJson(config.comparisonSchema)));
    }
    validateComparison = schemaValidators.get(config.comparisonSchema);
  }

  const comparisonRefs = [];
  let executedComparisonCount = 0;
  let capabilityRecordCount = 0;
  for (const file of files) {
    const comparison = await readJson(file);
    if (!validateComparison(comparison)) {
      fail(`${file} failed ${config.comparisonSchema}`, validateComparison.errors);
    }
    const comparisonHash = await sha256(file);
    const run = makeComparisonRun({
      config,
      comparison,
      comparisonPath: file,
      comparisonHash,
      repoHead,
      dirty,
    });
    if (!validateEvidenceRun(run)) {
      fail(`${taskName} generated comparison evidence run failed schema validation`, validateEvidenceRun.errors);
    }
    comparisonRefs.push({
      path: file,
      sha256: comparisonHash,
      comparator: {
        name: run.comparator.name,
        version: run.comparator.version,
        runtime: run.comparator.runtime,
        ...(run.comparator.model ? { model: run.comparator.model } : {}),
        ...(run.comparator.license ? { license: run.comparator.license } : {}),
      },
      status: run.status,
      captureMode: String(comparison.captureMode ?? "unspecified"),
    });
    if (run.status === "pass") executedComparisonCount += 1;
    if (run.status === "not-run") capabilityRecordCount += 1;
    runCount += 1;
  }

  if (mode === "execute") {
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
      if (attempt.status === "fail") {
        fail(`${taskName} external comparator version check failed`, externalExecutions.at(-1));
      }
      runCount += 1;
    }
  }

  const summary = {
    task: taskName,
    taskId: config.taskId,
    validators: config.validatorCommands.length,
    comparisons: files.length,
    executedComparisons: executedComparisonCount,
    capabilityRecords: capabilityRecordCount,
    evidenceRuns: runCount,
    externalExecutions,
    status: config.knownGap && files.length === 0 && !config.claimDowngraded ? "gap-recorded" : "ok",
  };
  summaries.push(summary);
  replayTasks.push({
    task: taskName,
    taskId: config.taskId,
    status: summary.status,
    validators: validatorRefs,
    comparisons: comparisonRefs,
    conformanceReportRefs: config.conformanceReportRefs,
    ...(config.knownGap ? { knownGap: config.knownGap } : {}),
    ...(config.gapDisposition ? { gapDisposition: config.gapDisposition } : {}),
  });
}

const replayManifest = {
  schemaVersion: 1,
  generatedAt: "2026-05-16T00:00:00.000Z",
  tasks: replayTasks,
};

if (!validateEvidenceReplay(replayManifest)) {
  fail("Generated evidence replay manifest failed schema validation", validateEvidenceReplay.errors);
}

if (mode === "execute") {
  const executableComparisonCount = replayTasks
    .flatMap((task) => task.comparisons)
    .filter((comparison) => comparison.status === "pass").length;
  if (executableComparisonCount === 0 && taskArg !== "all") {
    fail(`${taskArg} has no executed comparator captures to inspect`);
  }
} else if (taskArg === "all") {
  if (writeMode) {
    await mkdir(path.dirname(path.join(ROOT, REPLAY_MANIFEST_PATH)), { recursive: true });
    await writeFile(path.join(ROOT, REPLAY_MANIFEST_PATH), `${JSON.stringify(replayManifest, null, 2)}\n`);
  } else {
    const committedManifest = await readJson(REPLAY_MANIFEST_PATH);
    if (!validateEvidenceReplay(committedManifest)) {
      fail(`${REPLAY_MANIFEST_PATH} failed schema validation`, validateEvidenceReplay.errors);
    }
    if (stableStringify(committedManifest) !== stableStringify(replayManifest)) {
      fail(`${REPLAY_MANIFEST_PATH} is stale; run npm run -s compare:write and review the diff`);
    }
  }
} else if (!writeMode) {
  const committedManifest = await readJson(REPLAY_MANIFEST_PATH);
  const committedTasks = new Map(committedManifest.tasks.map((task) => [task.task, task]));
  for (const replayTask of replayTasks) {
    if (stableStringify(committedTasks.get(replayTask.task)) !== stableStringify(replayTask)) {
      fail(`${REPLAY_MANIFEST_PATH} is stale for ${replayTask.task}; run npm run -s compare:write and review the diff`);
    }
  }
}

console.log(JSON.stringify({ schemaVersion: 1, mode, repoHead, dirty, summaries }, null, 2));
