import { access, readFile } from "node:fs/promises";
import path from "node:path";
import Ajv from "ajv";

const ROOT = process.cwd();
const SCORECARD_PATH = "fixtures/capability-scorecard/toolkit-capability-scorecard.v1.json";
const SCORECARD_SCHEMA_PATH = "schemas/toolkit-capability-scorecard-v1.schema.json";
const SUPPORT_STATUS_PATH = "docs/specs/support-status.v1.json";
const PERFORMANCE_BUDGET_PATH = "fixtures/performance/gates.v1.json";
const TASK_EVIDENCE_POLICY_PATH = "fixtures/evidence/task-evidence-tier-policy.v1.json";

const REQUIRED_AXES = [
  "task-coverage",
  "language-tier",
  "comparator-evidence",
  "corpus-evidence",
  "conformance",
  "api",
  "performance",
  "release-readiness",
  "security",
  "reproducibility",
];
const REQUIRED_TASK_EVIDENCE_TIERS = [
  "fixture-proven",
  "comparator-backed",
  "corpus-backed",
  "broad-multilingual",
  "release-stable",
];
const BLOCKED_PUBLIC_CLAIM_TERMS = [
  ["b", "est"].join(""),
  ["b", "etter"].join(""),
  ["sup", "erior"].join(""),
  ["world", "-", "class"].join(""),
  ["world", " ", "class"].join(""),
  ["state", "-", "of", "-", "the", "-", "art"].join(""),
  ["state", " ", "of", " ", "the", " ", "art"].join(""),
  ["sur", "pass"].join(""),
];
const TASK_EVIDENCE_REQUIREMENTS = {
  "nlp-tokenization-sbd": {
    implementationOwners: ["@ismail-elkorchi/textfacts", "@ismail-elkorchi/textdoc"],
    implementationRefs: ["packages/textfacts/src", "packages/textdoc/src/index.ts"],
    fixtureRefs: ["fixtures/tokenization-sbd/slices.json"],
    negativeControlRefs: ["fixtures/tokenization-sbd/expected/unpaired-high-surrogate.json"],
    comparatorRefs: [
      "fixtures/tokenization-sbd/comparisons/spacy-3.8.14.json",
      "fixtures/tokenization-sbd/comparisons/wink-nlp-2.4.0.json",
    ],
    corpusRefs: ["fixtures/tokenization-sbd/aggregate/ud-2.18.json"],
  },
  "nlp-document-annotation-model": {
    implementationOwners: ["@ismail-elkorchi/textdoc"],
    implementationRefs: ["packages/textdoc/src/index.ts"],
    fixtureRefs: [
      "fixtures/textdoc/examples/document-annotation-model-v1.json",
      "fixtures/textdoc/roundtrip/document-annotation-model-annotation-bundle.v1.json",
      "schemas/textprotocol-annotation-bundle-v1.schema.json",
      "fixtures/textdoc/heldout/web-annotation-style-source-document-v1.json",
      "fixtures/textdoc/heldout/web-annotation-style-annotation-bundle.v1.json",
      "fixtures/textdoc/heldout/uima-style-source-document-v1.json",
      "fixtures/textdoc/heldout/uima-style-annotation-bundle.v1.json",
    ],
    negativeControlRefs: ["fixtures/textdoc/invalid/dangling-target.json"],
    comparatorRefs: [],
    corpusRefs: [],
  },
  "nlp-pack-resource-manifest": {
    implementationOwners: ["@ismail-elkorchi/textpack"],
    implementationRefs: ["packages/textpack/src/index.ts"],
    fixtureRefs: [
      "fixtures/textpack/manifests/textpack-en-core.json",
      "fixtures/textpack/manifests/textpack-en-legal.json",
      "fixtures/textpack/manifests/textpack-fr-core.json",
      "fixtures/textpack/catalog.v1.json",
      "fixtures/textpack/heldout/es-authoring/pack.manifest.json",
    ],
    negativeControlRefs: ["fixtures/textpack/invalid/missing-license.json"],
    comparatorRefs: [],
    corpusRefs: [],
  },
  "nlp-pos-morph-lemma": {
    implementationOwners: ["@ismail-elkorchi/textrules", "@ismail-elkorchi/textdoc", "@ismail-elkorchi/textpack"],
    implementationRefs: ["packages/textrules/src/index.ts", "packages/textpack/src/index.ts"],
    fixtureRefs: ["fixtures/pos-morph-lemma/slices.json"],
    negativeControlRefs: ["fixtures/pos-morph-lemma/expected/en-unknown-word.json"],
    comparatorRefs: ["fixtures/pos-morph-lemma/comparisons/spacy-3.8.14.json", "fixtures/pos-morph-lemma/comparisons/stanza-1.12.0.json"],
    corpusRefs: [
      "fixtures/pos-morph-lemma/corpus/ud-style-slice-corpus.v1.json",
      "fixtures/pos-morph-lemma/corpus/ud-style-slice-report.v1.json",
    ],
  },
  "nlp-rule-backed-ner": {
    implementationOwners: ["@ismail-elkorchi/textrules", "@ismail-elkorchi/textpack", "@ismail-elkorchi/textdoc"],
    implementationRefs: ["packages/textrules/src/index.ts", "packages/textpack/src/index.ts"],
    fixtureRefs: ["fixtures/rule-backed-ner/slices.json"],
    negativeControlRefs: [
      "fixtures/rule-backed-ner/expected/capitalization-apple-false-match.json",
      "fixtures/rule-backed-ner/expected/negative-lowercase-aliases.json",
    ],
    comparatorRefs: [
      "fixtures/rule-backed-ner/comparisons/compromise-14.15.0.json",
      "fixtures/rule-backed-ner/comparisons/spacy-3.8.14.json",
    ],
    corpusRefs: ["fixtures/rule-backed-ner/slices.json"],
  },
  "nlp-corpus-tfidf-bm25": {
    implementationOwners: ["@ismail-elkorchi/textcorpus"],
    implementationRefs: ["packages/textcorpus/src/index.ts"],
    fixtureRefs: [
      "fixtures/corpus-tfidf-bm25/slices.json",
      "fixtures/corpus-tfidf-bm25/expected/corpus-tfidf-bm25-smoke.json",
      "fixtures/corpus-tfidf-bm25/expected/corpus-tfidf-bm25-thresholds.json",
      "fixtures/corpus-tfidf-bm25/expected/corpus-tfidf-bm25-public-domain-holdout.json",
    ],
    negativeControlRefs: ["fixtures/corpus-tfidf-bm25/expected/corpus-tfidf-bm25-smoke.json"],
    comparatorRefs: [
      "fixtures/corpus-tfidf-bm25/comparisons/natural-8.1.1.json",
      "fixtures/corpus-tfidf-bm25/comparisons/scikit-learn-1.8.0-rank-bm25-0.2.2.json",
      "fixtures/corpus-tfidf-bm25/comparisons/scikit-learn-1.8.0-rank-bm25-0.2.2-thresholds.json",
      "fixtures/corpus-tfidf-bm25/comparisons/natural-8.1.1-public-domain-holdout.json",
    ],
    corpusRefs: [
      "fixtures/corpus-tfidf-bm25/expected/corpus-tfidf-bm25-thresholds.json",
      "fixtures/corpus-tfidf-bm25/expected/corpus-tfidf-bm25-public-domain-holdout.json",
    ],
  },
  "nlp-retrieval": {
    implementationOwners: ["@ismail-elkorchi/textcorpus"],
    implementationRefs: ["packages/textcorpus/src/index.ts"],
    fixtureRefs: [
      "fixtures/retrieval/slices.json",
      "fixtures/retrieval/expected/retrieval-fielded-bm25f.json",
      "fixtures/retrieval/qrels/retrieval-fielded-qrels.json",
      "fixtures/retrieval/evaluation/retrieval-fielded-evaluation.json",
      "fixtures/retrieval/expected/retrieval-licensed-news-bm25f.json",
      "fixtures/retrieval/qrels/retrieval-licensed-news-qrels.json",
      "fixtures/retrieval/evaluation/retrieval-licensed-news-evaluation.json",
    ],
    negativeControlRefs: ["fixtures/retrieval/expected/retrieval-smoke.json", "fixtures/retrieval/expected/retrieval-licensed-news-bm25f.json"],
    comparatorRefs: [],
    corpusRefs: [
      "fixtures/retrieval/expected/retrieval-smoke.json",
      "fixtures/retrieval/expected/retrieval-fielded-bm25f.json",
      "fixtures/retrieval/qrels/retrieval-fielded-qrels.json",
      "fixtures/retrieval/expected/retrieval-licensed-news-bm25f.json",
      "fixtures/retrieval/qrels/retrieval-licensed-news-qrels.json",
      "fixtures/retrieval/evaluation/retrieval-licensed-news-evaluation.json",
    ],
  },
  "nlp-conllu-dependency-roundtrip": {
    implementationOwners: ["@ismail-elkorchi/textdoc"],
    implementationRefs: ["packages/textdoc/src/index.ts"],
    fixtureRefs: ["fixtures/conllu-dependency/slices.json"],
    negativeControlRefs: ["fixtures/conllu-dependency/invalid/dangling-head.conllu"],
    comparatorRefs: ["fixtures/conllu-dependency/validation/universal-dependencies-tools-ee98e50.json"],
    corpusRefs: [],
  },
  "nlp-dependency-parser": {
    implementationOwners: ["@ismail-elkorchi/textrules", "@ismail-elkorchi/textdoc"],
    implementationRefs: ["packages/textrules/src/index.ts", "packages/textdoc/src/index.ts"],
    fixtureRefs: ["fixtures/dependency-parser/slices.json"],
    negativeControlRefs: ["fixtures/dependency-parser/slices.json"],
    comparatorRefs: [
      "fixtures/dependency-parser/comparisons/spacy-3.8.json",
      "fixtures/dependency-parser/comparisons/stanza-1.12.json",
      "fixtures/dependency-parser/comparisons/ud-validator-ee98e50.json",
    ],
    corpusRefs: [],
  },
  "nlp-relation-extraction": {
    implementationOwners: ["@ismail-elkorchi/textrules", "@ismail-elkorchi/textdoc"],
    implementationRefs: ["packages/textrules/src/index.ts", "packages/textdoc/src/index.ts"],
    fixtureRefs: ["fixtures/relation-extraction/slices.json"],
    negativeControlRefs: ["fixtures/relation-extraction/expected/en-no-relation.json"],
    comparatorRefs: [],
    corpusRefs: ["fixtures/relation-extraction/slices.json"],
  },
  "nlp-coreference": {
    implementationOwners: ["@ismail-elkorchi/textrules", "@ismail-elkorchi/textdoc"],
    implementationRefs: ["packages/textrules/src/index.ts", "packages/textdoc/src/index.ts"],
    fixtureRefs: ["fixtures/coreference/slices.json"],
    negativeControlRefs: ["fixtures/coreference/expected/en-ambiguous.json"],
    comparatorRefs: [],
    corpusRefs: ["fixtures/coreference/slices.json"],
  },
};

function expect(condition, message, details) {
  if (condition) return;
  console.error(message);
  if (details !== undefined) console.error(JSON.stringify(details, null, 2));
  process.exit(1);
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(ROOT, relativePath), "utf8"));
}

async function fileExists(relativePath) {
  try {
    await access(path.join(ROOT, relativePath));
    return true;
  } catch {
    return false;
  }
}

function assertRepositoryRef(ref, label) {
  expect(!path.isAbsolute(ref), `${label} must be repository-relative: ${ref}`);
  expect(!ref.includes(".."), `${label} must not traverse outside the repository: ${ref}`);
  expect(!ref.includes("\\"), `${label} must use forward slashes: ${ref}`);
  expect(!/^https?:\/\//.test(ref), `${label} must reference a committed repository artifact: ${ref}`);
}

function collectTextValues(value, output = []) {
  if (typeof value === "string") {
    output.push(value);
    return output;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectTextValues(item, output);
    return output;
  }
  if (value !== null && typeof value === "object") {
    for (const item of Object.values(value)) collectTextValues(item, output);
  }
  return output;
}

function termPattern(term) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\ /g, "\\s+");
  return new RegExp(`(^|[^a-z0-9-])${escaped}([^a-z0-9-]|$)`, "iu");
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

function assertSameStringArray(actual, expected, label) {
  expect(
    stableStringify(actual) === stableStringify(expected),
    `${label} mismatch`,
    { expected, actual },
  );
}

const [schema, scorecard, supportStatus, taskEvidencePolicy] = await Promise.all([
  readJson(SCORECARD_SCHEMA_PATH),
  readJson(SCORECARD_PATH),
  readJson(SUPPORT_STATUS_PATH),
  readJson(TASK_EVIDENCE_POLICY_PATH),
]);

const ajv = new Ajv({ allErrors: true, strict: false });
const validate = ajv.compile(schema);
expect(validate(scorecard), `${SCORECARD_PATH} failed ${SCORECARD_SCHEMA_PATH}`, validate.errors);

const supportGrades = new Set(scorecard.supportGradeOrder);
for (const required of ["scaffold", "readiness-only", "slice-proven", "alpha", "beta", "production-candidate"]) {
  expect(supportGrades.has(required), `scorecard supportGradeOrder is missing ${required}`);
}

const languageTierIds = new Set(scorecard.languageTiers.map((tier) => tier.id));
expect(languageTierIds.size === scorecard.languageTiers.length, "language tier ids must be unique");
const taskEvidenceTierIds = scorecard.taskEvidenceTiers.map((tier) => tier.id);
expect(
  stableStringify(taskEvidenceTierIds) === stableStringify(REQUIRED_TASK_EVIDENCE_TIERS),
  "scorecard taskEvidenceTiers must follow the canonical task evidence tier order",
  { expected: REQUIRED_TASK_EVIDENCE_TIERS, actual: taskEvidenceTierIds },
);

const axisIds = new Set(scorecard.axes.map((axis) => axis.id));
expect(axisIds.size === scorecard.axes.length, "scorecard axis ids must be unique");
for (const requiredAxis of REQUIRED_AXES) {
  expect(axisIds.has(requiredAxis), `scorecard missing required axis ${requiredAxis}`);
}

const blockedPatterns = BLOCKED_PUBLIC_CLAIM_TERMS.map((term) => [term, termPattern(term)]);
for (const text of collectTextValues(scorecard)) {
  for (const [term, pattern] of blockedPatterns) {
    expect(!pattern.test(text), `${SCORECARD_PATH} contains blocked public claim term "${term}" in: ${text}`);
  }
}

const supportPackages = new Map(supportStatus.packages.map((entry) => [entry.name, entry.status]));
const supportTasks = new Map(supportStatus.tasks.map((entry) => [entry.id, entry.status]));
const taskEvidence = new Map(
  supportStatus.tasks.map((entry) => [
    entry.id,
    {
      evidence: entry.evidence,
      claimBoundary: entry.scope,
      evidenceTier: entry.evidenceTier,
      nextEvidenceTierBlockers: entry.nextEvidenceTierBlockers,
    },
  ]),
);
const taskEvidencePolicyById = new Map(taskEvidencePolicy.taskPolicies.map((entry) => [entry.taskId, entry]));

expect(
  new Set(scorecard.packageRows.map((row) => row.packageName)).size === scorecard.packageRows.length,
  "scorecard package rows must be unique",
);
expect(
  new Set(scorecard.taskRows.map((row) => row.taskId)).size === scorecard.taskRows.length,
  "scorecard task rows must be unique",
);

for (const row of scorecard.packageRows) {
  expect(supportPackages.has(row.packageName), `scorecard package is absent from support status: ${row.packageName}`);
  expect(
    supportPackages.get(row.packageName) === row.supportStatus,
    `scorecard package status mismatch for ${row.packageName}: ${row.supportStatus} != ${supportPackages.get(row.packageName)}`,
  );
  for (const ref of row.evidenceRefs) {
    assertRepositoryRef(ref, `${row.packageName} evidenceRefs`);
    expect(await fileExists(ref), `${row.packageName} evidence ref does not exist: ${ref}`);
  }
}

for (const packageName of supportPackages.keys()) {
  expect(
    scorecard.packageRows.some((row) => row.packageName === packageName),
    `support-status package missing from scorecard: ${packageName}`,
  );
}

for (const row of scorecard.taskRows) {
  const expected = TASK_EVIDENCE_REQUIREMENTS[row.taskId];
  expect(expected !== undefined, `scorecard task has no evidence requirement profile: ${row.taskId}`);
  expect(supportTasks.has(row.taskId), `scorecard task is absent from support status: ${row.taskId}`);
  const policy = taskEvidencePolicyById.get(row.taskId);
  expect(policy !== undefined, `scorecard task is absent from task evidence-tier policy: ${row.taskId}`);
  expect(
    supportTasks.get(row.taskId) === row.supportStatus,
    `scorecard task status mismatch for ${row.taskId}: ${row.supportStatus} != ${supportTasks.get(row.taskId)}`,
  );
  expect(row.evidenceTier === policy.evidenceTier, `${row.taskId} evidenceTier mismatch with task evidence-tier policy.`);
  expect(row.evidenceTier === taskEvidence.get(row.taskId)?.evidenceTier, `${row.taskId} evidenceTier mismatch with support status.`);
  expect(
    stableStringify(row.fixtureSplitRefs) === stableStringify(policy.fixtureSplits),
    `${row.taskId} fixtureSplitRefs mismatch with task evidence-tier policy.`,
  );
  expect(
    stableStringify(row.nextEvidenceTierBlockers) === stableStringify(policy.nextTierBlockers),
    `${row.taskId} nextEvidenceTierBlockers mismatch with task evidence-tier policy.`,
  );
  expect(languageTierIds.has(row.languageTier), `scorecard task ${row.taskId} has unknown language tier ${row.languageTier}`);
  assertSameStringArray(row.implementation.packageOwners, expected.implementationOwners, `${row.taskId} implementation packageOwners`);
  assertSameStringArray(row.evidenceProfile.implementationRefs, expected.implementationRefs, `${row.taskId} implementationRefs`);
  assertSameStringArray(row.evidenceProfile.fixtureRefs, expected.fixtureRefs, `${row.taskId} fixtureRefs`);
  assertSameStringArray(row.evidenceProfile.negativeControlRefs, expected.negativeControlRefs, `${row.taskId} negativeControlRefs`);
  assertSameStringArray(row.evidenceProfile.comparatorRefs, expected.comparatorRefs, `${row.taskId} comparatorRefs`);
  assertSameStringArray(row.evidenceProfile.corpusRefs, expected.corpusRefs, `${row.taskId} corpusRefs`);
  assertSameStringArray(
    row.evidenceProfile.conformanceReportRefs,
    [`fixtures/reports/${row.taskId}/conformance-report.json`],
    `${row.taskId} conformanceReportRefs`,
  );
  assertSameStringArray(
    row.evidenceProfile.performanceBudgetRefs,
    [PERFORMANCE_BUDGET_PATH],
    `${row.taskId} performanceBudgetRefs`,
  );
  expect(row.claimBoundary === taskEvidence.get(row.taskId)?.claimBoundary, `${row.taskId} claimBoundary must match support-status scope.`);
  if (row.languageTier === "comparator-backed") {
    expect(row.evidenceProfile.comparatorRefs.length > 0, `${row.taskId} comparator-backed tier requires comparatorRefs.`);
  }
  if (row.languageTier === "corpus-backed") {
    expect(row.evidenceProfile.corpusRefs.length > 0, `${row.taskId} corpus-backed tier requires corpusRefs.`);
  }
  if (row.evidenceTier === "comparator-backed") {
    expect(row.fixtureSplitRefs.externalComparators.length > 0, `${row.taskId} comparator-backed evidence tier requires externalComparators.`);
  }
  if (["corpus-backed", "broad-multilingual", "release-stable"].includes(row.evidenceTier)) {
    expect(row.fixtureSplitRefs.corpusEvidence.length > 0, `${row.taskId} ${row.evidenceTier} evidence tier requires corpusEvidence.`);
  }
  for (const ref of row.evidenceRefs) {
    assertRepositoryRef(ref, `${row.taskId} evidenceRefs`);
    expect(await fileExists(ref), `${row.taskId} evidence ref does not exist: ${ref}`);
  }
  for (const [field, refs] of Object.entries(row.evidenceProfile)) {
    for (const ref of refs) {
      assertRepositoryRef(ref, `${row.taskId} ${field}`);
      expect(await fileExists(ref), `${row.taskId} ${field} ref does not exist: ${ref}`);
    }
  }
  for (const [field, refs] of Object.entries(row.fixtureSplitRefs)) {
    for (const ref of refs) {
      assertRepositoryRef(ref, `${row.taskId} fixtureSplitRefs.${field}`);
      expect(await fileExists(ref), `${row.taskId} fixtureSplitRefs.${field} ref does not exist: ${ref}`);
    }
  }
}

for (const taskId of supportTasks.keys()) {
  expect(
    scorecard.taskRows.some((row) => row.taskId === taskId),
    `support-status task missing from scorecard: ${taskId}`,
  );
}

for (const axis of scorecard.axes) {
  for (const ref of axis.evidenceRequired) {
    if (!ref.includes("/") || ref.startsWith("npm run ") || ref === "package tests") continue;
    assertRepositoryRef(ref, `${axis.id} evidenceRequired`);
    expect(await fileExists(ref), `${axis.id} evidence ref does not exist: ${ref}`);
  }
}

for (const gate of scorecard.releaseGates) {
  for (const ref of gate.evidenceRequired) {
    if (!ref.includes("/") || ref.startsWith("npm run ") || ref === "package tests") continue;
    assertRepositoryRef(ref, `${gate.id} evidenceRequired`);
    expect(await fileExists(ref), `${gate.id} evidence ref does not exist: ${ref}`);
  }
}

console.log(
  `Toolkit capability scorecard OK (packages=${scorecard.packageRows.length} tasks=${scorecard.taskRows.length} axes=${scorecard.axes.length}).`,
);
