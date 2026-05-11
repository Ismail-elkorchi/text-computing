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
