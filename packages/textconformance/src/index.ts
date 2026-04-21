export const packageName = "@ismail-elkorchi/textconformance" as const;
export const conformanceReportSchemaId =
  "urn:ismail-elkorchi:textconformance:report:v1" as const;
export const conformanceReportSchemaVersion = 1 as const;

export type PackageName = typeof packageName;
export type TextConformanceReportSchemaId = typeof conformanceReportSchemaId;
export type TextConformanceReportSchemaVersion = typeof conformanceReportSchemaVersion;

export type TextConformanceCheckStatus = "pass" | "fail" | "not-run";

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
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
