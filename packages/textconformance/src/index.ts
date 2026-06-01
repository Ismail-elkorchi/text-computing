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
export const conformanceBenchmarkCalibrationReportSchemaVersion = 1 as const;
export const conformanceBenchmarkMatrixReportSchemaVersion = 1 as const;
export const conformanceBenchmarkThresholdPolicySchemaVersion = 1 as const;
export const conformanceBenchmarkThresholdEvaluationSchemaVersion = 1 as const;

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
export type TextConformanceBenchmarkCalibrationReportSchemaVersion =
  typeof conformanceBenchmarkCalibrationReportSchemaVersion;
export type TextConformanceBenchmarkMatrixReportSchemaVersion =
  typeof conformanceBenchmarkMatrixReportSchemaVersion;
export type TextConformanceBenchmarkThresholdPolicySchemaVersion =
  typeof conformanceBenchmarkThresholdPolicySchemaVersion;
export type TextConformanceBenchmarkThresholdEvaluationSchemaVersion =
  typeof conformanceBenchmarkThresholdEvaluationSchemaVersion;

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
export type TextConformanceBenchmarkThresholdStatus = "pass" | "warn" | "fail" | "missing";
export type TextConformanceBenchmarkCalibrationStatus =
  | "observed"
  | "stable"
  | "variable"
  | "incomplete";
export type TextConformanceBenchmarkMatrixRowStatus = "complete" | "incomplete";

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

export interface TextConformanceBenchmarkCalibrationHostV1 {
  readonly hostId: string;
  readonly label?: string;
  readonly runtime?: string;
  readonly os?: string;
  readonly arch?: string;
  readonly evidenceRefs?: readonly string[];
}

export interface TextConformanceBenchmarkCalibrationInput {
  readonly host: TextConformanceBenchmarkCalibrationHostV1;
  readonly report: TextConformanceBenchmarkReportV1;
}

export interface TextConformanceBenchmarkCalibrationHostValueV1 {
  readonly hostId: string;
  readonly value: number;
  readonly generatedAt: string;
  readonly evidenceRefs: readonly string[];
}

export interface TextConformanceBenchmarkCalibrationMetricRowV1 {
  readonly metricId: string;
  readonly unit: string;
  readonly higherIsPreferred?: boolean;
  readonly status: TextConformanceBenchmarkCalibrationStatus;
  readonly hostCount: number;
  readonly observedHostCount: number;
  readonly missingHostIds: readonly string[];
  readonly min: number;
  readonly max: number;
  readonly mean: number;
  readonly median: number;
  readonly relativeSpread: number | null;
  readonly baselineHostId?: string;
  readonly baselineValue?: number;
  readonly baselineDelta?: number;
  readonly baselineRatio?: number | null;
  readonly hostValues: readonly TextConformanceBenchmarkCalibrationHostValueV1[];
}

export interface TextConformanceBenchmarkCalibrationSummaryV1 {
  readonly observed: number;
  readonly stable: number;
  readonly variable: number;
  readonly incomplete: number;
}

export interface TextConformanceBenchmarkCalibrationReportV1 {
  readonly schemaVersion: TextConformanceBenchmarkCalibrationReportSchemaVersion;
  readonly artifactType: "textconformance-benchmark-calibration-report-v1";
  readonly calibrationId: string;
  readonly benchmarkId: string;
  readonly subject: TextConformanceReportSubject;
  readonly generatedAt: string;
  readonly hostCount: number;
  readonly metricCount: number;
  readonly baselineHostId?: string;
  readonly maxRelativeSpread?: number;
  readonly summary: TextConformanceBenchmarkCalibrationSummaryV1;
  readonly hosts: readonly TextConformanceBenchmarkCalibrationHostV1[];
  readonly rows: readonly TextConformanceBenchmarkCalibrationMetricRowV1[];
  readonly evidenceRefs: readonly string[];
  readonly limitations: readonly string[];
  readonly notes?: readonly string[];
}

export interface TextConformanceBenchmarkCalibrationOptions {
  readonly calibrationId?: string;
  readonly generatedAt?: string;
  readonly baselineHostId?: string;
  readonly maxRelativeSpread?: number;
  readonly metricIds?: readonly string[];
  readonly evidenceRefs?: readonly string[];
  readonly limitations: readonly string[];
  readonly notes?: readonly string[];
}

export interface TextConformanceBenchmarkMatrixInput {
  readonly runId?: string;
  readonly host?: TextConformanceBenchmarkCalibrationHostV1;
  readonly report: TextConformanceBenchmarkReportV1;
}

export interface TextConformanceBenchmarkMatrixMetricValueV1 {
  readonly runId: string;
  readonly value: number;
  readonly generatedAt: string;
  readonly evidenceRefs: readonly string[];
  readonly hostId?: string;
}

export interface TextConformanceBenchmarkMatrixMetricRowV1 {
  readonly benchmarkId: string;
  readonly subjectKey: string;
  readonly subject: TextConformanceReportSubject;
  readonly metricId: string;
  readonly unit: string;
  readonly higherIsPreferred?: boolean;
  readonly status: TextConformanceBenchmarkMatrixRowStatus;
  readonly runCount: number;
  readonly observedRunCount: number;
  readonly missingRunIds: readonly string[];
  readonly min: number;
  readonly max: number;
  readonly mean: number;
  readonly median: number;
  readonly values: readonly TextConformanceBenchmarkMatrixMetricValueV1[];
}

export interface TextConformanceBenchmarkMatrixSummaryV1 {
  readonly complete: number;
  readonly incomplete: number;
}

export interface TextConformanceBenchmarkMatrixReportV1 {
  readonly schemaVersion: TextConformanceBenchmarkMatrixReportSchemaVersion;
  readonly artifactType: "textconformance-benchmark-matrix-report-v1";
  readonly matrixId: string;
  readonly generatedAt: string;
  readonly runCount: number;
  readonly benchmarkCount: number;
  readonly subjectCount: number;
  readonly hostCount: number;
  readonly metricCount: number;
  readonly summary: TextConformanceBenchmarkMatrixSummaryV1;
  readonly rows: readonly TextConformanceBenchmarkMatrixMetricRowV1[];
  readonly evidenceRefs: readonly string[];
  readonly limitations: readonly string[];
  readonly notes?: readonly string[];
}

export interface TextConformanceBenchmarkMatrixOptions {
  readonly matrixId?: string;
  readonly generatedAt?: string;
  readonly evidenceRefs?: readonly string[];
  readonly limitations: readonly string[];
  readonly notes?: readonly string[];
}

export interface TextConformanceBenchmarkThresholdV1 {
  readonly metricId: string;
  readonly unit?: string;
  readonly min?: number;
  readonly max?: number;
  readonly warnMin?: number;
  readonly warnMax?: number;
  readonly evidenceRefs?: readonly string[];
}

export interface TextConformanceBenchmarkThresholdPolicyV1 {
  readonly schemaVersion: TextConformanceBenchmarkThresholdPolicySchemaVersion;
  readonly policyId: string;
  readonly benchmarkId: string;
  readonly subject: TextConformanceReportSubject;
  readonly calibratedAt: string;
  readonly thresholds: readonly TextConformanceBenchmarkThresholdV1[];
  readonly evidenceRefs: readonly string[];
  readonly limitations: readonly string[];
  readonly notes?: readonly string[];
}

export interface TextConformanceBenchmarkThresholdEvaluationSummaryV1 {
  readonly pass: number;
  readonly warn: number;
  readonly fail: number;
  readonly missing: number;
}

export interface TextConformanceBenchmarkThresholdEvaluationRowV1 {
  readonly metricId: string;
  readonly status: TextConformanceBenchmarkThresholdStatus;
  readonly value?: number;
  readonly unit?: string;
  readonly min?: number;
  readonly max?: number;
  readonly warnMin?: number;
  readonly warnMax?: number;
  readonly message: string;
  readonly evidenceRefs: readonly string[];
}

export interface TextConformanceBenchmarkThresholdEvaluationReportV1 {
  readonly schemaVersion: TextConformanceBenchmarkThresholdEvaluationSchemaVersion;
  readonly policyId: string;
  readonly benchmarkId: string;
  readonly subject: TextConformanceReportSubject;
  readonly generatedAt: string;
  readonly summary: TextConformanceBenchmarkThresholdEvaluationSummaryV1;
  readonly rows: readonly TextConformanceBenchmarkThresholdEvaluationRowV1[];
  readonly evidenceRefs: readonly string[];
  readonly limitations: readonly string[];
  readonly notes?: readonly string[];
}

export interface TextConformanceBenchmarkThresholdEvaluationOptions {
  readonly generatedAt?: string;
  readonly notes?: readonly string[];
}

export type TextConformanceBenchmarkPhase = "warmup" | "measurement";

export interface TextConformanceBenchmarkCaseContext {
  readonly benchmarkId: string;
  readonly caseId: string;
  readonly phase: TextConformanceBenchmarkPhase;
  readonly iteration: number;
}

export interface TextConformanceBenchmarkCase {
  readonly caseId: string;
  readonly iterations?: number;
  readonly warmupIterations?: number;
  readonly evidenceRefs?: readonly string[];
  run(context: TextConformanceBenchmarkCaseContext): void | Promise<void>;
}

export interface TextConformanceBenchmarkRunnerOptions {
  readonly benchmarkId: string;
  readonly subject: TextConformanceReportSubject;
  readonly generatedAt?: string;
  readonly cases: readonly TextConformanceBenchmarkCase[];
  readonly iterations?: number;
  readonly warmupIterations?: number;
  readonly clock?: () => number;
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

function positiveInteger(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    throw new TypeError(`${label} must be a positive integer`);
  }
  return value;
}

function nonNegativeInteger(value: unknown, label: string): number {
  if (!isNonNegativeInteger(value)) {
    throw new TypeError(`${label} must be a non-negative integer`);
  }
  return value;
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

function sortedBenchmarkCases(
  cases: readonly TextConformanceBenchmarkCase[],
): readonly TextConformanceBenchmarkCase[] {
  return [...cases].sort((left, right) => left.caseId.localeCompare(right.caseId));
}

function sortedBenchmarkThresholds(
  thresholds: readonly TextConformanceBenchmarkThresholdV1[],
): readonly TextConformanceBenchmarkThresholdV1[] {
  return [...thresholds].sort((left, right) => left.metricId.localeCompare(right.metricId));
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function hasBenchmarkThresholdBound(value: TextConformanceBenchmarkThresholdV1): boolean {
  return (
    value.min !== undefined ||
    value.max !== undefined ||
    value.warnMin !== undefined ||
    value.warnMax !== undefined
  );
}

function hasConsistentBenchmarkThresholdBounds(value: TextConformanceBenchmarkThresholdV1): boolean {
  if (value.min !== undefined && value.max !== undefined && value.min > value.max) return false;
  if (value.warnMin !== undefined && value.warnMax !== undefined && value.warnMin > value.warnMax) return false;
  if (value.min !== undefined && value.warnMin !== undefined && value.warnMin < value.min) return false;
  if (value.max !== undefined && value.warnMax !== undefined && value.warnMax > value.max) return false;
  return true;
}

function defaultBenchmarkClock(): number {
  const now = globalThis.performance?.now();
  return typeof now === "number" && Number.isFinite(now) ? now : Date.now();
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

function isTextConformanceBenchmarkCalibrationStatus(
  value: unknown,
): value is TextConformanceBenchmarkCalibrationStatus {
  return value === "observed" || value === "stable" || value === "variable" || value === "incomplete";
}

export function isTextConformanceBenchmarkCalibrationHostV1(
  value: unknown,
): value is TextConformanceBenchmarkCalibrationHostV1 {
  return (
    isRecord(value) &&
    isNonEmptyString(value.hostId) &&
    (value.label === undefined || isNonEmptyString(value.label)) &&
    (value.runtime === undefined || isNonEmptyString(value.runtime)) &&
    (value.os === undefined || isNonEmptyString(value.os)) &&
    (value.arch === undefined || isNonEmptyString(value.arch)) &&
    (value.evidenceRefs === undefined || isStringArray(value.evidenceRefs))
  );
}

export function isTextConformanceBenchmarkCalibrationHostValueV1(
  value: unknown,
): value is TextConformanceBenchmarkCalibrationHostValueV1 {
  return (
    isRecord(value) &&
    isNonEmptyString(value.hostId) &&
    isFiniteNumber(value.value) &&
    isNonEmptyString(value.generatedAt) &&
    isStringArray(value.evidenceRefs)
  );
}

export function isTextConformanceBenchmarkCalibrationMetricRowV1(
  value: unknown,
): value is TextConformanceBenchmarkCalibrationMetricRowV1 {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.metricId) ||
    !isNonEmptyString(value.unit) ||
    (value.higherIsPreferred !== undefined && typeof value.higherIsPreferred !== "boolean") ||
    !isTextConformanceBenchmarkCalibrationStatus(value.status) ||
    !isNonNegativeInteger(value.hostCount) ||
    !isNonNegativeInteger(value.observedHostCount) ||
    !isStringArray(value.missingHostIds) ||
    !isFiniteNumber(value.min) ||
    !isFiniteNumber(value.max) ||
    !isFiniteNumber(value.mean) ||
    !isFiniteNumber(value.median) ||
    (value.relativeSpread !== null && !isFiniteNumber(value.relativeSpread)) ||
    (value.baselineHostId !== undefined && !isNonEmptyString(value.baselineHostId)) ||
    (value.baselineValue !== undefined && !isFiniteNumber(value.baselineValue)) ||
    (value.baselineDelta !== undefined && !isFiniteNumber(value.baselineDelta)) ||
    (value.baselineRatio !== undefined && value.baselineRatio !== null && !isFiniteNumber(value.baselineRatio)) ||
    !Array.isArray(value.hostValues) ||
    !value.hostValues.every((entry) => isTextConformanceBenchmarkCalibrationHostValueV1(entry))
  ) {
    return false;
  }
  return (
    value.hostCount >= 2 &&
    value.observedHostCount === value.hostValues.length &&
    value.observedHostCount >= 1 &&
    value.missingHostIds.length + value.observedHostCount === value.hostCount &&
    hasUniqueStrings(value.missingHostIds) &&
    hasUniqueStrings(value.hostValues.map((entry) => entry.hostId)) &&
    (value.status === "incomplete" ? value.missingHostIds.length > 0 : value.missingHostIds.length === 0) &&
    (value.baselineHostId === undefined ||
      (value.baselineValue !== undefined && value.baselineDelta !== undefined && value.baselineRatio !== undefined))
  );
}

export function isTextConformanceBenchmarkCalibrationSummaryV1(
  value: unknown,
): value is TextConformanceBenchmarkCalibrationSummaryV1 {
  return (
    isRecord(value) &&
    isNonNegativeInteger(value.observed) &&
    isNonNegativeInteger(value.stable) &&
    isNonNegativeInteger(value.variable) &&
    isNonNegativeInteger(value.incomplete)
  );
}

export function isTextConformanceBenchmarkCalibrationReportV1(
  value: unknown,
): value is TextConformanceBenchmarkCalibrationReportV1 {
  if (
    !isRecord(value) ||
    value.schemaVersion !== conformanceBenchmarkCalibrationReportSchemaVersion ||
    value.artifactType !== "textconformance-benchmark-calibration-report-v1" ||
    !isNonEmptyString(value.calibrationId) ||
    !isNonEmptyString(value.benchmarkId) ||
    !isTextConformanceReportSubject(value.subject) ||
    !isNonEmptyString(value.generatedAt) ||
    !isNonNegativeInteger(value.hostCount) ||
    value.hostCount < 2 ||
    !isNonNegativeInteger(value.metricCount) ||
    (value.baselineHostId !== undefined && !isNonEmptyString(value.baselineHostId)) ||
    (value.maxRelativeSpread !== undefined && !isFiniteNumber(value.maxRelativeSpread)) ||
    !isTextConformanceBenchmarkCalibrationSummaryV1(value.summary) ||
    !Array.isArray(value.hosts) ||
    !value.hosts.every((entry) => isTextConformanceBenchmarkCalibrationHostV1(entry)) ||
    !Array.isArray(value.rows) ||
    !value.rows.every((entry) => isTextConformanceBenchmarkCalibrationMetricRowV1(entry)) ||
    !isNonEmptyStringArray(value.evidenceRefs) ||
    !isNonEmptyStringArray(value.limitations) ||
    (value.notes !== undefined && !isStringArray(value.notes))
  ) {
    return false;
  }
  const hosts = value.hosts;
  const rows = value.rows;
  const hostIds = hosts.map((host) => host.hostId);
  const summary = value.summary as TextConformanceBenchmarkCalibrationSummaryV1;
  return (
    value.hostCount === hosts.length &&
    hasUniqueStrings(hostIds) &&
    (value.baselineHostId === undefined || hostIds.includes(value.baselineHostId)) &&
    value.metricCount === rows.length &&
    hasUniqueStrings(rows.map((row) => row.metricId)) &&
    rows.every((row) =>
      row.hostCount === value.hostCount &&
      row.hostValues.every((entry) => hostIds.includes(entry.hostId)) &&
      row.missingHostIds.every((hostId) => hostIds.includes(hostId))
    ) &&
    summary.observed === rows.filter((row) => row.status === "observed").length &&
    summary.stable === rows.filter((row) => row.status === "stable").length &&
    summary.variable === rows.filter((row) => row.status === "variable").length &&
    summary.incomplete === rows.filter((row) => row.status === "incomplete").length
  );
}

function isTextConformanceBenchmarkMatrixRowStatus(
  value: unknown,
): value is TextConformanceBenchmarkMatrixRowStatus {
  return value === "complete" || value === "incomplete";
}

export function isTextConformanceBenchmarkMatrixMetricValueV1(
  value: unknown,
): value is TextConformanceBenchmarkMatrixMetricValueV1 {
  return (
    isRecord(value) &&
    isNonEmptyString(value.runId) &&
    isFiniteNumber(value.value) &&
    isNonEmptyString(value.generatedAt) &&
    isStringArray(value.evidenceRefs) &&
    (value.hostId === undefined || isNonEmptyString(value.hostId))
  );
}

export function isTextConformanceBenchmarkMatrixMetricRowV1(
  value: unknown,
): value is TextConformanceBenchmarkMatrixMetricRowV1 {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.benchmarkId) ||
    !isNonEmptyString(value.subjectKey) ||
    !isTextConformanceReportSubject(value.subject) ||
    !isNonEmptyString(value.metricId) ||
    !isNonEmptyString(value.unit) ||
    (value.higherIsPreferred !== undefined && typeof value.higherIsPreferred !== "boolean") ||
    !isTextConformanceBenchmarkMatrixRowStatus(value.status) ||
    !isNonNegativeInteger(value.runCount) ||
    !isNonNegativeInteger(value.observedRunCount) ||
    !isStringArray(value.missingRunIds) ||
    !isFiniteNumber(value.min) ||
    !isFiniteNumber(value.max) ||
    !isFiniteNumber(value.mean) ||
    !isFiniteNumber(value.median) ||
    !Array.isArray(value.values) ||
    !value.values.every((entry) => isTextConformanceBenchmarkMatrixMetricValueV1(entry))
  ) {
    return false;
  }
  return (
    value.runCount >= 1 &&
    value.observedRunCount === value.values.length &&
    value.observedRunCount >= 1 &&
    value.missingRunIds.length + value.observedRunCount === value.runCount &&
    hasUniqueStrings(value.missingRunIds) &&
    hasUniqueStrings(value.values.map((entry) => entry.runId)) &&
    (value.status === "incomplete" ? value.missingRunIds.length > 0 : value.missingRunIds.length === 0)
  );
}

export function isTextConformanceBenchmarkMatrixSummaryV1(
  value: unknown,
): value is TextConformanceBenchmarkMatrixSummaryV1 {
  return (
    isRecord(value) &&
    isNonNegativeInteger(value.complete) &&
    isNonNegativeInteger(value.incomplete)
  );
}

export function isTextConformanceBenchmarkMatrixReportV1(
  value: unknown,
): value is TextConformanceBenchmarkMatrixReportV1 {
  if (
    !isRecord(value) ||
    value.schemaVersion !== conformanceBenchmarkMatrixReportSchemaVersion ||
    value.artifactType !== "textconformance-benchmark-matrix-report-v1" ||
    !isNonEmptyString(value.matrixId) ||
    !isNonEmptyString(value.generatedAt) ||
    !isNonNegativeInteger(value.runCount) ||
    value.runCount < 1 ||
    !isNonNegativeInteger(value.benchmarkCount) ||
    !isNonNegativeInteger(value.subjectCount) ||
    !isNonNegativeInteger(value.hostCount) ||
    !isNonNegativeInteger(value.metricCount) ||
    !isTextConformanceBenchmarkMatrixSummaryV1(value.summary) ||
    !Array.isArray(value.rows) ||
    !value.rows.every((entry) => isTextConformanceBenchmarkMatrixMetricRowV1(entry)) ||
    !isNonEmptyStringArray(value.evidenceRefs) ||
    !isNonEmptyStringArray(value.limitations) ||
    (value.notes !== undefined && !isStringArray(value.notes))
  ) {
    return false;
  }
  const rows = value.rows;
  const summary = value.summary as TextConformanceBenchmarkMatrixSummaryV1;
  const runCount = value.runCount as number;
  return (
    value.metricCount === rows.length &&
    value.benchmarkCount === new Set(rows.map((row) => row.benchmarkId)).size &&
    value.subjectCount === new Set(rows.map((row) => row.subjectKey)).size &&
    rows.every((row) => row.runCount <= runCount) &&
    summary.complete === rows.filter((row) => row.status === "complete").length &&
    summary.incomplete === rows.filter((row) => row.status === "incomplete").length
  );
}

export function isTextConformanceBenchmarkThresholdV1(
  value: unknown,
): value is TextConformanceBenchmarkThresholdV1 {
  return (
    isRecord(value) &&
    isNonEmptyString(value.metricId) &&
    (value.unit === undefined || isNonEmptyString(value.unit)) &&
    (value.min === undefined || isFiniteNumber(value.min)) &&
    (value.max === undefined || isFiniteNumber(value.max)) &&
    (value.warnMin === undefined || isFiniteNumber(value.warnMin)) &&
    (value.warnMax === undefined || isFiniteNumber(value.warnMax)) &&
    (value.evidenceRefs === undefined || isStringArray(value.evidenceRefs)) &&
    hasBenchmarkThresholdBound(value as unknown as TextConformanceBenchmarkThresholdV1) &&
    hasConsistentBenchmarkThresholdBounds(value as unknown as TextConformanceBenchmarkThresholdV1)
  );
}

export function isTextConformanceBenchmarkThresholdPolicyV1(
  value: unknown,
): value is TextConformanceBenchmarkThresholdPolicyV1 {
  return (
    isRecord(value) &&
    value.schemaVersion === conformanceBenchmarkThresholdPolicySchemaVersion &&
    isNonEmptyString(value.policyId) &&
    isNonEmptyString(value.benchmarkId) &&
    isTextConformanceReportSubject(value.subject) &&
    isNonEmptyString(value.calibratedAt) &&
    Array.isArray(value.thresholds) &&
    value.thresholds.length >= 1 &&
    value.thresholds.every((entry) => isTextConformanceBenchmarkThresholdV1(entry)) &&
    hasUniqueStrings(value.thresholds.map((entry) => entry.metricId)) &&
    isNonEmptyStringArray(value.evidenceRefs) &&
    isNonEmptyStringArray(value.limitations) &&
    (value.notes === undefined || isStringArray(value.notes))
  );
}

export function isTextConformanceBenchmarkThresholdEvaluationSummaryV1(
  value: unknown,
): value is TextConformanceBenchmarkThresholdEvaluationSummaryV1 {
  return (
    isRecord(value) &&
    isNonNegativeInteger(value.pass) &&
    isNonNegativeInteger(value.warn) &&
    isNonNegativeInteger(value.fail) &&
    isNonNegativeInteger(value.missing)
  );
}

export function isTextConformanceBenchmarkThresholdEvaluationRowV1(
  value: unknown,
): value is TextConformanceBenchmarkThresholdEvaluationRowV1 {
  return (
    isRecord(value) &&
    isNonEmptyString(value.metricId) &&
    (value.status === "pass" ||
      value.status === "warn" ||
      value.status === "fail" ||
      value.status === "missing") &&
    (value.value === undefined || isFiniteNumber(value.value)) &&
    (value.unit === undefined || isNonEmptyString(value.unit)) &&
    (value.min === undefined || isFiniteNumber(value.min)) &&
    (value.max === undefined || isFiniteNumber(value.max)) &&
    (value.warnMin === undefined || isFiniteNumber(value.warnMin)) &&
    (value.warnMax === undefined || isFiniteNumber(value.warnMax)) &&
    isNonEmptyString(value.message) &&
    isStringArray(value.evidenceRefs)
  );
}

export function isTextConformanceBenchmarkThresholdEvaluationReportV1(
  value: unknown,
): value is TextConformanceBenchmarkThresholdEvaluationReportV1 {
  return (
    isRecord(value) &&
    value.schemaVersion === conformanceBenchmarkThresholdEvaluationSchemaVersion &&
    isNonEmptyString(value.policyId) &&
    isNonEmptyString(value.benchmarkId) &&
    isTextConformanceReportSubject(value.subject) &&
    isNonEmptyString(value.generatedAt) &&
    isTextConformanceBenchmarkThresholdEvaluationSummaryV1(value.summary) &&
    Array.isArray(value.rows) &&
    value.rows.length >= 1 &&
    value.rows.every((entry) => isTextConformanceBenchmarkThresholdEvaluationRowV1(entry)) &&
    hasUniqueStrings(value.rows.map((entry) => entry.metricId)) &&
    isNonEmptyStringArray(value.evidenceRefs) &&
    isNonEmptyStringArray(value.limitations) &&
    (value.notes === undefined || isStringArray(value.notes))
  );
}

function benchmarkDurationMetrics(
  caseId: string,
  durations: readonly number[],
): readonly TextConformanceBenchmarkMetricV1[] {
  const minimum = Math.min(...durations);
  const maximum = Math.max(...durations);
  const mean = durations.reduce((sum, value) => sum + value, 0) / durations.length;
  return [
    {
      metricId: `${caseId}.duration-ms.min`,
      value: minimum,
      unit: "ms",
      higherIsPreferred: false,
    },
    {
      metricId: `${caseId}.duration-ms.mean`,
      value: mean,
      unit: "ms",
      higherIsPreferred: false,
    },
    {
      metricId: `${caseId}.duration-ms.max`,
      value: maximum,
      unit: "ms",
      higherIsPreferred: false,
    },
    {
      metricId: `${caseId}.iterations`,
      value: durations.length,
      unit: "count",
    },
  ];
}

export async function runTextConformanceBenchmark(
  options: TextConformanceBenchmarkRunnerOptions,
): Promise<TextConformanceBenchmarkReportV1> {
  if (!isRecord(options)) {
    throw new TypeError("textconformance benchmark options must be a record");
  }
  if (!isNonEmptyString(options.benchmarkId)) {
    throw new TypeError("textconformance benchmark id must be a non-empty string");
  }
  if (!isTextConformanceReportSubject(options.subject)) {
    throw new TypeError("textconformance benchmark subject is invalid");
  }
  if (!Array.isArray(options.cases) || options.cases.length === 0) {
    throw new TypeError("textconformance benchmark cases must be a non-empty array");
  }
  if (!isNonEmptyStringArray(options.evidenceRefs)) {
    throw new TypeError("textconformance benchmark evidence refs must be a non-empty string array");
  }
  if (!isNonEmptyStringArray(options.limitations)) {
    throw new TypeError("textconformance benchmark limitations must be a non-empty string array");
  }
  if (options.notes !== undefined && !isStringArray(options.notes)) {
    throw new TypeError("textconformance benchmark notes must be strings");
  }
  if (options.clock !== undefined && typeof options.clock !== "function") {
    throw new TypeError("textconformance benchmark clock must be a function");
  }
  const defaultIterations = positiveInteger(options.iterations ?? 1, "textconformance benchmark iterations");
  const defaultWarmupIterations = nonNegativeInteger(
    options.warmupIterations ?? 0,
    "textconformance benchmark warmupIterations",
  );
  if (!hasUniqueStrings(options.cases.map((entry) => entry.caseId))) {
    throw new TypeError("textconformance benchmark case ids must be unique");
  }
  const clock = options.clock ?? defaultBenchmarkClock;
  const metrics: TextConformanceBenchmarkMetricV1[] = [];
  const evidenceRefs = new Set(options.evidenceRefs);
  for (const benchmarkCase of sortedBenchmarkCases(options.cases)) {
    if (!isNonEmptyString(benchmarkCase.caseId)) {
      throw new TypeError("textconformance benchmark case id must be a non-empty string");
    }
    if (typeof benchmarkCase.run !== "function") {
      throw new TypeError(`textconformance benchmark case ${benchmarkCase.caseId} must expose a run function`);
    }
    const iterations = positiveInteger(
      benchmarkCase.iterations ?? defaultIterations,
      `textconformance benchmark case ${benchmarkCase.caseId} iterations`,
    );
    const warmupIterations = nonNegativeInteger(
      benchmarkCase.warmupIterations ?? defaultWarmupIterations,
      `textconformance benchmark case ${benchmarkCase.caseId} warmupIterations`,
    );
    if (benchmarkCase.evidenceRefs !== undefined && !isStringArray(benchmarkCase.evidenceRefs)) {
      throw new TypeError(`textconformance benchmark case ${benchmarkCase.caseId} evidenceRefs must be strings`);
    }
    for (const ref of benchmarkCase.evidenceRefs ?? []) evidenceRefs.add(ref);
    for (let iteration = 0; iteration < warmupIterations; iteration += 1) {
      await benchmarkCase.run({
        benchmarkId: options.benchmarkId,
        caseId: benchmarkCase.caseId,
        phase: "warmup",
        iteration,
      });
    }
    const durations: number[] = [];
    for (let iteration = 0; iteration < iterations; iteration += 1) {
      const startedAt = clock();
      await benchmarkCase.run({
        benchmarkId: options.benchmarkId,
        caseId: benchmarkCase.caseId,
        phase: "measurement",
        iteration,
      });
      const endedAt = clock();
      if (!Number.isFinite(startedAt) || !Number.isFinite(endedAt) || endedAt < startedAt) {
        throw new TypeError(`textconformance benchmark case ${benchmarkCase.caseId} produced an invalid duration`);
      }
      durations.push(endedAt - startedAt);
    }
    metrics.push(...benchmarkDurationMetrics(benchmarkCase.caseId, durations));
  }
  const report: TextConformanceBenchmarkReportV1 = {
    schemaId: conformanceBenchmarkReportSchemaId,
    schemaVersion: conformanceBenchmarkReportSchemaVersion,
    benchmarkId: options.benchmarkId,
    subject: options.subject,
    generatedAt: options.generatedAt ?? "1970-01-01T00:00:00.000Z",
    metrics,
    evidenceRefs: [...evidenceRefs].sort(),
    limitations: options.limitations,
    ...(options.notes ? { notes: options.notes } : {}),
  };
  if (!isTextConformanceBenchmarkReportV1(report)) {
    throw new TypeError("textconformance benchmark runner produced an invalid report");
  }
  return report;
}

function benchmarkThresholdRow(
  threshold: TextConformanceBenchmarkThresholdV1,
  metric: TextConformanceBenchmarkMetricV1 | undefined,
): TextConformanceBenchmarkThresholdEvaluationRowV1 {
  const evidenceRefs = [...new Set(threshold.evidenceRefs ?? [])].sort();
  if (metric === undefined) {
    return {
      metricId: threshold.metricId,
      status: "missing",
      ...(threshold.unit === undefined ? {} : { unit: threshold.unit }),
      ...(threshold.min === undefined ? {} : { min: threshold.min }),
      ...(threshold.max === undefined ? {} : { max: threshold.max }),
      ...(threshold.warnMin === undefined ? {} : { warnMin: threshold.warnMin }),
      ...(threshold.warnMax === undefined ? {} : { warnMax: threshold.warnMax }),
      message: `Metric ${threshold.metricId} is missing from benchmark report.`,
      evidenceRefs,
    };
  }
  const rowBase = {
    metricId: threshold.metricId,
    value: metric.value,
    unit: metric.unit,
    ...(threshold.min === undefined ? {} : { min: threshold.min }),
    ...(threshold.max === undefined ? {} : { max: threshold.max }),
    ...(threshold.warnMin === undefined ? {} : { warnMin: threshold.warnMin }),
    ...(threshold.warnMax === undefined ? {} : { warnMax: threshold.warnMax }),
    evidenceRefs,
  };
  if (threshold.unit !== undefined && metric.unit !== threshold.unit) {
    return {
      ...rowBase,
      status: "fail",
      message: `Metric ${threshold.metricId} uses unit ${metric.unit}; expected ${threshold.unit}.`,
    };
  }
  if (threshold.min !== undefined && metric.value < threshold.min) {
    return {
      ...rowBase,
      status: "fail",
      message: `Metric ${threshold.metricId} value ${metric.value} is below minimum ${threshold.min}.`,
    };
  }
  if (threshold.max !== undefined && metric.value > threshold.max) {
    return {
      ...rowBase,
      status: "fail",
      message: `Metric ${threshold.metricId} value ${metric.value} is above maximum ${threshold.max}.`,
    };
  }
  if (threshold.warnMin !== undefined && metric.value < threshold.warnMin) {
    return {
      ...rowBase,
      status: "warn",
      message: `Metric ${threshold.metricId} value ${metric.value} is below warning minimum ${threshold.warnMin}.`,
    };
  }
  if (threshold.warnMax !== undefined && metric.value > threshold.warnMax) {
    return {
      ...rowBase,
      status: "warn",
      message: `Metric ${threshold.metricId} value ${metric.value} is above warning maximum ${threshold.warnMax}.`,
    };
  }
  return {
    ...rowBase,
    status: "pass",
    message: `Metric ${threshold.metricId} satisfies threshold policy.`,
  };
}

export function evaluateTextConformanceBenchmarkThresholds(
  benchmarkReport: unknown,
  policy: unknown,
  options: TextConformanceBenchmarkThresholdEvaluationOptions = {},
): TextConformanceBenchmarkThresholdEvaluationReportV1 {
  if (!isTextConformanceBenchmarkReportV1(benchmarkReport)) {
    throw new TypeError("benchmark report is invalid");
  }
  if (!isTextConformanceBenchmarkThresholdPolicyV1(policy)) {
    throw new TypeError("benchmark threshold policy is invalid");
  }
  if (benchmarkReport.benchmarkId !== policy.benchmarkId) {
    throw new TypeError(
      `benchmark threshold policy ${policy.policyId} targets ${policy.benchmarkId}; received ${benchmarkReport.benchmarkId}`,
    );
  }
  if (canonicalJson(benchmarkReport.subject) !== canonicalJson(policy.subject)) {
    throw new TypeError(`benchmark threshold policy ${policy.policyId} subject does not match benchmark report`);
  }
  if (options.generatedAt !== undefined && !isNonEmptyString(options.generatedAt)) {
    throw new TypeError("benchmark threshold evaluation generatedAt must be a non-empty string");
  }
  if (options.notes !== undefined && !isStringArray(options.notes)) {
    throw new TypeError("benchmark threshold evaluation notes must be strings");
  }
  const metrics = new Map(benchmarkReport.metrics.map((metric) => [metric.metricId, metric]));
  const rows = sortedBenchmarkThresholds(policy.thresholds).map((threshold) =>
    benchmarkThresholdRow(threshold, metrics.get(threshold.metricId)),
  );
  const summary: TextConformanceBenchmarkThresholdEvaluationSummaryV1 = {
    pass: rows.filter((row) => row.status === "pass").length,
    warn: rows.filter((row) => row.status === "warn").length,
    fail: rows.filter((row) => row.status === "fail").length,
    missing: rows.filter((row) => row.status === "missing").length,
  };
  const evidenceRefs = new Set<string>([...benchmarkReport.evidenceRefs, ...policy.evidenceRefs]);
  for (const threshold of policy.thresholds) {
    for (const ref of threshold.evidenceRefs ?? []) evidenceRefs.add(ref);
  }
  const notes = [...(policy.notes ?? []), ...(options.notes ?? [])];
  const evaluation: TextConformanceBenchmarkThresholdEvaluationReportV1 = {
    schemaVersion: conformanceBenchmarkThresholdEvaluationSchemaVersion,
    policyId: policy.policyId,
    benchmarkId: benchmarkReport.benchmarkId,
    subject: benchmarkReport.subject,
    generatedAt: options.generatedAt ?? benchmarkReport.generatedAt,
    summary,
    rows,
    evidenceRefs: [...evidenceRefs].sort(),
    limitations: [...new Set([...policy.limitations, ...benchmarkReport.limitations])].sort(),
    ...(notes.length === 0 ? {} : { notes }),
  };
  if (!isTextConformanceBenchmarkThresholdEvaluationReportV1(evaluation)) {
    throw new TypeError("benchmark threshold evaluation is invalid");
  }
  return evaluation;
}

function sortedBenchmarkCalibrationInputs(
  inputs: readonly TextConformanceBenchmarkCalibrationInput[],
): readonly TextConformanceBenchmarkCalibrationInput[] {
  return [...inputs].sort((left, right) => left.host.hostId.localeCompare(right.host.hostId));
}

function medianNumber(values: readonly number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  const right = sorted[middle];
  if (right === undefined) throw new TypeError("median requires at least one value");
  if (sorted.length % 2 === 1) return right;
  const left = sorted[middle - 1];
  if (left === undefined) throw new TypeError("median requires a left value for even-length input");
  return (left + right) / 2;
}

function calibrationRelativeSpread(min: number, max: number, mean: number): number | null {
  if (mean === 0) return min === max ? 0 : null;
  return (max - min) / Math.abs(mean);
}

function calibrationStatus(
  missingHostCount: number,
  maxRelativeSpread: number | undefined,
  relativeSpread: number | null,
): TextConformanceBenchmarkCalibrationStatus {
  if (missingHostCount > 0) return "incomplete";
  if (maxRelativeSpread === undefined) return "observed";
  return relativeSpread !== null && relativeSpread <= maxRelativeSpread ? "stable" : "variable";
}

function sortedUniqueStrings(values: readonly string[]): readonly string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

interface NormalizedBenchmarkMatrixInput {
  readonly runId: string;
  readonly host?: TextConformanceBenchmarkCalibrationHostV1;
  readonly report: TextConformanceBenchmarkReportV1;
}

function benchmarkMatrixDefaultRunId(report: TextConformanceBenchmarkReportV1): string {
  return `${report.benchmarkId}:${report.subject.kind}:${report.subject.id}:${report.generatedAt}`;
}

function benchmarkMatrixSubjectKey(subject: TextConformanceReportSubject): string {
  return canonicalJson(subject);
}

function assertBenchmarkMatrixInput(
  input: unknown,
  index: number,
): asserts input is TextConformanceBenchmarkMatrixInput {
  if (!isRecord(input)) {
    throw new TypeError(`benchmark matrix input ${index} must be a record`);
  }
  if (input.runId !== undefined && !isNonEmptyString(input.runId)) {
    throw new TypeError(`benchmark matrix input ${index} runId must be a non-empty string`);
  }
  if (input.host !== undefined && !isTextConformanceBenchmarkCalibrationHostV1(input.host)) {
    throw new TypeError(`benchmark matrix input ${index} host is invalid`);
  }
  if (!isTextConformanceBenchmarkReportV1(input.report)) {
    throw new TypeError(`benchmark matrix input ${index} report is invalid`);
  }
}

function normalizedBenchmarkMatrixInputs(
  inputs: readonly TextConformanceBenchmarkMatrixInput[],
): readonly NormalizedBenchmarkMatrixInput[] {
  const normalized = inputs.map((input) => ({
    runId: input.runId ?? benchmarkMatrixDefaultRunId(input.report),
    ...(input.host === undefined ? {} : { host: input.host }),
    report: input.report,
  }));
  if (!hasUniqueStrings(normalized.map((input) => input.runId))) {
    throw new TypeError("benchmark matrix run ids must be unique");
  }
  return normalized.sort((left, right) => left.runId.localeCompare(right.runId));
}

function compareBenchmarkMatrixRows(
  left: TextConformanceBenchmarkMatrixMetricRowV1,
  right: TextConformanceBenchmarkMatrixMetricRowV1,
): number {
  return (
    left.benchmarkId.localeCompare(right.benchmarkId) ||
    left.subjectKey.localeCompare(right.subjectKey) ||
    left.metricId.localeCompare(right.metricId)
  );
}

export function createTextConformanceBenchmarkMatrixReport(
  inputs: readonly TextConformanceBenchmarkMatrixInput[],
  options: TextConformanceBenchmarkMatrixOptions,
): TextConformanceBenchmarkMatrixReportV1 {
  if (!Array.isArray(inputs) || inputs.length < 1) {
    throw new TypeError("benchmark matrix requires at least one report input");
  }
  inputs.forEach((input, index) => assertBenchmarkMatrixInput(input, index));
  if (!isRecord(options)) {
    throw new TypeError("benchmark matrix options must be a record");
  }
  if (options.matrixId !== undefined && !isNonEmptyString(options.matrixId)) {
    throw new TypeError("benchmark matrix id must be a non-empty string");
  }
  if (options.generatedAt !== undefined && !isNonEmptyString(options.generatedAt)) {
    throw new TypeError("benchmark matrix generatedAt must be a non-empty string");
  }
  if (options.evidenceRefs !== undefined && !isStringArray(options.evidenceRefs)) {
    throw new TypeError("benchmark matrix evidence refs must be strings");
  }
  if (!isNonEmptyStringArray(options.limitations)) {
    throw new TypeError("benchmark matrix limitations must be a non-empty string array");
  }
  if (options.notes !== undefined && !isStringArray(options.notes)) {
    throw new TypeError("benchmark matrix notes must be strings");
  }

  const sortedInputs = normalizedBenchmarkMatrixInputs(inputs);
  const inputGroups = new Map<string, NormalizedBenchmarkMatrixInput[]>();
  for (const input of sortedInputs) {
    const subjectKey = benchmarkMatrixSubjectKey(input.report.subject);
    const key = `${input.report.benchmarkId}\u0000${subjectKey}`;
    inputGroups.set(key, [...(inputGroups.get(key) ?? []), input]);
  }

  const rows: TextConformanceBenchmarkMatrixMetricRowV1[] = [];
  for (const groupInputs of [...inputGroups.values()].sort((left, right) => {
    const leftReport = left[0]?.report;
    const rightReport = right[0]?.report;
    if (leftReport === undefined || rightReport === undefined) return 0;
    return (
      leftReport.benchmarkId.localeCompare(rightReport.benchmarkId) ||
      benchmarkMatrixSubjectKey(leftReport.subject).localeCompare(benchmarkMatrixSubjectKey(rightReport.subject))
    );
  })) {
    const firstReport = groupInputs[0]?.report;
    if (firstReport === undefined) continue;
    const metricIds = sortedUniqueStrings(groupInputs.flatMap((input) => input.report.metrics.map((metric) => metric.metricId)));
    for (const metricId of metricIds) {
      const values: TextConformanceBenchmarkMatrixMetricValueV1[] = [];
      const missingRunIds: string[] = [];
      const units = new Set<string>();
      const preferences = new Set<boolean>();
      for (const input of groupInputs) {
        const metric = input.report.metrics.find((entry) => entry.metricId === metricId);
        if (metric === undefined) {
          missingRunIds.push(input.runId);
          continue;
        }
        units.add(metric.unit);
        if (metric.higherIsPreferred !== undefined) preferences.add(metric.higherIsPreferred);
        values.push({
          runId: input.runId,
          value: metric.value,
          generatedAt: input.report.generatedAt,
          evidenceRefs: input.report.evidenceRefs,
          ...(input.host === undefined ? {} : { hostId: input.host.hostId }),
        });
      }
      if (values.length === 0) {
        throw new TypeError(`benchmark matrix metric ${metricId} is missing from every report`);
      }
      if (units.size !== 1) {
        throw new TypeError(`benchmark matrix metric ${metricId} has inconsistent units`);
      }
      if (preferences.size > 1) {
        throw new TypeError(`benchmark matrix metric ${metricId} has inconsistent preference direction`);
      }
      const unit = [...units][0];
      if (unit === undefined) throw new TypeError(`benchmark matrix metric ${metricId} unit is missing`);
      const preference = [...preferences][0];
      const metricValues = values.map((entry) => entry.value);
      const min = Math.min(...metricValues);
      const max = Math.max(...metricValues);
      rows.push({
        benchmarkId: firstReport.benchmarkId,
        subjectKey: benchmarkMatrixSubjectKey(firstReport.subject),
        subject: firstReport.subject,
        metricId,
        unit,
        ...(preference === undefined ? {} : { higherIsPreferred: preference }),
        status: missingRunIds.length === 0 ? "complete" : "incomplete",
        runCount: groupInputs.length,
        observedRunCount: values.length,
        missingRunIds,
        min,
        max,
        mean: metricValues.reduce((sum, value) => sum + value, 0) / metricValues.length,
        median: medianNumber(metricValues),
        values,
      });
    }
  }

  rows.sort(compareBenchmarkMatrixRows);
  const evidenceRefs = sortedUniqueStrings([
    ...(options.evidenceRefs ?? []),
    ...sortedInputs.flatMap((input) => input.host?.evidenceRefs ?? []),
    ...sortedInputs.flatMap((input) => input.report.evidenceRefs),
  ]);
  const report = {
    schemaVersion: conformanceBenchmarkMatrixReportSchemaVersion,
    artifactType: "textconformance-benchmark-matrix-report-v1",
    matrixId: options.matrixId ?? "matrix:textconformance-benchmarks",
    generatedAt: options.generatedAt ?? sortedInputs[0]?.report.generatedAt ?? "1970-01-01T00:00:00.000Z",
    runCount: sortedInputs.length,
    benchmarkCount: new Set(rows.map((row) => row.benchmarkId)).size,
    subjectCount: new Set(rows.map((row) => row.subjectKey)).size,
    hostCount: new Set(sortedInputs.flatMap((input) => (input.host === undefined ? [] : [input.host.hostId]))).size,
    metricCount: rows.length,
    summary: {
      complete: rows.filter((row) => row.status === "complete").length,
      incomplete: rows.filter((row) => row.status === "incomplete").length,
    },
    rows,
    evidenceRefs,
    limitations: sortedUniqueStrings([...options.limitations, ...sortedInputs.flatMap((input) => input.report.limitations)]),
    ...(options.notes === undefined ? {} : { notes: [...options.notes] }),
  } satisfies TextConformanceBenchmarkMatrixReportV1;
  if (!isTextConformanceBenchmarkMatrixReportV1(report)) {
    throw new TypeError("benchmark matrix report is invalid");
  }
  return report;
}

function assertBenchmarkCalibrationInput(
  input: unknown,
  index: number,
): asserts input is TextConformanceBenchmarkCalibrationInput {
  if (!isRecord(input) || !isTextConformanceBenchmarkCalibrationHostV1(input.host)) {
    throw new TypeError(`benchmark calibration input ${index} host is invalid`);
  }
  if (!isTextConformanceBenchmarkReportV1(input.report)) {
    throw new TypeError(`benchmark calibration input ${index} report is invalid`);
  }
}

export function calibrateTextConformanceBenchmarkReports(
  inputs: readonly TextConformanceBenchmarkCalibrationInput[],
  options: TextConformanceBenchmarkCalibrationOptions,
): TextConformanceBenchmarkCalibrationReportV1 {
  if (!Array.isArray(inputs) || inputs.length < 2) {
    throw new TypeError("benchmark calibration requires at least two host reports");
  }
  inputs.forEach((input, index) => assertBenchmarkCalibrationInput(input, index));
  if (!isRecord(options)) {
    throw new TypeError("benchmark calibration options must be a record");
  }
  if (options.calibrationId !== undefined && !isNonEmptyString(options.calibrationId)) {
    throw new TypeError("benchmark calibration id must be a non-empty string");
  }
  if (options.generatedAt !== undefined && !isNonEmptyString(options.generatedAt)) {
    throw new TypeError("benchmark calibration generatedAt must be a non-empty string");
  }
  if (options.baselineHostId !== undefined && !isNonEmptyString(options.baselineHostId)) {
    throw new TypeError("benchmark calibration baseline host id must be a non-empty string");
  }
  if (
    options.maxRelativeSpread !== undefined &&
    (!isFiniteNumber(options.maxRelativeSpread) || options.maxRelativeSpread < 0)
  ) {
    throw new TypeError("benchmark calibration maxRelativeSpread must be a non-negative finite number");
  }
  if (options.metricIds !== undefined && (!isNonEmptyStringArray(options.metricIds) || !hasUniqueStrings(options.metricIds))) {
    throw new TypeError("benchmark calibration metricIds must be unique non-empty strings");
  }
  if (options.evidenceRefs !== undefined && !isStringArray(options.evidenceRefs)) {
    throw new TypeError("benchmark calibration evidence refs must be strings");
  }
  if (!isNonEmptyStringArray(options.limitations)) {
    throw new TypeError("benchmark calibration limitations must be a non-empty string array");
  }
  if (options.notes !== undefined && !isStringArray(options.notes)) {
    throw new TypeError("benchmark calibration notes must be strings");
  }

  const sortedInputs = sortedBenchmarkCalibrationInputs(inputs);
  const hostIds = sortedInputs.map((input) => input.host.hostId);
  if (!hasUniqueStrings(hostIds)) {
    throw new TypeError("benchmark calibration host ids must be unique");
  }
  if (options.baselineHostId !== undefined && !hostIds.includes(options.baselineHostId)) {
    throw new TypeError(`benchmark calibration baseline host ${options.baselineHostId} is not declared`);
  }

  const firstReport = sortedInputs[0]?.report;
  if (firstReport === undefined) {
    throw new TypeError("benchmark calibration requires at least one report");
  }
  for (const input of sortedInputs) {
    if (input.report.benchmarkId !== firstReport.benchmarkId) {
      throw new TypeError("benchmark calibration reports must share a benchmark id");
    }
    if (canonicalJson(input.report.subject) !== canonicalJson(firstReport.subject)) {
      throw new TypeError("benchmark calibration reports must share a subject");
    }
  }

  const metricIds = options.metricIds ??
    sortedUniqueStrings(sortedInputs.flatMap((input) => input.report.metrics.map((metric) => metric.metricId)));
  const rows = metricIds.map((metricId): TextConformanceBenchmarkCalibrationMetricRowV1 => {
    const hostValues: TextConformanceBenchmarkCalibrationHostValueV1[] = [];
    const missingHostIds: string[] = [];
    const units = new Set<string>();
    const preferences = new Set<boolean>();
    for (const input of sortedInputs) {
      const metric = input.report.metrics.find((entry) => entry.metricId === metricId);
      if (metric === undefined) {
        missingHostIds.push(input.host.hostId);
        continue;
      }
      units.add(metric.unit);
      if (metric.higherIsPreferred !== undefined) preferences.add(metric.higherIsPreferred);
      hostValues.push({
        hostId: input.host.hostId,
        value: metric.value,
        generatedAt: input.report.generatedAt,
        evidenceRefs: input.report.evidenceRefs,
      });
    }
    if (hostValues.length === 0) {
      throw new TypeError(`benchmark calibration metric ${metricId} is missing from every host report`);
    }
    if (units.size !== 1) {
      throw new TypeError(`benchmark calibration metric ${metricId} has inconsistent units`);
    }
    if (preferences.size > 1) {
      throw new TypeError(`benchmark calibration metric ${metricId} has inconsistent preference direction`);
    }
    const values = hostValues.map((entry) => entry.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    const median = medianNumber(values);
    const relativeSpread = calibrationRelativeSpread(min, max, mean);
    const baselineValue = options.baselineHostId === undefined
      ? undefined
      : hostValues.find((entry) => entry.hostId === options.baselineHostId)?.value;
    const unit = [...units][0];
    if (unit === undefined) throw new TypeError(`benchmark calibration metric ${metricId} unit is missing`);
    const preference = [...preferences][0];
    return {
      metricId,
      unit,
      ...(preference === undefined ? {} : { higherIsPreferred: preference }),
      status: calibrationStatus(missingHostIds.length, options.maxRelativeSpread, relativeSpread),
      hostCount: sortedInputs.length,
      observedHostCount: hostValues.length,
      missingHostIds,
      min,
      max,
      mean,
      median,
      relativeSpread,
      ...(options.baselineHostId === undefined || baselineValue === undefined
        ? {}
        : {
          baselineHostId: options.baselineHostId,
          baselineValue,
          baselineDelta: mean - baselineValue,
          baselineRatio: baselineValue === 0 ? (mean === 0 ? 1 : null) : mean / baselineValue,
        }),
      hostValues,
    };
  });

  const evidenceRefs = sortedUniqueStrings([
    ...(options.evidenceRefs ?? []),
    ...sortedInputs.flatMap((input) => input.host.evidenceRefs ?? []),
    ...sortedInputs.flatMap((input) => input.report.evidenceRefs),
  ]);
  const report = {
    schemaVersion: conformanceBenchmarkCalibrationReportSchemaVersion,
    artifactType: "textconformance-benchmark-calibration-report-v1",
    calibrationId: options.calibrationId ?? `calibration:${firstReport.benchmarkId}`,
    benchmarkId: firstReport.benchmarkId,
    subject: firstReport.subject,
    generatedAt: options.generatedAt ?? firstReport.generatedAt,
    hostCount: sortedInputs.length,
    metricCount: rows.length,
    ...(options.baselineHostId === undefined ? {} : { baselineHostId: options.baselineHostId }),
    ...(options.maxRelativeSpread === undefined ? {} : { maxRelativeSpread: options.maxRelativeSpread }),
    summary: {
      observed: rows.filter((row) => row.status === "observed").length,
      stable: rows.filter((row) => row.status === "stable").length,
      variable: rows.filter((row) => row.status === "variable").length,
      incomplete: rows.filter((row) => row.status === "incomplete").length,
    },
    hosts: sortedInputs.map((input) => input.host),
    rows,
    evidenceRefs,
    limitations: [...options.limitations],
    ...(options.notes === undefined ? {} : { notes: [...options.notes] }),
  } satisfies TextConformanceBenchmarkCalibrationReportV1;
  if (!isTextConformanceBenchmarkCalibrationReportV1(report)) {
    throw new TypeError("benchmark calibration report is invalid");
  }
  return report;
}

function benchmarkThresholdBoundsText(row: TextConformanceBenchmarkThresholdEvaluationRowV1): string {
  const entries = [
    row.min === undefined ? "" : `min=${row.min}`,
    row.max === undefined ? "" : `max=${row.max}`,
    row.warnMin === undefined ? "" : `warnMin=${row.warnMin}`,
    row.warnMax === undefined ? "" : `warnMax=${row.warnMax}`,
  ].filter((entry) => entry.length > 0);
  return entries.join("; ");
}

export function renderTextConformanceBenchmarkThresholdEvaluationMarkdown(
  evaluation: TextConformanceBenchmarkThresholdEvaluationReportV1,
  options: TextConformanceMarkdownRenderOptions = {},
): string {
  if (!isTextConformanceBenchmarkThresholdEvaluationReportV1(evaluation)) {
    throw new TypeError("benchmark threshold evaluation is invalid");
  }
  const title = options.title ?? `Benchmark threshold evaluation ${evaluation.benchmarkId}`;
  const rows = evaluation.rows.map((row) =>
    [
      markdownTableCell(row.metricId),
      markdownTableCell(row.status),
      markdownTableCell(row.value === undefined ? undefined : String(row.value)),
      markdownTableCell(row.unit),
      markdownTableCell(benchmarkThresholdBoundsText(row)),
      markdownTableCell(row.message),
      markdownTableList(row.evidenceRefs),
    ].join(" | "),
  );
  return [
    `# ${markdownText(title)}`,
    "",
    `- **Policy:** ${markdownText(evaluation.policyId)}`,
    `- **Benchmark:** ${markdownText(evaluation.benchmarkId)}`,
    `- **Summary:** pass=${evaluation.summary.pass}; warn=${evaluation.summary.warn}; fail=${evaluation.summary.fail}; missing=${evaluation.summary.missing}`,
    "",
    "| Metric | Status | Value | Unit | Bounds | Message | Evidence |",
    "| --- | --- | ---: | --- | --- | --- | --- |",
    ...rows.map((row) => `| ${row} |`),
    "",
  ].join("\n");
}

function calibrationNumberText(value: number | null | undefined): string | undefined {
  if (value === undefined) return undefined;
  if (value === null) return "n/a";
  return String(value);
}

export function renderTextConformanceBenchmarkCalibrationMarkdown(
  calibration: TextConformanceBenchmarkCalibrationReportV1,
  options: TextConformanceMarkdownRenderOptions = {},
): string {
  if (!isTextConformanceBenchmarkCalibrationReportV1(calibration)) {
    throw new TypeError("benchmark calibration report is invalid");
  }
  const title = options.title ?? `Benchmark calibration ${calibration.benchmarkId}`;
  const rows = calibration.rows.map((row) =>
    [
      markdownTableCell(row.metricId),
      markdownTableCell(row.status),
      markdownTableCell(String(row.observedHostCount)),
      markdownTableList(row.missingHostIds),
      markdownTableCell(calibrationNumberText(row.min)),
      markdownTableCell(calibrationNumberText(row.max)),
      markdownTableCell(calibrationNumberText(row.mean)),
      markdownTableCell(calibrationNumberText(row.median)),
      markdownTableCell(calibrationNumberText(row.relativeSpread)),
      markdownTableCell(row.baselineHostId),
      markdownTableCell(calibrationNumberText(row.baselineRatio)),
    ].join(" | "),
  );
  return [
    `# ${markdownText(title)}`,
    "",
    `- **Calibration:** ${markdownText(calibration.calibrationId)}`,
    `- **Benchmark:** ${markdownText(calibration.benchmarkId)}`,
    `- **Hosts:** ${calibration.hostCount}`,
    `- **Summary:** observed=${calibration.summary.observed}; stable=${calibration.summary.stable}; variable=${calibration.summary.variable}; incomplete=${calibration.summary.incomplete}`,
    "",
    "| Metric | Status | Observed hosts | Missing hosts | Min | Max | Mean | Median | Relative spread | Baseline host | Baseline ratio |",
    "| --- | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | --- | ---: |",
    ...rows.map((row) => `| ${row} |`),
    "",
  ].join("\n");
}

function benchmarkMatrixSubjectText(subject: TextConformanceReportSubject): string {
  return `${subject.kind}:${subject.id}`;
}

export function renderTextConformanceBenchmarkMatrixMarkdown(
  matrix: TextConformanceBenchmarkMatrixReportV1,
  options: TextConformanceMarkdownRenderOptions = {},
): string {
  if (!isTextConformanceBenchmarkMatrixReportV1(matrix)) {
    throw new TypeError("benchmark matrix report is invalid");
  }
  const title = options.title ?? `Benchmark matrix ${matrix.matrixId}`;
  const rows = matrix.rows.map((row) =>
    [
      markdownTableCell(row.benchmarkId),
      markdownTableCell(benchmarkMatrixSubjectText(row.subject)),
      markdownTableCell(row.metricId),
      markdownTableCell(row.status),
      markdownTableCell(String(row.observedRunCount)),
      markdownTableList(row.missingRunIds),
      markdownTableCell(calibrationNumberText(row.min)),
      markdownTableCell(calibrationNumberText(row.max)),
      markdownTableCell(calibrationNumberText(row.mean)),
      markdownTableCell(calibrationNumberText(row.median)),
    ].join(" | "),
  );
  return [
    `# ${markdownText(title)}`,
    "",
    `- **Matrix:** ${markdownText(matrix.matrixId)}`,
    `- **Runs:** ${matrix.runCount}`,
    `- **Benchmarks:** ${matrix.benchmarkCount}`,
    `- **Subjects:** ${matrix.subjectCount}`,
    `- **Hosts:** ${matrix.hostCount}`,
    `- **Summary:** complete=${matrix.summary.complete}; incomplete=${matrix.summary.incomplete}`,
    "",
    "| Benchmark | Subject | Metric | Status | Observed runs | Missing runs | Min | Max | Mean | Median |",
    "| --- | --- | --- | --- | ---: | --- | ---: | ---: | ---: | ---: |",
    ...rows.map((row) => `| ${row} |`),
    "",
  ].join("\n");
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
