export const packageName = "@ismail-elkorchi/textconformance" as const;
export const conformanceReportSchemaId =
  "urn:ismail-elkorchi:textconformance:report:v1" as const;
export const conformanceReportSchemaVersion = 1 as const;
export const conformanceReportDiffSchemaVersion = 1 as const;
export const conformanceClaimRegistrySchemaVersion = 1 as const;

export type PackageName = typeof packageName;
export type TextConformanceReportSchemaId = typeof conformanceReportSchemaId;
export type TextConformanceReportSchemaVersion = typeof conformanceReportSchemaVersion;
export type TextConformanceReportDiffSchemaVersion =
  typeof conformanceReportDiffSchemaVersion;
export type TextConformanceClaimRegistrySchemaVersion =
  typeof conformanceClaimRegistrySchemaVersion;

export type TextConformanceCheckStatus = "pass" | "fail" | "not-run";
export type TextConformanceReportDiffStatus = "same" | "changed" | "added" | "removed";
export type TextConformanceClaimSupportLabel =
  | "fixture-proven"
  | "comparator-backed"
  | "corpus-backed"
  | "performance-backed";

export interface TextConformanceReportSubject {
  readonly kind: string;
  readonly id: string;
  readonly schemaId?: string;
}

export interface TextConformanceCheckV1 {
  readonly checkId: string;
  readonly status: TextConformanceCheckStatus;
  readonly message?: string;
  readonly evidenceRefs?: readonly string[];
}

export interface TextConformanceSummaryV1 {
  readonly pass: number;
  readonly fail: number;
  readonly notRun: number;
}

export interface TextConformanceReportV1 {
  readonly schemaId: TextConformanceReportSchemaId;
  readonly schemaVersion: TextConformanceReportSchemaVersion;
  readonly reportId: string;
  readonly subject: TextConformanceReportSubject;
  readonly generatedAt: string;
  readonly summary: TextConformanceSummaryV1;
  readonly checks: readonly TextConformanceCheckV1[];
  readonly notes?: readonly string[];
}

export interface TextConformanceReportDiffEntryV1 {
  readonly checkId: string;
  readonly status: TextConformanceReportDiffStatus;
  readonly expectedStatus?: TextConformanceCheckStatus;
  readonly actualStatus?: TextConformanceCheckStatus;
  readonly expectedMessage?: string;
  readonly actualMessage?: string;
  readonly expectedEvidenceRefs?: readonly string[];
  readonly actualEvidenceRefs?: readonly string[];
}

export interface TextConformanceReportDiffSummaryV1 {
  readonly same: number;
  readonly changed: number;
  readonly added: number;
  readonly removed: number;
}

export interface TextConformanceReportDiffV1 {
  readonly schemaVersion: TextConformanceReportDiffSchemaVersion;
  readonly expectedReportId: string;
  readonly actualReportId: string;
  readonly subjectChanged: boolean;
  readonly summary: TextConformanceReportDiffSummaryV1;
  readonly checks: readonly TextConformanceReportDiffEntryV1[];
}

export interface TextConformanceClaimV1 {
  readonly claimId: string;
  readonly subject: TextConformanceReportSubject;
  readonly supportLabel: TextConformanceClaimSupportLabel;
  readonly requirementRefs: readonly string[];
  readonly apiRefs: readonly string[];
  readonly evidenceRefs: readonly string[];
  readonly reportRefs: readonly string[];
  readonly limitations: readonly string[];
}

export interface TextConformanceClaimRegistryV1 {
  readonly schemaVersion: TextConformanceClaimRegistrySchemaVersion;
  readonly registryId: string;
  readonly claims: readonly TextConformanceClaimV1[];
  readonly notes?: readonly string[];
}

export interface TextConformanceClaimRegistryValidationOptions {
  readonly reportId?: string;
  readonly generatedAt?: string;
  readonly knownReportIds?: readonly string[];
}

export interface TextConformanceRunnerCheck {
  readonly checkId: string;
  readonly evidenceRefs?: readonly string[];
  run(): TextConformanceCheckStatus | TextConformanceCheckV1;
}

export interface TextConformanceRunnerOptions {
  readonly reportId: string;
  readonly subject: TextConformanceReportSubject;
  readonly generatedAt?: string;
  readonly notes?: readonly string[];
}

export interface TextConformanceMarkdownRenderOptions {
  readonly title?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((entry) => isNonEmptyString(entry));
}

function isNonEmptyStringArray(value: unknown): value is readonly string[] {
  return isStringArray(value) && value.length >= 1;
}

function hasUniqueStrings(values: readonly string[]): boolean {
  return new Set(values).size === values.length;
}

function compareCheckIds(left: string, right: string): number {
  return left.localeCompare(right);
}

function checkIdentity(value: TextConformanceCheckV1): string {
  return JSON.stringify({
    status: value.status,
    message: value.message ?? null,
    evidenceRefs: [...(value.evidenceRefs ?? [])].sort(),
  });
}

function markdownText(value: string): string {
  return value.replace(/\r\n|\r|\n/gu, " ").replace(/\s+/gu, " ").trim();
}

function markdownTableCell(value: string | undefined): string {
  if (value === undefined || value.length === 0) return "—";
  return value
    .replace(/\r\n|\r|\n/gu, "<br>")
    .replace(/\\/gu, "\\\\")
    .replace(/\|/gu, "\\|")
    .replace(/\t/gu, " ");
}

function markdownTableList(values: readonly string[] | undefined): string {
  if (values === undefined || values.length === 0) return "—";
  return values.map((value) => markdownTableCell(value)).join("<br>");
}

function sortedChecksForRendering(
  checks: readonly TextConformanceCheckV1[],
): readonly TextConformanceCheckV1[] {
  return [...checks].sort((left, right) => compareCheckIds(left.checkId, right.checkId));
}

function sortedDiffChecksForRendering(
  checks: readonly TextConformanceReportDiffEntryV1[],
): readonly TextConformanceReportDiffEntryV1[] {
  return [...checks].sort((left, right) => compareCheckIds(left.checkId, right.checkId));
}

function mapChecksById(
  report: TextConformanceReportV1,
  label: "expected" | "actual",
): ReadonlyMap<string, TextConformanceCheckV1> {
  const checks = new Map<string, TextConformanceCheckV1>();
  for (const check of report.checks) {
    if (checks.has(check.checkId)) {
      throw new TypeError(`${label} conformance report contains duplicate check id ${check.checkId}`);
    }
    checks.set(check.checkId, check);
  }
  return checks;
}

export function isTextConformanceReportSubject(
  value: unknown,
): value is TextConformanceReportSubject {
  return (
    isRecord(value) &&
    isNonEmptyString(value.kind) &&
    isNonEmptyString(value.id) &&
    (value.schemaId === undefined || isNonEmptyString(value.schemaId))
  );
}

export function isTextConformanceCheckV1(value: unknown): value is TextConformanceCheckV1 {
  return (
    isRecord(value) &&
    isNonEmptyString(value.checkId) &&
    (value.status === "pass" || value.status === "fail" || value.status === "not-run") &&
    (value.message === undefined || isNonEmptyString(value.message)) &&
    (value.evidenceRefs === undefined ||
      (Array.isArray(value.evidenceRefs) &&
        value.evidenceRefs.every((entry) => isNonEmptyString(entry))))
  );
}

export function isTextConformanceSummaryV1(value: unknown): value is TextConformanceSummaryV1 {
  return (
    isRecord(value) &&
    isNonNegativeInteger(value.pass) &&
    isNonNegativeInteger(value.fail) &&
    isNonNegativeInteger(value.notRun)
  );
}

export function isTextConformanceReportDiffSummaryV1(
  value: unknown,
): value is TextConformanceReportDiffSummaryV1 {
  return (
    isRecord(value) &&
    isNonNegativeInteger(value.same) &&
    isNonNegativeInteger(value.changed) &&
    isNonNegativeInteger(value.added) &&
    isNonNegativeInteger(value.removed)
  );
}

export function isTextConformanceReportDiffEntryV1(
  value: unknown,
): value is TextConformanceReportDiffEntryV1 {
  return (
    isRecord(value) &&
    isNonEmptyString(value.checkId) &&
    (value.status === "same" ||
      value.status === "changed" ||
      value.status === "added" ||
      value.status === "removed") &&
    (value.expectedStatus === undefined ||
      value.expectedStatus === "pass" ||
      value.expectedStatus === "fail" ||
      value.expectedStatus === "not-run") &&
    (value.actualStatus === undefined ||
      value.actualStatus === "pass" ||
      value.actualStatus === "fail" ||
      value.actualStatus === "not-run") &&
    (value.expectedMessage === undefined || isNonEmptyString(value.expectedMessage)) &&
    (value.actualMessage === undefined || isNonEmptyString(value.actualMessage)) &&
    (value.expectedEvidenceRefs === undefined || isStringArray(value.expectedEvidenceRefs)) &&
    (value.actualEvidenceRefs === undefined || isStringArray(value.actualEvidenceRefs))
  );
}

export function isTextConformanceReportV1(value: unknown): value is TextConformanceReportV1 {
  return (
    isRecord(value) &&
    value.schemaId === conformanceReportSchemaId &&
    value.schemaVersion === conformanceReportSchemaVersion &&
    isNonEmptyString(value.reportId) &&
    isTextConformanceReportSubject(value.subject) &&
    isNonEmptyString(value.generatedAt) &&
    isTextConformanceSummaryV1(value.summary) &&
    Array.isArray(value.checks) &&
    value.checks.every((entry) => isTextConformanceCheckV1(entry)) &&
    (value.notes === undefined ||
      (Array.isArray(value.notes) && value.notes.every((entry) => isNonEmptyString(entry))))
  );
}

export function isTextConformanceReportDiffV1(
  value: unknown,
): value is TextConformanceReportDiffV1 {
  return (
    isRecord(value) &&
    value.schemaVersion === conformanceReportDiffSchemaVersion &&
    isNonEmptyString(value.expectedReportId) &&
    isNonEmptyString(value.actualReportId) &&
    typeof value.subjectChanged === "boolean" &&
    isTextConformanceReportDiffSummaryV1(value.summary) &&
    Array.isArray(value.checks) &&
    value.checks.every((entry) => isTextConformanceReportDiffEntryV1(entry))
  );
}

export function isTextConformanceClaimSupportLabel(
  value: unknown,
): value is TextConformanceClaimSupportLabel {
  return (
    value === "fixture-proven" ||
    value === "comparator-backed" ||
    value === "corpus-backed" ||
    value === "performance-backed"
  );
}

export function isTextConformanceClaimV1(value: unknown): value is TextConformanceClaimV1 {
  return (
    isRecord(value) &&
    isNonEmptyString(value.claimId) &&
    isTextConformanceReportSubject(value.subject) &&
    isTextConformanceClaimSupportLabel(value.supportLabel) &&
    isNonEmptyStringArray(value.requirementRefs) &&
    isNonEmptyStringArray(value.apiRefs) &&
    isNonEmptyStringArray(value.evidenceRefs) &&
    isNonEmptyStringArray(value.reportRefs) &&
    isNonEmptyStringArray(value.limitations)
  );
}

export function isTextConformanceClaimRegistryV1(
  value: unknown,
): value is TextConformanceClaimRegistryV1 {
  return (
    isRecord(value) &&
    value.schemaVersion === conformanceClaimRegistrySchemaVersion &&
    isNonEmptyString(value.registryId) &&
    Array.isArray(value.claims) &&
    value.claims.length >= 1 &&
    value.claims.every((entry) => isTextConformanceClaimV1(entry)) &&
    hasUniqueStrings(value.claims.map((entry) => entry.claimId)) &&
    (value.notes === undefined || isStringArray(value.notes))
  );
}

function summarizeChecks(checks: readonly TextConformanceCheckV1[]): TextConformanceSummaryV1 {
  let pass = 0;
  let fail = 0;
  let notRun = 0;
  for (const check of checks) {
    if (check.status === "pass") pass += 1;
    if (check.status === "fail") fail += 1;
    if (check.status === "not-run") notRun += 1;
  }
  return { pass, fail, notRun };
}

function normalizeRunnerCheckResult(
  check: TextConformanceRunnerCheck,
  result: TextConformanceCheckStatus | TextConformanceCheckV1,
): TextConformanceCheckV1 {
  if (typeof result === "string") {
    return {
      checkId: check.checkId,
      status: result,
      ...(check.evidenceRefs ? { evidenceRefs: check.evidenceRefs } : {}),
    };
  }

  return {
    ...result,
    checkId: result.checkId || check.checkId,
    ...(result.evidenceRefs ?? check.evidenceRefs
      ? { evidenceRefs: result.evidenceRefs ?? check.evidenceRefs }
      : {}),
  };
}

export function runTextConformanceChecks(
  checks: readonly TextConformanceRunnerCheck[],
  options: TextConformanceRunnerOptions,
): TextConformanceReportV1 {
  const normalizedChecks = checks.map((check) => {
    if (!isNonEmptyString(check.checkId)) {
      throw new TypeError("conformance check id must be a non-empty string");
    }
    if (typeof check.run !== "function") {
      throw new TypeError(`conformance check ${check.checkId} must expose a run function`);
    }
    const result = normalizeRunnerCheckResult(check, check.run());
    if (!isTextConformanceCheckV1(result)) {
      throw new TypeError(`conformance check ${check.checkId} returned an invalid check result`);
    }
    return result;
  });

  const report: TextConformanceReportV1 = {
    schemaId: conformanceReportSchemaId,
    schemaVersion: conformanceReportSchemaVersion,
    reportId: options.reportId,
    subject: options.subject,
    generatedAt: options.generatedAt ?? "1970-01-01T00:00:00.000Z",
    summary: summarizeChecks(normalizedChecks),
    checks: normalizedChecks,
    ...(options.notes ? { notes: options.notes } : {}),
  };

  if (!isTextConformanceReportV1(report)) {
    throw new TypeError("conformance runner produced an invalid report");
  }
  return report;
}

export function diffTextConformanceReports(
  expected: TextConformanceReportV1,
  actual: TextConformanceReportV1,
): TextConformanceReportDiffV1 {
  if (!isTextConformanceReportV1(expected)) {
    throw new TypeError("expected conformance report is invalid");
  }
  if (!isTextConformanceReportV1(actual)) {
    throw new TypeError("actual conformance report is invalid");
  }

  const expectedById = mapChecksById(expected, "expected");
  const actualById = mapChecksById(actual, "actual");
  const checkIds = [...new Set([...expectedById.keys(), ...actualById.keys()])].sort(compareCheckIds);
  const checks: TextConformanceReportDiffEntryV1[] = [];
  for (const checkId of checkIds) {
    const expectedCheck = expectedById.get(checkId);
    const actualCheck = actualById.get(checkId);
    if (expectedCheck === undefined && actualCheck !== undefined) {
      checks.push({
        checkId,
        status: "added",
        actualStatus: actualCheck.status,
        ...(actualCheck.message ? { actualMessage: actualCheck.message } : {}),
        ...(actualCheck.evidenceRefs ? { actualEvidenceRefs: actualCheck.evidenceRefs } : {}),
      });
      continue;
    }
    if (expectedCheck !== undefined && actualCheck === undefined) {
      checks.push({
        checkId,
        status: "removed",
        expectedStatus: expectedCheck.status,
        ...(expectedCheck.message ? { expectedMessage: expectedCheck.message } : {}),
        ...(expectedCheck.evidenceRefs ? { expectedEvidenceRefs: expectedCheck.evidenceRefs } : {}),
      });
      continue;
    }
    if (expectedCheck === undefined || actualCheck === undefined) continue;
    const same = checkIdentity(expectedCheck) === checkIdentity(actualCheck);
    checks.push({
      checkId,
      status: same ? "same" : "changed",
      expectedStatus: expectedCheck.status,
      actualStatus: actualCheck.status,
      ...(expectedCheck.message ? { expectedMessage: expectedCheck.message } : {}),
      ...(actualCheck.message ? { actualMessage: actualCheck.message } : {}),
      ...(expectedCheck.evidenceRefs ? { expectedEvidenceRefs: expectedCheck.evidenceRefs } : {}),
      ...(actualCheck.evidenceRefs ? { actualEvidenceRefs: actualCheck.evidenceRefs } : {}),
    });
  }

  const summary: TextConformanceReportDiffSummaryV1 = {
    same: checks.filter((entry) => entry.status === "same").length,
    changed: checks.filter((entry) => entry.status === "changed").length,
    added: checks.filter((entry) => entry.status === "added").length,
    removed: checks.filter((entry) => entry.status === "removed").length,
  };
  const diff = {
    schemaVersion: conformanceReportDiffSchemaVersion,
    expectedReportId: expected.reportId,
    actualReportId: actual.reportId,
    subjectChanged: JSON.stringify(expected.subject) !== JSON.stringify(actual.subject),
    summary,
    checks,
  };
  if (!isTextConformanceReportDiffV1(diff)) {
    throw new TypeError("conformance report diff is invalid");
  }
  return diff;
}

export function validateTextConformanceClaimRegistry(
  registry: TextConformanceClaimRegistryV1,
  options: TextConformanceClaimRegistryValidationOptions = {},
): TextConformanceReportV1 {
  const knownReportIds = new Set(options.knownReportIds ?? []);
  return runTextConformanceChecks(
    [
      {
        checkId: "claim-registry-runtime-guard",
        run: () => (isTextConformanceClaimRegistryV1(registry) ? "pass" : "fail"),
      },
      ...registry.claims.map((claim) => ({
        checkId: `claim-trace:${claim.claimId}`,
        evidenceRefs: claim.evidenceRefs,
        run: () => {
          const missingReportRefs = claim.reportRefs.filter((reportRef) => !knownReportIds.has(reportRef));
          const status: TextConformanceCheckStatus = missingReportRefs.length === 0 ? "pass" : "fail";
          return {
            checkId: `claim-trace:${claim.claimId}`,
            status,
            ...(missingReportRefs.length > 0
              ? { message: `Missing report refs: ${missingReportRefs.join(", ")}` }
              : {}),
            evidenceRefs: [...claim.evidenceRefs, ...claim.reportRefs].sort(),
          };
        },
      })),
    ],
    {
      reportId: options.reportId ?? `claim-registry:${registry.registryId}`,
      subject: {
        kind: "claim-registry",
        id: registry.registryId,
      },
      ...(options.generatedAt ? { generatedAt: options.generatedAt } : {}),
      ...(registry.notes ? { notes: registry.notes } : {}),
    },
  );
}

export function renderTextConformanceReportMarkdown(
  report: TextConformanceReportV1,
  options: TextConformanceMarkdownRenderOptions = {},
): string {
  if (!isTextConformanceReportV1(report)) {
    throw new TypeError("conformance report is invalid");
  }

  const title = options.title ?? `Conformance report ${report.reportId}`;
  const lines = [
    `# ${markdownText(title)}`,
    "",
    `- **Report id:** ${markdownTableCell(report.reportId)}`,
    `- **Subject:** ${markdownTableCell(`${report.subject.kind}:${report.subject.id}`)}`,
    `- **Generated at:** ${markdownTableCell(report.generatedAt)}`,
    `- **Summary:** pass=${report.summary.pass}; fail=${report.summary.fail}; not-run=${report.summary.notRun}`,
    "",
    "## Checks",
    "",
    "| Check | Status | Message | Evidence |",
    "| --- | --- | --- | --- |",
    ...sortedChecksForRendering(report.checks).map(
      (check) =>
        `| ${markdownTableCell(check.checkId)} | ${check.status} | ${markdownTableCell(check.message)} | ${markdownTableList(check.evidenceRefs)} |`,
    ),
  ];

  if (report.notes !== undefined && report.notes.length > 0) {
    lines.push("", "## Notes", "", ...report.notes.map((note) => `- ${markdownText(note)}`));
  }

  return `${lines.join("\n")}\n`;
}

export function renderTextConformanceReportDiffMarkdown(
  diff: TextConformanceReportDiffV1,
  options: TextConformanceMarkdownRenderOptions = {},
): string {
  if (!isTextConformanceReportDiffV1(diff)) {
    throw new TypeError("conformance report diff is invalid");
  }

  const title = options.title ?? `Conformance report diff ${diff.expectedReportId} to ${diff.actualReportId}`;
  const lines = [
    `# ${markdownText(title)}`,
    "",
    `- **Expected report:** ${markdownTableCell(diff.expectedReportId)}`,
    `- **Actual report:** ${markdownTableCell(diff.actualReportId)}`,
    `- **Subject changed:** ${diff.subjectChanged ? "yes" : "no"}`,
    `- **Summary:** same=${diff.summary.same}; changed=${diff.summary.changed}; added=${diff.summary.added}; removed=${diff.summary.removed}`,
    "",
    "## Check diff",
    "",
    "| Check | Diff status | Expected | Actual | Message | Evidence |",
    "| --- | --- | --- | --- | --- | --- |",
    ...sortedDiffChecksForRendering(diff.checks).map((check) => {
      const expected = check.expectedStatus ?? "—";
      const actual = check.actualStatus ?? "—";
      const message =
        check.expectedMessage === check.actualMessage
          ? markdownTableCell(check.actualMessage)
          : `${markdownTableCell(check.expectedMessage)} → ${markdownTableCell(check.actualMessage)}`;
      const evidence =
        JSON.stringify(check.expectedEvidenceRefs ?? []) === JSON.stringify(check.actualEvidenceRefs ?? [])
          ? markdownTableList(check.actualEvidenceRefs)
          : `${markdownTableList(check.expectedEvidenceRefs)} → ${markdownTableList(check.actualEvidenceRefs)}`;
      return `| ${markdownTableCell(check.checkId)} | ${check.status} | ${expected} | ${actual} | ${message} | ${evidence} |`;
    }),
  ];

  return `${lines.join("\n")}\n`;
}
