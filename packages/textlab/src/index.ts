export const packageName = "@ismail-elkorchi/textlab" as const;

export type PackageName = typeof packageName;
export type TextlabSupportStatusLabel =
  | "scaffold"
  | "readiness-only"
  | "slice-proven"
  | "beta"
  | "production-candidate";
export type TextlabSupportStatusRowKind = "package" | "task";

export interface TextlabSupportStatusEntry {
  readonly status: TextlabSupportStatusLabel;
  readonly scope: string;
  readonly evidence: readonly string[];
  readonly limitations: readonly string[];
}

export interface TextlabSupportStatusPackageEntry extends TextlabSupportStatusEntry {
  readonly name: string;
}

export interface TextlabSupportStatusTaskEntry extends TextlabSupportStatusEntry {
  readonly id: string;
}

export interface TextlabSupportStatusDocument {
  readonly schemaVersion: 1;
  readonly packages: readonly TextlabSupportStatusPackageEntry[];
  readonly tasks: readonly TextlabSupportStatusTaskEntry[];
}

export interface TextlabSupportStatusRow extends TextlabSupportStatusEntry {
  readonly kind: TextlabSupportStatusRowKind;
  readonly id: string;
}

export interface TextlabSupportStatusCount {
  readonly status: TextlabSupportStatusLabel;
  readonly count: number;
}

export interface TextlabSupportStatusSummary {
  readonly schemaVersion: 1;
  readonly packageRows: readonly TextlabSupportStatusRow[];
  readonly taskRows: readonly TextlabSupportStatusRow[];
  readonly counts: readonly TextlabSupportStatusCount[];
}

export interface TextlabTaskEvidenceEntry {
  readonly taskId: string;
  readonly supportStatus: string;
  readonly claimBoundary: string;
  readonly reportPath: string;
  readonly evidenceRefs: readonly string[];
  readonly comparatorRefs?: readonly string[];
  readonly knownGaps?: readonly string[];
}

export interface TextlabTaskEvidenceManifest {
  readonly schemaVersion: 1;
  readonly generatedAt: string;
  readonly tasks: readonly TextlabTaskEvidenceEntry[];
}

export interface TextlabEvidenceSummaryRow {
  readonly taskId: string;
  readonly supportStatus: string;
  readonly reportPath: string;
  readonly evidenceRefCount: number;
  readonly comparatorRefCount: number;
  readonly knownGapCount: number;
  readonly hasComparatorEvidence: boolean;
}

export interface TextlabEvidenceSummary {
  readonly schemaVersion: 1;
  readonly generatedAt: string;
  readonly rows: readonly TextlabEvidenceSummaryRow[];
}

export interface TextlabConformanceReportSummary {
  readonly schemaVersion: 1;
  readonly reportId: string;
  readonly subject: string;
  readonly pass: number;
  readonly fail: number;
  readonly notRun: number;
  readonly checkCount: number;
}

const statusLabels: readonly TextlabSupportStatusLabel[] = [
  "scaffold",
  "readiness-only",
  "slice-proven",
  "beta",
  "production-candidate",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((entry) => isNonEmptyString(entry));
}

function isSupportStatusLabel(value: unknown): value is TextlabSupportStatusLabel {
  return typeof value === "string" && statusLabels.includes(value as TextlabSupportStatusLabel);
}

function isSupportStatusEntry(value: unknown): value is TextlabSupportStatusEntry {
  return (
    isRecord(value) &&
    isSupportStatusLabel(value.status) &&
    isNonEmptyString(value.scope) &&
    isStringArray(value.evidence) &&
    value.evidence.length > 0 &&
    isStringArray(value.limitations) &&
    value.limitations.length > 0
  );
}

function isSupportStatusPackageEntry(value: unknown): value is TextlabSupportStatusPackageEntry {
  return isRecord(value) && isSupportStatusEntry(value) && isNonEmptyString(value.name);
}

function isSupportStatusTaskEntry(value: unknown): value is TextlabSupportStatusTaskEntry {
  return isRecord(value) && isSupportStatusEntry(value) && isNonEmptyString(value.id);
}

function compareRows(left: TextlabSupportStatusRow, right: TextlabSupportStatusRow): number {
  return `${left.kind}\u0000${left.id}`.localeCompare(`${right.kind}\u0000${right.id}`);
}

function toPackageRow(entry: TextlabSupportStatusPackageEntry): TextlabSupportStatusRow {
  return {
    kind: "package",
    id: entry.name,
    status: entry.status,
    scope: entry.scope,
    evidence: entry.evidence,
    limitations: entry.limitations,
  };
}

function toTaskRow(entry: TextlabSupportStatusTaskEntry): TextlabSupportStatusRow {
  return {
    kind: "task",
    id: entry.id,
    status: entry.status,
    scope: entry.scope,
    evidence: entry.evidence,
    limitations: entry.limitations,
  };
}

function countRows(rows: readonly TextlabSupportStatusRow[]): readonly TextlabSupportStatusCount[] {
  return statusLabels
    .map((status) => ({
      status,
      count: rows.filter((row) => row.status === status).length,
    }))
    .filter((entry) => entry.count > 0);
}

function renderRow(row: TextlabSupportStatusRow): string {
  return `- ${row.kind}:${row.id} [${row.status}]`;
}

function isTaskEvidenceEntry(value: unknown): value is TextlabTaskEvidenceEntry {
  return (
    isRecord(value) &&
    isNonEmptyString(value.taskId) &&
    isNonEmptyString(value.supportStatus) &&
    isNonEmptyString(value.claimBoundary) &&
    isNonEmptyString(value.reportPath) &&
    isStringArray(value.evidenceRefs) &&
    value.evidenceRefs.length > 0 &&
    (value.comparatorRefs === undefined || isStringArray(value.comparatorRefs)) &&
    (value.knownGaps === undefined || isStringArray(value.knownGaps))
  );
}

function compareEvidenceRows(
  left: TextlabEvidenceSummaryRow,
  right: TextlabEvidenceSummaryRow,
): number {
  return left.taskId.localeCompare(right.taskId);
}

export function isTextlabSupportStatusDocument(value: unknown): value is TextlabSupportStatusDocument {
  return (
    isRecord(value) &&
    value.schemaVersion === 1 &&
    Array.isArray(value.packages) &&
    value.packages.every((entry) => isSupportStatusPackageEntry(entry)) &&
    Array.isArray(value.tasks) &&
    value.tasks.every((entry) => isSupportStatusTaskEntry(entry))
  );
}

export function summarizeSupportStatus(
  document: TextlabSupportStatusDocument,
): TextlabSupportStatusSummary {
  if (!isTextlabSupportStatusDocument(document)) {
    throw new TypeError("support status document is invalid");
  }

  const packageRows = document.packages.map(toPackageRow).sort(compareRows);
  const taskRows = document.tasks.map(toTaskRow).sort(compareRows);
  const allRows = [...packageRows, ...taskRows].sort(compareRows);

  return {
    schemaVersion: 1,
    packageRows,
    taskRows,
    counts: countRows(allRows),
  };
}

export function renderSupportStatusSummary(summary: TextlabSupportStatusSummary): string {
  return [
    "# textlab support-status summary",
    "",
    "## Counts",
    ...summary.counts.map((entry) => `- ${entry.status}: ${entry.count}`),
    "",
    "## Packages",
    ...summary.packageRows.map(renderRow),
    "",
    "## Tasks",
    ...summary.taskRows.map(renderRow),
    "",
  ].join("\n");
}

export function isTextlabTaskEvidenceManifest(value: unknown): value is TextlabTaskEvidenceManifest {
  return (
    isRecord(value) &&
    value.schemaVersion === 1 &&
    isNonEmptyString(value.generatedAt) &&
    Array.isArray(value.tasks) &&
    value.tasks.length > 0 &&
    value.tasks.every((entry) => isTaskEvidenceEntry(entry))
  );
}

export function summarizeEvidenceManifest(
  manifest: TextlabTaskEvidenceManifest,
): TextlabEvidenceSummary {
  if (!isTextlabTaskEvidenceManifest(manifest)) {
    throw new TypeError("task evidence manifest is invalid");
  }

  return {
    schemaVersion: 1,
    generatedAt: manifest.generatedAt,
    rows: manifest.tasks
      .map((entry) => {
        const comparatorRefCount = entry.comparatorRefs?.length ?? 0;
        return {
          taskId: entry.taskId,
          supportStatus: entry.supportStatus,
          reportPath: entry.reportPath,
          evidenceRefCount: entry.evidenceRefs.length,
          comparatorRefCount,
          knownGapCount: entry.knownGaps?.length ?? 0,
          hasComparatorEvidence: comparatorRefCount > 0,
        };
      })
      .sort(compareEvidenceRows),
  };
}

export function renderEvidenceManifestSummary(summary: TextlabEvidenceSummary): string {
  return [
    "# textlab evidence summary",
    "",
    `Generated: ${summary.generatedAt}`,
    "",
    "## Tasks",
    ...summary.rows.map(
      (row) =>
        `- ${row.taskId} [${row.supportStatus}] evidence=${row.evidenceRefCount} comparators=${row.comparatorRefCount} gaps=${row.knownGapCount} report=${row.reportPath}`,
    ),
    "",
  ].join("\n");
}

export function summarizeConformanceReport(value: unknown): TextlabConformanceReportSummary {
  if (!isRecord(value)) {
    throw new TypeError("conformance report is invalid");
  }
  const subject = value.subject;
  const summary = value.summary;
  const checks = value.checks;
  if (
    value.schemaVersion !== 1 ||
    !isNonEmptyString(value.reportId) ||
    !isRecord(subject) ||
    !isNonEmptyString(subject.kind) ||
    !isNonEmptyString(subject.id) ||
    !isRecord(summary) ||
    typeof summary.pass !== "number" ||
    typeof summary.fail !== "number" ||
    typeof summary.notRun !== "number" ||
    !Array.isArray(checks)
  ) {
    throw new TypeError("conformance report is invalid");
  }

  return {
    schemaVersion: 1,
    reportId: value.reportId,
    subject: `${subject.kind}:${subject.id}`,
    pass: summary.pass,
    fail: summary.fail,
    notRun: summary.notRun,
    checkCount: checks.length,
  };
}

export function renderConformanceReportSummary(summary: TextlabConformanceReportSummary): string {
  return [
    "# textlab conformance report summary",
    "",
    `Report: ${summary.reportId}`,
    `Subject: ${summary.subject}`,
    `Checks: ${summary.checkCount}`,
    `Pass: ${summary.pass}`,
    `Fail: ${summary.fail}`,
    `Not run: ${summary.notRun}`,
    "",
  ].join("\n");
}
