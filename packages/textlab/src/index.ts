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

export interface TextlabCount {
  readonly id: string;
  readonly count: number;
}

export interface TextlabAnnotationInspectionOptions {
  readonly layerKinds?: readonly string[];
  readonly lifecycleStates?: readonly string[];
  readonly annotationIds?: readonly string[];
}

export interface TextlabAnnotationInspectionRow {
  readonly layerId: string;
  readonly layerKind: string;
  readonly viewId: string;
  readonly annotationId: string;
  readonly annotationKind: string;
  readonly lifecycleState: string;
  readonly targetCount: number;
  readonly targetKinds: readonly string[];
  readonly graphEdgeCount: number;
  readonly details: readonly string[];
}

export interface TextlabAnnotationInspection {
  readonly schemaVersion: 1;
  readonly documentId: string;
  readonly revision: string;
  readonly layerCount: number;
  readonly annotationCount: number;
  readonly graphEdgeCount: number;
  readonly layerKindCounts: readonly TextlabCount[];
  readonly lifecycleCounts: readonly TextlabCount[];
  readonly rows: readonly TextlabAnnotationInspectionRow[];
}

export interface TextlabEvidenceReplayComparisonSummary {
  readonly status: string;
  readonly count: number;
}

export interface TextlabEvidenceReplayRow {
  readonly task: string;
  readonly taskId: string;
  readonly status: string;
  readonly validatorCount: number;
  readonly comparatorCount: number;
  readonly passedComparisonCount: number;
  readonly failedComparisonCount: number;
  readonly notRunComparisonCount: number;
  readonly conformanceReportCount: number;
  readonly knownGapCount: number;
}

export interface TextlabEvidenceReplayInspection {
  readonly schemaVersion: 1;
  readonly generatedAt: string;
  readonly rows: readonly TextlabEvidenceReplayRow[];
  readonly statusCounts: readonly TextlabEvidenceReplayComparisonSummary[];
  readonly comparisonStatusCounts: readonly TextlabEvidenceReplayComparisonSummary[];
}

export interface TextlabCorpusFixtureInspection {
  readonly schemaVersion: 1;
  readonly corpusId: string;
  readonly formulaIds: readonly string[];
  readonly documentCount: number;
  readonly emptyDocumentCount: number;
  readonly termCount: number;
  readonly queryCount: number;
  readonly hitCount: number;
  readonly scoredHitCount: number;
  readonly explainEntryCount: number;
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

function countById(values: readonly string[]): readonly TextlabCount[] {
  const counts = new Map<string, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([id, count]) => ({ id, count }));
}

function stringSet(values: readonly unknown[]): readonly string[] {
  return [...new Set(values.filter((value): value is string => isNonEmptyString(value)))].sort();
}

function annotationGraphEdgeCount(annotation: Record<string, unknown>): number {
  switch (annotation.kind) {
    case "relation":
      return Array.isArray(annotation.arguments) ? annotation.arguments.length : 0;
    case "coreference-chain":
      return Array.isArray(annotation.mentionIds) ? annotation.mentionIds.length : 0;
    case "entity-link":
      return isRecord(annotation.link) || isRecord(annotation.nil) ? 1 : 0;
    case "dependency":
      return 1;
    default:
      return 0;
  }
}

function annotationDetails(annotation: Record<string, unknown>): readonly string[] {
  switch (annotation.kind) {
    case "relation":
      return [
        isNonEmptyString(annotation.relationType) ? `type=${annotation.relationType}` : "type=<missing>",
        `arguments=${Array.isArray(annotation.arguments) ? annotation.arguments.length : 0}`,
      ];
    case "coreference-chain":
      return [
        `mentions=${Array.isArray(annotation.mentionIds) ? annotation.mentionIds.length : 0}`,
        isNonEmptyString(annotation.representativeMentionId)
          ? `representative=${annotation.representativeMentionId}`
          : "representative=<none>",
      ];
    case "entity-link":
      if (isRecord(annotation.link)) {
        const namespace = isNonEmptyString(annotation.link.namespace) ? annotation.link.namespace : "<missing>";
        const id = isNonEmptyString(annotation.link.id) ? annotation.link.id : "<missing>";
        return [`link=${namespace}:${id}`];
      }
      if (isRecord(annotation.nil)) {
        return [
          `nil=${isNonEmptyString(annotation.nil.reason) ? annotation.nil.reason : "<missing>"}`,
        ];
      }
      return ["link=<none>"];
    case "dependency":
      return [
        `dependent=${isNonEmptyString(annotation.dependentNodeId) ? annotation.dependentNodeId : "<missing>"}`,
        `head=${isNonEmptyString(annotation.headNodeId) ? annotation.headNodeId : "<root>"}`,
        `relation=${isNonEmptyString(annotation.relation) ? annotation.relation : "<missing>"}`,
      ];
    default:
      return [];
  }
}

function isTextdocInspectionDocument(value: unknown): value is Record<string, unknown> {
  if (
    !isRecord(value) ||
    value.schemaVersion !== 1 ||
    !isNonEmptyString(value.documentId) ||
    !isNonEmptyString(value.revision) ||
    !Array.isArray(value.layers)
  ) {
    return false;
  }

  return value.layers.every((layer) => {
    if (
      !isRecord(layer) ||
      !isNonEmptyString(layer.id) ||
      !isNonEmptyString(layer.kind) ||
      !isNonEmptyString(layer.viewId) ||
      !Array.isArray(layer.annotations)
    ) {
      return false;
    }
    return layer.annotations.every(
      (annotation) =>
        isRecord(annotation) &&
        isNonEmptyString(annotation.id) &&
        isNonEmptyString(annotation.kind) &&
        isRecord(annotation.lifecycle) &&
        isNonEmptyString(annotation.lifecycle.state) &&
        Array.isArray(annotation.targets) &&
        annotation.targets.every((target) => isRecord(target) && isNonEmptyString(target.kind)),
    );
  });
}

function compareAnnotationRows(
  left: TextlabAnnotationInspectionRow,
  right: TextlabAnnotationInspectionRow,
): number {
  return `${left.layerId}\u0000${left.annotationId}`.localeCompare(
    `${right.layerId}\u0000${right.annotationId}`,
  );
}

function rowMatchesOptions(
  row: TextlabAnnotationInspectionRow,
  options: TextlabAnnotationInspectionOptions,
): boolean {
  return (
    (options.layerKinds === undefined || options.layerKinds.includes(row.layerKind)) &&
    (options.lifecycleStates === undefined ||
      options.lifecycleStates.includes(row.lifecycleState)) &&
    (options.annotationIds === undefined || options.annotationIds.includes(row.annotationId))
  );
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

export function inspectTextdocAnnotations(
  document: unknown,
  options: TextlabAnnotationInspectionOptions = {},
): TextlabAnnotationInspection {
  if (!isTextdocInspectionDocument(document)) {
    throw new TypeError("textdoc document is invalid");
  }

  const allRows: TextlabAnnotationInspectionRow[] = [];
  for (const layer of document.layers as readonly Record<string, unknown>[]) {
    for (const annotation of layer.annotations as readonly Record<string, unknown>[]) {
      const lifecycle = annotation.lifecycle as Record<string, unknown>;
      const targets = annotation.targets as readonly Record<string, unknown>[];
      allRows.push({
        layerId: layer.id as string,
        layerKind: layer.kind as string,
        viewId: layer.viewId as string,
        annotationId: annotation.id as string,
        annotationKind: annotation.kind as string,
        lifecycleState: lifecycle.state as string,
        targetCount: targets.length,
        targetKinds: stringSet(targets.map((target) => target.kind)),
        graphEdgeCount: annotationGraphEdgeCount(annotation),
        details: annotationDetails(annotation),
      });
    }
  }

  const rows = allRows.filter((row) => rowMatchesOptions(row, options)).sort(compareAnnotationRows);

  return {
    schemaVersion: 1,
    documentId: document.documentId as string,
    revision: document.revision as string,
    layerCount: (document.layers as readonly unknown[]).length,
    annotationCount: allRows.length,
    graphEdgeCount: allRows.reduce((sum, row) => sum + row.graphEdgeCount, 0),
    layerKindCounts: countById(
      (document.layers as readonly Record<string, unknown>[]).map((layer) => layer.kind as string),
    ),
    lifecycleCounts: countById(allRows.map((row) => row.lifecycleState)),
    rows,
  };
}

export function renderTextdocAnnotationInspection(
  inspection: TextlabAnnotationInspection,
): string {
  return [
    "# textlab annotation inspection",
    "",
    `Document: ${inspection.documentId}`,
    `Revision: ${inspection.revision}`,
    `Layers: ${inspection.layerCount}`,
    `Annotations: ${inspection.annotationCount}`,
    `Graph edges: ${inspection.graphEdgeCount}`,
    "",
    "## Layer kinds",
    ...inspection.layerKindCounts.map((entry) => `- ${entry.id}: ${entry.count}`),
    "",
    "## Lifecycles",
    ...inspection.lifecycleCounts.map((entry) => `- ${entry.id}: ${entry.count}`),
    "",
    "## Rows",
    ...inspection.rows.map(
      (row) =>
        `- ${row.layerId} ${row.annotationKind}:${row.annotationId} lifecycle=${row.lifecycleState} targets=${row.targetCount} targetKinds=${row.targetKinds.join(",")} graphEdges=${row.graphEdgeCount}${
          row.details.length > 0 ? ` details=${row.details.join(";")}` : ""
        }`,
    ),
    "",
  ].join("\n");
}

function isEvidenceReplayDocument(value: unknown): value is Record<string, unknown> {
  if (
    !isRecord(value) ||
    value.schemaVersion !== 1 ||
    !isNonEmptyString(value.generatedAt) ||
    !Array.isArray(value.tasks)
  ) {
    return false;
  }

  return value.tasks.every(
    (task) =>
      isRecord(task) &&
      isNonEmptyString(task.task) &&
      isNonEmptyString(task.taskId) &&
      isNonEmptyString(task.status) &&
      Array.isArray(task.validators) &&
      Array.isArray(task.comparisons) &&
      (task.conformanceReportRefs === undefined || isStringArray(task.conformanceReportRefs)) &&
      (task.knownGap === undefined || isNonEmptyString(task.knownGap)),
  );
}

function comparisonStatusCounts(tasks: readonly Record<string, unknown>[]) {
  const statuses: string[] = [];
  for (const task of tasks) {
    for (const comparison of task.comparisons as readonly unknown[]) {
      if (isRecord(comparison) && isNonEmptyString(comparison.status)) {
        statuses.push(comparison.status);
      }
    }
  }
  return countById(statuses).map(({ id, count }) => ({ status: id, count }));
}

export function inspectEvidenceReplay(document: unknown): TextlabEvidenceReplayInspection {
  if (!isEvidenceReplayDocument(document)) {
    throw new TypeError("evidence replay document is invalid");
  }

  const tasks = document.tasks as readonly Record<string, unknown>[];
  const rows = tasks
    .map((task) => {
      const comparisons = task.comparisons as readonly unknown[];
      const comparisonStatuses = comparisons
        .filter(isRecord)
        .map((comparison) => comparison.status)
        .filter((status): status is string => isNonEmptyString(status));
      return {
        task: task.task as string,
        taskId: task.taskId as string,
        status: task.status as string,
        validatorCount: (task.validators as readonly unknown[]).length,
        comparatorCount: comparisons.length,
        passedComparisonCount: comparisonStatuses.filter((status) => status === "pass").length,
        failedComparisonCount: comparisonStatuses.filter((status) => status === "fail").length,
        notRunComparisonCount: comparisonStatuses.filter((status) => status === "not-run").length,
        conformanceReportCount: Array.isArray(task.conformanceReportRefs)
          ? task.conformanceReportRefs.length
          : 0,
        knownGapCount: isNonEmptyString(task.knownGap) ? 1 : 0,
      };
    })
    .sort((left, right) => left.taskId.localeCompare(right.taskId));

  return {
    schemaVersion: 1,
    generatedAt: document.generatedAt as string,
    rows,
    statusCounts: countById(rows.map((row) => row.status)).map(({ id, count }) => ({
      status: id,
      count,
    })),
    comparisonStatusCounts: comparisonStatusCounts(tasks),
  };
}

export function renderEvidenceReplayInspection(
  inspection: TextlabEvidenceReplayInspection,
): string {
  return [
    "# textlab evidence replay inspection",
    "",
    `Generated: ${inspection.generatedAt}`,
    "",
    "## Task statuses",
    ...inspection.statusCounts.map((entry) => `- ${entry.status}: ${entry.count}`),
    "",
    "## Comparison statuses",
    ...inspection.comparisonStatusCounts.map((entry) => `- ${entry.status}: ${entry.count}`),
    "",
    "## Tasks",
    ...inspection.rows.map(
      (row) =>
        `- ${row.taskId} [${row.status}] validators=${row.validatorCount} comparators=${row.comparatorCount} passComparisons=${row.passedComparisonCount} failComparisons=${row.failedComparisonCount} notRunComparisons=${row.notRunComparisonCount} reports=${row.conformanceReportCount} gaps=${row.knownGapCount}`,
    ),
    "",
  ].join("\n");
}

function isCorpusInspectionDocument(value: unknown): value is Record<string, unknown> {
  return (
    isRecord(value) &&
    value.schemaVersion === 1 &&
    isNonEmptyString(value.corpusId) &&
    Array.isArray(value.queries) &&
    (value.documents === undefined || Array.isArray(value.documents)) &&
    (value.termOrder === undefined || isStringArray(value.termOrder)) &&
    (value.formulaSet === undefined || isStringArray(value.formulaSet)) &&
    (value.formula === undefined || isNonEmptyString(value.formula))
  );
}

function numericScore(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function collectTerms(document: Record<string, unknown>): readonly string[] {
  if (isStringArray(document.termOrder)) return document.termOrder;
  const terms: string[] = [];
  for (const entry of Array.isArray(document.documents) ? document.documents : []) {
    if (!isRecord(entry)) continue;
    for (const listName of ["tf", "tfidf"] as const) {
      const rows = entry[listName];
      if (!Array.isArray(rows)) continue;
      for (const row of rows) {
        if (isRecord(row) && isNonEmptyString(row.term)) terms.push(row.term);
      }
    }
  }
  for (const query of document.queries as readonly unknown[]) {
    if (isRecord(query) && isStringArray(query.tokens)) terms.push(...query.tokens);
  }
  return stringSet(terms);
}

function collectFormulaIds(document: Record<string, unknown>): readonly string[] {
  const formulas: string[] = [];
  if (isStringArray(document.formulaSet)) formulas.push(...document.formulaSet);
  if (isNonEmptyString(document.formula)) formulas.push(document.formula);
  return stringSet(formulas);
}

export function inspectCorpusFixture(document: unknown): TextlabCorpusFixtureInspection {
  if (!isCorpusInspectionDocument(document)) {
    throw new TypeError("corpus fixture is invalid");
  }

  const documents = Array.isArray(document.documents) ? document.documents : [];
  const queries = document.queries as readonly unknown[];
  let hitCount = 0;
  let scoredHitCount = 0;
  let explainEntryCount = 0;

  for (const query of queries) {
    if (!isRecord(query)) continue;
    for (const listName of ["hits", "bm25"] as const) {
      const hits = query[listName];
      if (!Array.isArray(hits)) continue;
      hitCount += hits.length;
      for (const hit of hits) {
        if (!isRecord(hit)) continue;
        if (numericScore(hit.score) > 0) scoredHitCount += 1;
        if (Array.isArray(hit.explain)) explainEntryCount += hit.explain.length;
      }
    }
  }

  return {
    schemaVersion: 1,
    corpusId: document.corpusId as string,
    formulaIds: collectFormulaIds(document),
    documentCount: documents.length,
    emptyDocumentCount: documents.filter((entry) => isRecord(entry) && entry.length === 0).length,
    termCount: collectTerms(document).length,
    queryCount: queries.length,
    hitCount,
    scoredHitCount,
    explainEntryCount,
  };
}

export function renderCorpusFixtureInspection(
  inspection: TextlabCorpusFixtureInspection,
): string {
  return [
    "# textlab corpus fixture inspection",
    "",
    `Corpus: ${inspection.corpusId}`,
    `Documents: ${inspection.documentCount}`,
    `Empty documents: ${inspection.emptyDocumentCount}`,
    `Terms: ${inspection.termCount}`,
    `Queries: ${inspection.queryCount}`,
    `Hits: ${inspection.hitCount}`,
    `Scored hits: ${inspection.scoredHitCount}`,
    `Explain entries: ${inspection.explainEntryCount}`,
    `Formulas: ${inspection.formulaIds.join(",")}`,
    "",
  ].join("\n");
}
