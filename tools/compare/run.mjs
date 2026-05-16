import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import Ajv from "ajv";

const ROOT = process.cwd();
const REPLAY_MANIFEST_PATH = "fixtures/reports/evidence-replay.v1.json";
const TASKS = {
  "tokenization-sbd": {
    taskId: "nlp-tokenization-sbd",
    validatorCommands: [["node", "tools/validate-tokenization-sbd-readiness.mjs"]],
    comparisonDir: "fixtures/tokenization-sbd/comparisons",
    comparisonSchema: "schemas/tokenization-sbd-comparison-v1.schema.json",
    conformanceReportRefs: ["fixtures/reports/nlp-tokenization-sbd/conformance-report.json"],
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
    knownGap: "Only spaCy has committed executed POS/morph/lemma comparator output in this gate.",
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
    knownGap: "Dependency parser behavior remains limited to frozen slices; this command validates comparator captures and feature output.",
  },
  retrieval: {
    taskId: "nlp-retrieval",
    validatorCommands: [["node", "tools/validate-retrieval-feature.mjs"]],
    comparisonDir: null,
    comparisonSchema: null,
    conformanceReportRefs: ["fixtures/reports/nlp-retrieval/conformance-report.json"],
    knownGap: "Retrieval behavior remains limited to a frozen explicit-token corpus; this command validates feature output without external comparator captures.",
  },
  "relation-extraction": {
    taskId: "nlp-relation-extraction",
    validatorCommands: [["node", "tools/validate-relation-extraction-readiness.mjs"]],
    comparisonDir: null,
    comparisonSchema: null,
    conformanceReportRefs: ["fixtures/reports/nlp-relation-extraction/conformance-report.json"],
    knownGap: "Relation extraction behavior remains limited to frozen repository-authored short-text slices; this command validates expected outputs without external comparator captures.",
  },
  coreference: {
    taskId: "nlp-coreference",
    validatorCommands: [["node", "tools/validate-coreference-readiness.mjs"]],
    comparisonDir: null,
    comparisonSchema: null,
    conformanceReportRefs: ["fixtures/reports/nlp-coreference/conformance-report.json"],
    knownGap: "Coreference behavior remains limited to frozen repository-authored short-text slices; this command validates expected outputs without external comparator captures.",
  },
};

const writeMode = process.argv.includes("--write");
const taskArg = process.argv.find((arg, index) => index > 1 && !arg.startsWith("--")) ?? "all";
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
      argv: ["node", "tools/compare/run.mjs", taskArg],
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
    status: comparison.executionStatus === "capability-recorded" ? "not-run" : "pass",
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
    });
    runCount += 1;
  }

  const summary = {
    task: taskName,
    taskId: config.taskId,
    validators: config.validatorCommands.length,
    comparisons: files.length,
    evidenceRuns: runCount,
    status: config.knownGap && files.length === 0 ? "gap-recorded" : "ok",
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

if (taskArg === "all") {
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

console.log(JSON.stringify({ schemaVersion: 1, repoHead, dirty, summaries }, null, 2));
