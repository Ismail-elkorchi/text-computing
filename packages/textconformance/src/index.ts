export const packageName = "@ismail-elkorchi/textconformance" as const;
export const conformanceReportSchemaId =
  "urn:ismail-elkorchi:textconformance:report:v1" as const;
export const conformanceReportSchemaVersion = 1 as const;
export const conformanceReportDiffSchemaVersion = 1 as const;
export const conformanceCapabilityRegistrySchemaVersion = 1 as const;
export const conformanceSuiteSchemaId =
  "urn:ismail-elkorchi:textconformance:suite:v1" as const;
export const conformanceSuiteSchemaVersion = 1 as const;
export const conformanceBenchmarkReportSchemaId =
  "urn:ismail-elkorchi:textconformance:benchmark-report:v1" as const;
export const conformanceBenchmarkReportSchemaVersion = 1 as const;

export type PackageName = typeof packageName;
export type TextConformanceReportSchemaId = typeof conformanceReportSchemaId;
export type TextConformanceReportSchemaVersion = typeof conformanceReportSchemaVersion;
export type TextConformanceReportDiffSchemaVersion =
  typeof conformanceReportDiffSchemaVersion;
export type TextConformanceCapabilityRegistrySchemaVersion =
  typeof conformanceCapabilityRegistrySchemaVersion;
export type TextConformanceSuiteSchemaId = typeof conformanceSuiteSchemaId;
export type TextConformanceSuiteSchemaVersion = typeof conformanceSuiteSchemaVersion;
export type TextConformanceBenchmarkReportSchemaId =
  typeof conformanceBenchmarkReportSchemaId;
export type TextConformanceBenchmarkReportSchemaVersion =
  typeof conformanceBenchmarkReportSchemaVersion;

export type TextConformanceCheckStatus = "pass" | "fail" | "not-run";
export type TextConformanceReportDiffStatus = "same" | "changed" | "added" | "removed";
export type TextConformanceCapabilitySupportLevel =
  | "fixture-validated"
  | "corpus-backed"
  | "performance-backed";
export type TextConformanceSuiteClass =
  | "spec"
  | "profile"
  | "pack"
  | "interchange"
  | "workflow"
  | "benchmark";
export type TextConformanceFixtureRole =
  | "development"
  | "validation"
  | "holdout"
  | "negative-control"
  | "scope-narrowed-gap";
export type TextConformanceOracleKind =
  | "exact"
  | "schema"
  | "runtime-guard"
  | "round-trip"
  | "differential"
  | "benchmark";
export type TextConformanceSuiteTargetKind =
  | "package-fixture"
  | "external-consumer-project"
  | "generated-package-artifact";

export interface TextConformanceReportSubject {
  readonly kind: string;
  readonly id: string;
  readonly schemaId?: string;
  readonly version?: string;
}

export interface TextConformanceTraceabilityV1 {
  readonly requirementRefs: readonly string[];
  readonly apiRefs: readonly string[];
  readonly inputRefs: readonly string[];
  readonly oracleRefs: readonly string[];
  readonly reportRefs?: readonly string[];
  readonly limitations: readonly string[];
}

export interface TextConformanceCheckV1 {
  readonly checkId: string;
  readonly status: TextConformanceCheckStatus;
  readonly message?: string;
  readonly evidenceRefs?: readonly string[];
  readonly traceability?: TextConformanceTraceabilityV1;
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
  readonly suite?: {
    readonly suiteId: string;
    readonly suiteVersion: string;
    readonly suiteClass: TextConformanceSuiteClass;
  };
  readonly notes?: readonly string[];
}

export interface TextConformanceFixtureRefV1 {
  readonly role: TextConformanceFixtureRole;
  readonly ref: string;
  readonly description?: string;
}

export interface TextConformanceOracleRefV1 {
  readonly oracleId: string;
  readonly kind: TextConformanceOracleKind;
  readonly ref?: string;
}

export interface TextConformanceSuiteTargetV1 {
  readonly targetId: string;
  readonly kind: TextConformanceSuiteTargetKind;
  readonly ref: string;
  readonly required?: boolean;
  readonly description?: string;
}

export interface TextConformanceSuiteCheckV1 {
  readonly checkId: string;
  readonly oracleId: string;
  readonly expectedStatus?: TextConformanceCheckStatus;
  readonly message?: string;
  readonly evidenceRefs?: readonly string[];
  readonly traceability?: TextConformanceTraceabilityV1;
}

export interface TextConformanceSuiteV1 {
  readonly schemaId: TextConformanceSuiteSchemaId;
  readonly schemaVersion: TextConformanceSuiteSchemaVersion;
  readonly suiteId: string;
  readonly suiteVersion: string;
  readonly suiteClass: TextConformanceSuiteClass;
  readonly subject: TextConformanceReportSubject;
  readonly scopeBoundary: string;
  readonly fixtures: readonly TextConformanceFixtureRefV1[];
  readonly oracles: readonly TextConformanceOracleRefV1[];
  readonly targets?: readonly TextConformanceSuiteTargetV1[];
  readonly checks: readonly TextConformanceSuiteCheckV1[];
  readonly limitations: readonly string[];
  readonly notes?: readonly string[];
}

export interface TextConformanceFixturePolicyOptions {
  readonly requireHoldout?: boolean;
  readonly requireNegativeControl?: boolean;
  readonly disallowDevelopmentOnly?: boolean;
}

export interface TextConformanceSuiteRunnerOptions {
  readonly reportId?: string;
  readonly generatedAt?: string;
  readonly fixturePolicy?: TextConformanceFixturePolicyOptions;
}

export interface TextConformanceSuiteTargetProbeV1 {
  readonly targetId: string;
  readonly kind: TextConformanceSuiteTargetKind;
  readonly ref: string;
  readonly status: TextConformanceCheckStatus;
  readonly message?: string;
  readonly evidenceRefs?: readonly string[];
}

export interface TextConformanceSuiteTargetCheckOptions {
  readonly requireDeclaredTargets?: boolean;
}

export interface TextConformanceSuiteTargetRunnerOptions
  extends TextConformanceSuiteRunnerOptions,
    TextConformanceSuiteTargetCheckOptions {
  readonly targets?: readonly TextConformanceSuiteTargetProbeV1[];
}

export interface TextConformanceDifferentialOracleInput {
  readonly oracleId: string;
  readonly expected: unknown;
  readonly actual: unknown;
  readonly allowedDifferencePaths?: readonly string[];
  readonly evidenceRefs?: readonly string[];
  readonly message?: string;
}

export interface TextConformanceBenchmarkMetricV1 {
  readonly metricId: string;
  readonly value: number;
  readonly unit: string;
  readonly higherIsPreferred?: boolean;
}

export interface TextConformanceBenchmarkReportV1 {
  readonly schemaId: TextConformanceBenchmarkReportSchemaId;
  readonly schemaVersion: TextConformanceBenchmarkReportSchemaVersion;
  readonly benchmarkId: string;
  readonly subject: TextConformanceReportSubject;
  readonly generatedAt: string;
  readonly metrics: readonly TextConformanceBenchmarkMetricV1[];
  readonly evidenceRefs: readonly string[];
  readonly limitations: readonly string[];
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

export interface TextConformanceCapabilityStatementV1 {
  readonly statementId: string;
  readonly subject: TextConformanceReportSubject;
  readonly supportLevel: TextConformanceCapabilitySupportLevel;
  readonly requirementRefs: readonly string[];
  readonly apiRefs: readonly string[];
  readonly inputRefs: readonly string[];
  readonly oracleRefs: readonly string[];
  readonly evidenceRefs: readonly string[];
  readonly reportRefs: readonly string[];
  readonly limitations: readonly string[];
}

export interface TextConformanceCapabilityRegistryV1 {
  readonly schemaVersion: TextConformanceCapabilityRegistrySchemaVersion;
  readonly registryId: string;
  readonly statements: readonly TextConformanceCapabilityStatementV1[];
  readonly notes?: readonly string[];
}

export interface TextConformanceCapabilityRegistryValidationOptions {
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

function hasRole(
  fixtures: readonly TextConformanceFixtureRefV1[],
  role: TextConformanceFixtureRole,
): boolean {
  return fixtures.some((fixture) => fixture.role === role);
}

function compareCheckIds(left: string, right: string): number {
  return left.localeCompare(right);
}

function compareTargetIds(
  left: TextConformanceSuiteTargetV1,
  right: TextConformanceSuiteTargetV1,
): number {
  return left.targetId.localeCompare(right.targetId);
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

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((entry) => canonicalJson(entry)).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
    .join(",")}}`;
}

function withoutAllowedDifferencePaths(value: unknown, paths: readonly string[]): unknown {
  if (paths.length === 0) return value;
  const blocked = new Set(paths);
  const visit = (entry: unknown, path: string): unknown => {
    if (blocked.has(path)) return undefined;
    if (entry === null || typeof entry !== "object") return entry;
    if (Array.isArray(entry)) {
      return entry
        .map((item, index) => visit(item, `${path}[${index}]`))
        .filter((item) => item !== undefined);
    }
    const output: Record<string, unknown> = {};
    for (const key of Object.keys(entry).sort()) {
      const childPath = path === "$" ? `$.${key}` : `${path}.${key}`;
      const child = visit((entry as Record<string, unknown>)[key], childPath);
      if (child !== undefined) output[key] = child;
    }
    return output;
  };
  return visit(value, "$");
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
    (value.schemaId === undefined || isNonEmptyString(value.schemaId)) &&
    (value.version === undefined || isNonEmptyString(value.version))
  );
}

export function isTextConformanceSuiteClass(value: unknown): value is TextConformanceSuiteClass {
  return (
    value === "spec" ||
    value === "profile" ||
    value === "pack" ||
    value === "interchange" ||
    value === "workflow" ||
    value === "benchmark"
  );
}

export function isTextConformanceFixtureRole(
  value: unknown,
): value is TextConformanceFixtureRole {
  return (
    value === "development" ||
    value === "validation" ||
    value === "holdout" ||
    value === "negative-control" ||
    value === "scope-narrowed-gap"
  );
}

export function isTextConformanceOracleKind(value: unknown): value is TextConformanceOracleKind {
  return (
    value === "exact" ||
    value === "schema" ||
    value === "runtime-guard" ||
    value === "round-trip" ||
    value === "differential" ||
    value === "benchmark"
  );
}

export function isTextConformanceSuiteTargetKind(
  value: unknown,
): value is TextConformanceSuiteTargetKind {
  return (
    value === "package-fixture" ||
    value === "external-consumer-project" ||
    value === "generated-package-artifact"
  );
}

export function isTextConformanceTraceabilityV1(
  value: unknown,
): value is TextConformanceTraceabilityV1 {
  return (
    isRecord(value) &&
    isNonEmptyStringArray(value.requirementRefs) &&
    isNonEmptyStringArray(value.apiRefs) &&
    isNonEmptyStringArray(value.inputRefs) &&
    isNonEmptyStringArray(value.oracleRefs) &&
    (value.reportRefs === undefined || isNonEmptyStringArray(value.reportRefs)) &&
    isNonEmptyStringArray(value.limitations)
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
        value.evidenceRefs.every((entry) => isNonEmptyString(entry)))) &&
    (value.traceability === undefined || isTextConformanceTraceabilityV1(value.traceability))
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

export function isTextConformanceFixtureRefV1(
  value: unknown,
): value is TextConformanceFixtureRefV1 {
  return (
    isRecord(value) &&
    isTextConformanceFixtureRole(value.role) &&
    isNonEmptyString(value.ref) &&
    (value.description === undefined || isNonEmptyString(value.description))
  );
}

export function isTextConformanceOracleRefV1(
  value: unknown,
): value is TextConformanceOracleRefV1 {
  return (
    isRecord(value) &&
    isNonEmptyString(value.oracleId) &&
    isTextConformanceOracleKind(value.kind) &&
    (value.ref === undefined || isNonEmptyString(value.ref))
  );
}

export function isTextConformanceSuiteTargetV1(
  value: unknown,
): value is TextConformanceSuiteTargetV1 {
  return (
    isRecord(value) &&
    isNonEmptyString(value.targetId) &&
    isTextConformanceSuiteTargetKind(value.kind) &&
    isNonEmptyString(value.ref) &&
    (value.required === undefined || typeof value.required === "boolean") &&
    (value.description === undefined || isNonEmptyString(value.description))
  );
}

export function isTextConformanceSuiteCheckV1(
  value: unknown,
): value is TextConformanceSuiteCheckV1 {
  return (
    isRecord(value) &&
    isNonEmptyString(value.checkId) &&
    isNonEmptyString(value.oracleId) &&
    (value.expectedStatus === undefined ||
      value.expectedStatus === "pass" ||
      value.expectedStatus === "fail" ||
      value.expectedStatus === "not-run") &&
    (value.message === undefined || isNonEmptyString(value.message)) &&
    (value.evidenceRefs === undefined || isStringArray(value.evidenceRefs)) &&
    (value.traceability === undefined || isTextConformanceTraceabilityV1(value.traceability))
  );
}

function isTextConformanceReportSuite(value: unknown): value is TextConformanceReportV1["suite"] {
  return (
    isRecord(value) &&
    isNonEmptyString(value.suiteId) &&
    isNonEmptyString(value.suiteVersion) &&
    isTextConformanceSuiteClass(value.suiteClass)
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
    (value.suite === undefined || isTextConformanceReportSuite(value.suite)) &&
    (value.notes === undefined ||
      (Array.isArray(value.notes) && value.notes.every((entry) => isNonEmptyString(entry))))
  );
}

export function isTextConformanceSuiteV1(value: unknown): value is TextConformanceSuiteV1 {
  return (
    isRecord(value) &&
    value.schemaId === conformanceSuiteSchemaId &&
    value.schemaVersion === conformanceSuiteSchemaVersion &&
    isNonEmptyString(value.suiteId) &&
    isNonEmptyString(value.suiteVersion) &&
    isTextConformanceSuiteClass(value.suiteClass) &&
    isTextConformanceReportSubject(value.subject) &&
    isNonEmptyString(value.scopeBoundary) &&
    Array.isArray(value.fixtures) &&
    value.fixtures.length >= 1 &&
    value.fixtures.every((entry) => isTextConformanceFixtureRefV1(entry)) &&
    Array.isArray(value.oracles) &&
    value.oracles.length >= 1 &&
    value.oracles.every((entry) => isTextConformanceOracleRefV1(entry)) &&
    hasUniqueStrings(value.oracles.map((entry) => entry.oracleId)) &&
    (value.targets === undefined ||
      (Array.isArray(value.targets) &&
        value.targets.every((entry) => isTextConformanceSuiteTargetV1(entry)) &&
        hasUniqueStrings(value.targets.map((entry) => entry.targetId)))) &&
    Array.isArray(value.checks) &&
    value.checks.length >= 1 &&
    value.checks.every((entry) => isTextConformanceSuiteCheckV1(entry)) &&
    hasUniqueStrings((value.checks as readonly TextConformanceSuiteCheckV1[]).map((entry) => entry.checkId)) &&
    (value.checks as readonly TextConformanceSuiteCheckV1[]).every((entry) =>
      (value.oracles as readonly TextConformanceOracleRefV1[]).some(
        (oracle) => oracle.oracleId === entry.oracleId,
      ),
    ) &&
    isNonEmptyStringArray(value.limitations) &&
    (value.notes === undefined || isStringArray(value.notes))
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

export function isTextConformanceBenchmarkMetricV1(
  value: unknown,
): value is TextConformanceBenchmarkMetricV1 {
  return (
    isRecord(value) &&
    isNonEmptyString(value.metricId) &&
    typeof value.value === "number" &&
    Number.isFinite(value.value) &&
    isNonEmptyString(value.unit) &&
    (value.higherIsPreferred === undefined || typeof value.higherIsPreferred === "boolean")
  );
}

export function isTextConformanceBenchmarkReportV1(
  value: unknown,
): value is TextConformanceBenchmarkReportV1 {
  return (
    isRecord(value) &&
    value.schemaId === conformanceBenchmarkReportSchemaId &&
    value.schemaVersion === conformanceBenchmarkReportSchemaVersion &&
    isNonEmptyString(value.benchmarkId) &&
    isTextConformanceReportSubject(value.subject) &&
    isNonEmptyString(value.generatedAt) &&
    Array.isArray(value.metrics) &&
    value.metrics.length >= 1 &&
    value.metrics.every((entry) => isTextConformanceBenchmarkMetricV1(entry)) &&
    hasUniqueStrings(value.metrics.map((entry) => entry.metricId)) &&
    isNonEmptyStringArray(value.evidenceRefs) &&
    isNonEmptyStringArray(value.limitations) &&
    (value.notes === undefined || isStringArray(value.notes))
  );
}

export function isTextConformanceSuiteTargetProbeV1(
  value: unknown,
): value is TextConformanceSuiteTargetProbeV1 {
  return (
    isRecord(value) &&
    isNonEmptyString(value.targetId) &&
    isTextConformanceSuiteTargetKind(value.kind) &&
    isNonEmptyString(value.ref) &&
    (value.status === "pass" || value.status === "fail" || value.status === "not-run") &&
    (value.message === undefined || isNonEmptyString(value.message)) &&
    (value.evidenceRefs === undefined || isStringArray(value.evidenceRefs))
  );
}

export function isTextConformanceCapabilitySupportLevel(
  value: unknown,
): value is TextConformanceCapabilitySupportLevel {
  return (
    value === "fixture-validated" ||
    value === "corpus-backed" ||
    value === "performance-backed"
  );
}

export function isTextConformanceCapabilityStatementV1(value: unknown): value is TextConformanceCapabilityStatementV1 {
  return (
    isRecord(value) &&
    isNonEmptyString(value.statementId) &&
    isTextConformanceReportSubject(value.subject) &&
    isTextConformanceCapabilitySupportLevel(value.supportLevel) &&
    isNonEmptyStringArray(value.requirementRefs) &&
    isNonEmptyStringArray(value.apiRefs) &&
    isNonEmptyStringArray(value.inputRefs) &&
    isNonEmptyStringArray(value.oracleRefs) &&
    isNonEmptyStringArray(value.evidenceRefs) &&
    isNonEmptyStringArray(value.reportRefs) &&
    isNonEmptyStringArray(value.limitations)
  );
}

export function isTextConformanceCapabilityRegistryV1(
  value: unknown,
): value is TextConformanceCapabilityRegistryV1 {
  return (
    isRecord(value) &&
    value.schemaVersion === conformanceCapabilityRegistrySchemaVersion &&
    isNonEmptyString(value.registryId) &&
    Array.isArray(value.statements) &&
    value.statements.length >= 1 &&
    value.statements.every((entry) => isTextConformanceCapabilityStatementV1(entry)) &&
    hasUniqueStrings(value.statements.map((entry) => entry.statementId)) &&
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
  if (!hasUniqueStrings(normalizedChecks.map((check) => check.checkId))) {
    throw new TypeError("conformance runner produced duplicate check ids");
  }

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

export function validateTextConformanceFixturePolicy(
  suite: TextConformanceSuiteV1,
  options: TextConformanceFixturePolicyOptions = {},
): readonly TextConformanceCheckV1[] {
  if (!isTextConformanceSuiteV1(suite)) {
    throw new TypeError("conformance suite is invalid");
  }
  const requireNegativeControl = options.requireNegativeControl ?? true;
  const disallowDevelopmentOnly = options.disallowDevelopmentOnly ?? true;
  const requireHoldout = options.requireHoldout ?? false;
  const fixtureRoles = new Set(suite.fixtures.map((fixture) => fixture.role));
  const evidenceRefs = suite.fixtures.map((fixture) => fixture.ref).sort();
  const checks: TextConformanceCheckV1[] = [
    {
      checkId: "fixture-policy:roles-declared",
      status: fixtureRoles.size > 0 ? "pass" : "fail",
      message: `Fixture roles: ${[...fixtureRoles].sort().join(", ") || "none"}.`,
      evidenceRefs,
    },
    {
      checkId: "fixture-policy:development-not-sole-evidence",
      status:
        !disallowDevelopmentOnly ||
        suite.fixtures.some((fixture) => fixture.role !== "development")
          ? "pass"
          : "fail",
      message: "Development fixtures alone cannot verify a public statement.",
      evidenceRefs,
    },
  ];
  if (requireNegativeControl) {
    checks.push({
      checkId: "fixture-policy:negative-control",
      status: hasRole(suite.fixtures, "negative-control") ? "pass" : "fail",
      message: "Negative-control fixtures are required for scope-bearing suites.",
      evidenceRefs,
    });
  }
  if (requireHoldout) {
    checks.push({
      checkId: "fixture-policy:holdout",
      status: hasRole(suite.fixtures, "holdout") ? "pass" : "fail",
      message: "Holdout fixtures are required before broad or upgrade statements.",
      evidenceRefs,
    });
  }
  return checks;
}

export function runTextConformanceSuite(
  suite: TextConformanceSuiteV1,
  options: TextConformanceSuiteRunnerOptions = {},
): TextConformanceReportV1 {
  if (!isTextConformanceSuiteV1(suite)) {
    throw new TypeError("conformance suite is invalid");
  }
  const oracleIds = new Set(suite.oracles.map((oracle) => oracle.oracleId));
  const suiteChecks: TextConformanceCheckV1[] = suite.checks.map((check) => {
    const status: TextConformanceCheckStatus = oracleIds.has(check.oracleId)
      ? (check.expectedStatus ?? "pass")
      : "fail";
    return {
      checkId: check.checkId,
      status,
      ...(check.message ? { message: check.message } : {}),
      ...(check.evidenceRefs ? { evidenceRefs: check.evidenceRefs } : {}),
      ...(check.traceability ? { traceability: check.traceability } : {}),
    };
  });
  const policyChecks = validateTextConformanceFixturePolicy(suite, options.fixturePolicy);
  const checks = [...policyChecks, ...suiteChecks].sort((left, right) =>
    compareCheckIds(left.checkId, right.checkId),
  );
  if (!hasUniqueStrings(checks.map((check) => check.checkId))) {
    throw new TypeError("conformance suite produced duplicate check ids");
  }
  const report: TextConformanceReportV1 = {
    schemaId: conformanceReportSchemaId,
    schemaVersion: conformanceReportSchemaVersion,
    reportId: options.reportId ?? `suite:${suite.suiteId}`,
    subject: suite.subject,
    generatedAt: options.generatedAt ?? "1970-01-01T00:00:00.000Z",
    summary: summarizeChecks(checks),
    suite: {
      suiteId: suite.suiteId,
      suiteVersion: suite.suiteVersion,
      suiteClass: suite.suiteClass,
    },
    checks,
    notes: [...suite.limitations, ...(suite.notes ?? [])],
  };
  if (!isTextConformanceReportV1(report)) {
    throw new TypeError("conformance suite produced an invalid report");
  }
  return report;
}

export function runTextConformanceSuiteTargetChecks(
  suite: TextConformanceSuiteV1,
  probes: readonly TextConformanceSuiteTargetProbeV1[] = [],
  options: TextConformanceSuiteTargetCheckOptions = {},
): readonly TextConformanceCheckV1[] {
  if (!isTextConformanceSuiteV1(suite)) {
    throw new TypeError("conformance suite is invalid");
  }
  if (!probes.every((probe) => isTextConformanceSuiteTargetProbeV1(probe))) {
    throw new TypeError("conformance suite target probes are invalid");
  }
  if (!hasUniqueStrings(probes.map((probe) => probe.targetId))) {
    throw new TypeError("conformance suite target probes contain duplicate target ids");
  }
  const requireDeclaredTargets = options.requireDeclaredTargets ?? true;
  const probesById = new Map(probes.map((probe) => [probe.targetId, probe]));
  return [...(suite.targets ?? [])].sort(compareTargetIds).map((target) => {
    const probe = probesById.get(target.targetId);
    const required = target.required ?? true;
    if (probe === undefined) {
      return {
        checkId: `target:${target.targetId}`,
        status: required && requireDeclaredTargets ? "fail" : "not-run",
        message: required
          ? "Required suite target was not evaluated."
          : "Optional suite target was not evaluated.",
        evidenceRefs: [target.ref],
      };
    }
    if (probe.kind !== target.kind || probe.ref !== target.ref) {
      return {
        checkId: `target:${target.targetId}`,
        status: "fail",
        message: `Target probe does not match declared ${target.kind} target ${target.ref}.`,
        evidenceRefs: [target.ref, probe.ref],
      };
    }
    return {
      checkId: `target:${target.targetId}`,
      status: probe.status,
      message:
        probe.message ??
        (probe.status === "pass"
          ? `Declared ${target.kind} target is available.`
          : `Declared ${target.kind} target is unavailable.`),
      evidenceRefs: probe.evidenceRefs ?? [target.ref],
    };
  });
}

export function runTextConformanceSuiteWithTargets(
  suite: TextConformanceSuiteV1,
  options: TextConformanceSuiteTargetRunnerOptions = {},
): TextConformanceReportV1 {
  const report = runTextConformanceSuite(suite, options);
  const targetChecks = runTextConformanceSuiteTargetChecks(suite, options.targets ?? [], options);
  if (targetChecks.length === 0) return report;
  const checks = [...report.checks, ...targetChecks].sort((left, right) =>
    compareCheckIds(left.checkId, right.checkId),
  );
  if (!hasUniqueStrings(checks.map((check) => check.checkId))) {
    throw new TypeError("conformance suite target run produced duplicate check ids");
  }
  const targetReport: TextConformanceReportV1 = {
    ...report,
    summary: summarizeChecks(checks),
    checks,
  };
  if (!isTextConformanceReportV1(targetReport)) {
    throw new TypeError("conformance suite target run produced an invalid report");
  }
  return targetReport;
}

export function runTextConformanceDifferentialOracle(
  input: TextConformanceDifferentialOracleInput,
): TextConformanceCheckV1 {
  if (!isNonEmptyString(input.oracleId)) {
    throw new TypeError("differential oracle id must be a non-empty string");
  }
  const allowedDifferencePaths = input.allowedDifferencePaths ?? [];
  if (!isStringArray(allowedDifferencePaths)) {
    throw new TypeError("differential oracle allowed paths must be strings");
  }
  const expected = withoutAllowedDifferencePaths(input.expected, allowedDifferencePaths);
  const actual = withoutAllowedDifferencePaths(input.actual, allowedDifferencePaths);
  const status: TextConformanceCheckStatus =
    canonicalJson(expected) === canonicalJson(actual) ? "pass" : "fail";
  return {
    checkId: `differential:${input.oracleId}`,
    status,
    message:
      input.message ??
      (status === "pass"
        ? "Actual output matches expected output after applying allowed difference paths."
        : "Actual output differs from expected output outside allowed difference paths."),
    ...(input.evidenceRefs ? { evidenceRefs: input.evidenceRefs } : {}),
  };
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

export function validateTextConformanceCapabilityRegistry(
  registry: TextConformanceCapabilityRegistryV1,
  options: TextConformanceCapabilityRegistryValidationOptions = {},
): TextConformanceReportV1 {
  const knownReportIds = new Set(options.knownReportIds ?? []);
  return runTextConformanceChecks(
    [
      {
        checkId: "capability-registry-runtime-guard",
        run: () => (isTextConformanceCapabilityRegistryV1(registry) ? "pass" : "fail"),
      },
      ...registry.statements.map((statement) => ({
        checkId: `capability-trace:${statement.statementId}`,
        evidenceRefs: statement.evidenceRefs,
        run: () => {
          const missingReportRefs = statement.reportRefs.filter((reportRef) => !knownReportIds.has(reportRef));
          const status: TextConformanceCheckStatus = missingReportRefs.length === 0 ? "pass" : "fail";
          return {
            checkId: `capability-trace:${statement.statementId}`,
            status,
            ...(missingReportRefs.length > 0
              ? { message: `Missing report refs: ${missingReportRefs.join(", ")}` }
              : {}),
            evidenceRefs: [
              ...statement.requirementRefs,
              ...statement.apiRefs,
              ...statement.inputRefs,
              ...statement.oracleRefs,
              ...statement.evidenceRefs,
              ...statement.reportRefs,
            ].sort(),
          };
        },
      })),
    ],
    {
      reportId: options.reportId ?? `capability-registry:${registry.registryId}`,
      subject: {
        kind: "capability-registry",
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
