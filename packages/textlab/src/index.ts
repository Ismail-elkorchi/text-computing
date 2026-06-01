import {
  diffTextConformanceReports,
  isTextConformanceBenchmarkReportV1,
  isTextConformanceReportV1,
  type TextConformanceReportDiffV1,
} from "@ismail-elkorchi/textconformance";
import {
  isTextCorpusArtifactV1,
  isTextCorpusCitationWindowSetV1,
  isTextCorpusCollocateResultV1,
  isTextCorpusConcordanceResultV1,
  isTextCorpusCooccurrenceResultV1,
  isTextCorpusFrequencyResultV1,
  isTextCorpusMetricEnvelopePayloadV1,
  isTextCorpusNgramResultV1,
  isTextCorpusPairwiseRelationResultV1,
  isTextCorpusQuoteGroundingResultV1,
  isTextCorpusRetrievalCalibrationReportV1,
  isTextCorpusRetrievalEvaluationResultV1,
  isTextCorpusRetrievalIndexArtifactV1,
  isTextCorpusRetrievalIndexStorageRefV1,
  isTextCorpusRetrievalIndexV1,
  isTextCorpusRetrievalQrelsV1,
  isTextCorpusRetrievalResultV1,
  isTextCorpusScoringResultV1,
} from "@ismail-elkorchi/textcorpus";
import { isTextDocDocumentV1 } from "@ismail-elkorchi/textdoc";
import {
  createTextPackReviewReport,
  createTextPackResourceRegistry,
  isTextPackManifestV1,
  isTextPackReviewReportV1,
  validateTextPackResourceInventory,
  validateTextPackManifestGovernance,
  type TextPackManifestGovernanceDiagnostic,
  type TextPackReviewDiagnostic,
  type TextPackReviewPolicy,
  type TextPackReviewReportV1,
  type TextPackReviewRequirementResult,
  type TextPackResourceInventoryDiagnostic,
} from "@ismail-elkorchi/textpack";
import {
  isTextPipelineBatchRunReportV1,
  isTextPipelineTraceV1,
  type TextPipelineTraceEntry,
} from "@ismail-elkorchi/textpipeline";
import {
  checkTextProtocolSchemaFamilyEnvelope,
  checkTextProtocolResultEnvelopeCompatibility,
  getTextProtocolPayloadKindDescriptor,
  getTextProtocolSchemaFamilyDescriptorBySchemaId,
  isTextProtocolProducerRef,
  isTextProtocolResultEnvelopeV1,
  type TextProtocolDiagnostic,
  type TextProtocolSchemaFamilyEnvelopeV1,
  type TextProtocolSchemaFamilyValidationOptions,
} from "@ismail-elkorchi/textprotocol";
import {
  packageName as textRulesPackageName,
  type TextRulesTextPackRuleKind,
} from "@ismail-elkorchi/textrules";
import { execFile } from "node:child_process";
import { performance } from "node:perf_hooks";

export const packageName = "@ismail-elkorchi/textlab" as const;
export const textlabExternalToolExecutionReportSchemaVersion = 1 as const;
export const textlabInspectionSessionSchemaVersion = 1 as const;

export type PackageName = typeof packageName;
export type TextlabExternalToolExecutionReportSchemaVersion =
  typeof textlabExternalToolExecutionReportSchemaVersion;
export type TextlabInspectionSessionSchemaVersion =
  typeof textlabInspectionSessionSchemaVersion;
export type TextlabExternalToolExecutionStatus = "passed" | "failed" | "timed-out";
export type TextlabInspectionSessionCommandKind =
  | "first-page"
  | "previous-page"
  | "next-page"
  | "last-page"
  | "goto-page";

export interface TextlabExternalToolExecutionSpec {
  readonly toolId: string;
  readonly command: string;
  readonly args?: readonly string[];
  readonly cwd?: string;
  readonly timeoutMs?: number;
  readonly env?: Readonly<Record<string, string>>;
  readonly maxOutputChars?: number;
  readonly evidenceRefs?: readonly string[];
  readonly limitations?: readonly string[];
}

export interface TextlabExternalToolExecutionReportV1 {
  readonly schemaVersion: TextlabExternalToolExecutionReportSchemaVersion;
  readonly artifactType: "textlab-external-tool-execution-report-v1";
  readonly toolId: string;
  readonly command: string;
  readonly args: readonly string[];
  readonly cwd?: string;
  readonly status: TextlabExternalToolExecutionStatus;
  readonly exitCode?: number;
  readonly signal?: string;
  readonly failureCode?: string;
  readonly timedOut: boolean;
  readonly durationMs: number;
  readonly stdoutLength: number;
  readonly stderrLength: number;
  readonly stdoutPreview: string;
  readonly stderrPreview: string;
  readonly stdoutTruncated: boolean;
  readonly stderrTruncated: boolean;
  readonly evidenceRefs: readonly string[];
  readonly limitations: readonly string[];
}

export interface TextlabInspectionSessionOptions {
  readonly sessionId: string;
  readonly subjectId: string;
  readonly title?: string;
  readonly pageSize?: number;
  readonly initialPageIndex?: number;
}

export interface TextlabInspectionSessionCommand {
  readonly command: TextlabInspectionSessionCommandKind;
  readonly pageIndex?: number;
}

export interface TextlabInspectionSessionCommandRecord {
  readonly command: TextlabInspectionSessionCommandKind;
  readonly fromPageIndex: number;
  readonly toPageIndex: number;
  readonly pageIndex?: number;
}

export interface TextlabInspectionSessionV1 {
  readonly schemaVersion: TextlabInspectionSessionSchemaVersion;
  readonly artifactType: "textlab-inspection-session-v1";
  readonly sessionId: string;
  readonly subjectId: string;
  readonly title?: string;
  readonly rowCount: number;
  readonly pageSize: number;
  readonly pageCount: number;
  readonly pageIndex: number;
  readonly pageStart: number;
  readonly pageEnd: number;
  readonly pageRowCount: number;
  readonly hasPreviousPage: boolean;
  readonly hasNextPage: boolean;
  readonly pageRows: readonly unknown[];
  readonly commandHistory: readonly TextlabInspectionSessionCommandRecord[];
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

export interface TextlabCorpusArtifactInspectionOptions {
  readonly offset?: number;
  readonly limit?: number;
}

export interface TextlabCorpusArtifactInspection {
  readonly schemaVersion: 1;
  readonly artifactKind: string;
  readonly corpusId: string;
  readonly metricSetId?: string;
  readonly evidenceClass?: string;
  readonly tokenSource?: string;
  readonly documentCount: number;
  readonly tokenCount: number;
  readonly rowCount: number;
  readonly queryCount: number;
  readonly hitCount: number;
  readonly metricCount: number;
  readonly formulaIds: readonly string[];
  readonly pageOffset: number;
  readonly pageLimit: number;
  readonly pageEnd: number;
  readonly pageRowCount: number;
  readonly hasNextPage: boolean;
  readonly pageRows: readonly unknown[];
  readonly checksum?: string;
  readonly storageKey?: string;
  readonly byteLength?: number;
}

export interface TextlabPackageInspection {
  readonly schemaVersion: 1;
  readonly name: string;
  readonly version: string;
  readonly private: boolean;
  readonly exportPaths: readonly string[];
  readonly binNames: readonly string[];
  readonly fileEntries: readonly string[];
  readonly scriptNames: readonly string[];
  readonly dependencyNames: readonly string[];
  readonly devDependencyNames: readonly string[];
}

export interface TextlabPackInspection {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly packageName: string;
  readonly version: string;
  readonly kinds: readonly string[];
  readonly languages: readonly string[];
  readonly scripts: readonly string[];
  readonly profiles: readonly string[];
  readonly domains: readonly string[];
  readonly resourceFamilies: readonly TextlabCount[];
  readonly provides: readonly TextlabCount[];
  readonly reviewState: string;
  readonly overlayPrecedence?: number;
  readonly codeLicenseCount: number;
  readonly dataLicenseCount: number;
  readonly provenanceSourceCount: number;
  readonly limitations: readonly string[];
}

export interface TextlabPackValidationDiagnostic {
  readonly code: string;
  readonly packId?: string;
  readonly resourceId?: string;
  readonly ref?: string;
  readonly message: string;
}

export interface TextlabPackValidationInspection {
  readonly schemaVersion: 1;
  readonly ok: boolean;
  readonly packId: string;
  readonly diagnosticCount: number;
  readonly diagnostics: readonly TextlabPackValidationDiagnostic[];
}

export interface TextlabPackResourceRow {
  readonly packId: string;
  readonly resourceId: string;
  readonly family: string;
  readonly kind: string;
  readonly path: string;
  readonly language?: string;
  readonly profiles: readonly string[];
  readonly overlayPrecedence: number;
  readonly reviewState: string;
  readonly licenseId: string;
  readonly provenanceId: string;
}

export interface TextlabPackResourceListInspection {
  readonly schemaVersion: 1;
  readonly packId: string;
  readonly packageName: string;
  readonly version: string;
  readonly resourceCount: number;
  readonly resources: readonly TextlabPackResourceRow[];
}

export interface TextlabPackAuditDiagnostic {
  readonly code: string;
  readonly packId?: string;
  readonly resourceId?: string;
  readonly family?: string;
  readonly path?: string;
  readonly ref?: string;
  readonly message: string;
}

export interface TextlabPackAuditInspection {
  readonly schemaVersion: 1;
  readonly ok: boolean;
  readonly manifestValid: boolean;
  readonly packId?: string;
  readonly declaredResourceCount: number;
  readonly inventoryResourceCount: number;
  readonly missingResourceCount: number;
  readonly orphanResourceCount: number;
  readonly duplicateProvidedIdCount: number;
  readonly stalePairCount: number;
  readonly diagnosticCount: number;
  readonly resourceFamilies: readonly TextlabCount[];
  readonly diagnostics: readonly TextlabPackAuditDiagnostic[];
}

export interface TextlabPackReviewRequirementRow {
  readonly id: string;
  readonly status: string;
  readonly message: string;
  readonly refs: readonly string[];
}

export interface TextlabPackReviewDiagnostic {
  readonly source: string;
  readonly code: string;
  readonly packId?: string;
  readonly resourceId?: string;
  readonly family?: string;
  readonly path?: string;
  readonly ref?: string;
  readonly message: string;
}

export interface TextlabPackReviewInspection {
  readonly schemaVersion: 1;
  readonly ok: boolean;
  readonly decision: string;
  readonly packId: string;
  readonly packageName: string;
  readonly version: string;
  readonly currentReviewState: string;
  readonly targetReviewState: string;
  readonly transition: string;
  readonly manifestOk: boolean;
  readonly resourceInventoryChecked: boolean;
  readonly resourceInventoryOk: boolean;
  readonly compatibilityChecked: boolean;
  readonly compatibilityOk: boolean;
  readonly resourceCount: number;
  readonly requirementCount: number;
  readonly passedRequirementCount: number;
  readonly failedRequirementCount: number;
  readonly notApplicableRequirementCount: number;
  readonly evidenceRefCount: number;
  readonly diagnosticCount: number;
  readonly requirements: readonly TextlabPackReviewRequirementRow[];
  readonly diagnostics: readonly TextlabPackReviewDiagnostic[];
}

export interface TextlabDocumentInspection {
  readonly schemaVersion: 1;
  readonly documentId: string;
  readonly revision: string;
  readonly viewCount: number;
  readonly spanMapCount: number;
  readonly layerCount: number;
  readonly annotationCount: number;
  readonly viewKindCounts: readonly TextlabCount[];
  readonly layerKindCounts: readonly TextlabCount[];
}

export interface TextlabConformanceDiffInspection {
  readonly schemaVersion: 1;
  readonly expectedReportId: string;
  readonly actualReportId: string;
  readonly subjectChanged: boolean;
  readonly same: number;
  readonly changed: number;
  readonly added: number;
  readonly removed: number;
  readonly changedCheckIds: readonly string[];
}

export interface TextlabBenchmarkMetricInspectionRow {
  readonly metricId: string;
  readonly value: number;
  readonly unit: string;
  readonly preference: "higher" | "lower" | "unspecified";
}

export interface TextlabBenchmarkReportInspection {
  readonly schemaVersion: 1;
  readonly benchmarkId: string;
  readonly subject: string;
  readonly metricCount: number;
  readonly evidenceRefCount: number;
  readonly limitationCount: number;
  readonly noteCount: number;
  readonly metrics: readonly TextlabBenchmarkMetricInspectionRow[];
}

export interface TextlabRetrievalQrelsInspection {
  readonly schemaVersion: 1;
  readonly taskId: string;
  readonly corpusId: string;
  readonly queryCount: number;
  readonly ratingCount: number;
  readonly relevantRatingCount: number;
  readonly maxGrade: number;
}

export interface TextlabRetrievalEvaluationInspection {
  readonly schemaVersion: 1;
  readonly taskId: string;
  readonly corpusId: string;
  readonly formula: string;
  readonly k: number;
  readonly queryCount: number;
  readonly precisionAtK: number;
  readonly recallAtK: number;
  readonly mrr: number;
  readonly ndcgAtK: number;
}

export interface TextlabReleaseReadinessRow {
  readonly packageName: string;
  readonly releaseTrack: string;
  readonly releaseReadiness: string;
  readonly downstreamApiStatus: string;
  readonly downstreamDependentCount: number;
  readonly releaseBlockerCount: number;
  readonly limitationCount: number;
}

export interface TextlabReleaseReadinessInspection {
  readonly schemaVersion: 1;
  readonly scope: string;
  readonly packageCount: number;
  readonly stageCount: number;
  readonly trackCounts: readonly TextlabCount[];
  readonly readinessCounts: readonly TextlabCount[];
  readonly blockerCount: number;
  readonly rows: readonly TextlabReleaseReadinessRow[];
}

export interface TextlabPipelineTraceRow {
  readonly processorId: string;
  readonly version: string;
  readonly status: string;
  readonly inputRevision: string;
  readonly outputRevision: string;
  readonly emittedViewCount: number;
  readonly emittedLayerCount: number;
  readonly diagnosticCount: number;
  readonly cacheKey?: string;
}

export interface TextlabPipelineTraceInspection {
  readonly schemaVersion: 1;
  readonly documentId: string;
  readonly finalRevision: string;
  readonly executionMode: string;
  readonly runStatus: string;
  readonly processorCount: number;
  readonly entryCount: number;
  readonly emittedViewCount: number;
  readonly emittedLayerCount: number;
  readonly diagnosticCount: number;
  readonly cacheHitCount: number;
  readonly statusCounts: readonly TextlabCount[];
  readonly processorOrder: readonly string[];
  readonly rows: readonly TextlabPipelineTraceRow[];
}

export interface TextlabPipelineBatchReportRow {
  readonly inputIndex: number;
  readonly documentId: string;
  readonly finalRevision: string;
  readonly runStatus: string;
  readonly executionMode: string;
  readonly cachePolicy: string;
  readonly processorCount: number;
  readonly traceEntryCount: number;
  readonly processorOrder: readonly string[];
}

export interface TextlabPipelineBatchReportInspection {
  readonly schemaVersion: 1;
  readonly documentCount: number;
  readonly completeCount: number;
  readonly partialCount: number;
  readonly executionModes: readonly string[];
  readonly cachePolicies: readonly string[];
  readonly contextFingerprintCount: number;
  readonly processorCount: number;
  readonly traceEntryCount: number;
  readonly statusCounts: readonly TextlabCount[];
  readonly processorIds: readonly string[];
  readonly rows: readonly TextlabPipelineBatchReportRow[];
}

export interface TextlabProtocolDiagnosticRow {
  readonly code: string;
  readonly severity: string;
  readonly message?: string;
}

export interface TextlabProtocolResultEnvelopeInspection {
  readonly schemaVersion: 1;
  readonly envelopeSchemaId: string;
  readonly envelopeSchemaVersion: number;
  readonly producerPackage: string;
  readonly producerVersion: string;
  readonly payloadKind: string;
  readonly registeredPayloadKind: boolean;
  readonly payloadOwnerPackage?: string;
  readonly payloadSchemaId?: string;
  readonly payloadSchemaVersion?: string | number;
  readonly payloadShape: string;
  readonly payloadKeys: readonly string[];
  readonly provenanceReferenceCount: number;
  readonly diagnosticCount: number;
  readonly scopeBoundaryPresent: boolean;
  readonly limitationCount: number;
  readonly compatibilityOk: boolean;
  readonly compatibilityDiagnosticCounts: readonly TextlabCount[];
  readonly diagnostics: readonly TextlabProtocolDiagnosticRow[];
  readonly compatibilityDiagnostics: readonly TextlabProtocolDiagnosticRow[];
}

export interface TextlabProtocolSchemaFamilyEnvelopeInspection {
  readonly schemaVersion: 1;
  readonly envelopeSchemaId: string;
  readonly envelopeSchemaVersion: number;
  readonly family: string;
  readonly registeredSchemaFamily: boolean;
  readonly ownerPackage?: string;
  readonly schemaPath?: string;
  readonly producerPackage: string;
  readonly producerVersion: string;
  readonly payloadShape: string;
  readonly payloadKeys: readonly string[];
  readonly provenanceReferenceCount: number;
  readonly diagnosticCount: number;
  readonly limitationCount: number;
  readonly extensionKeyCount: number;
  readonly compatibilityOk: boolean;
  readonly compatibilityDiagnosticCounts: readonly TextlabCount[];
  readonly diagnostics: readonly TextlabProtocolDiagnosticRow[];
  readonly compatibilityDiagnostics: readonly TextlabProtocolDiagnosticRow[];
}

export interface TextlabPackBackedRuleInspectionOptions {
  readonly packIds?: readonly string[];
  readonly resourceIds?: readonly string[];
  readonly ruleKinds?: readonly TextRulesTextPackRuleKind[];
}

export interface TextlabPackBackedRuleRow {
  readonly layerId: string;
  readonly annotationId: string;
  readonly extensionId: string;
  readonly ruleKind: TextRulesTextPackRuleKind;
  readonly packId: string;
  readonly resourceId: string;
  readonly ruleId: string;
  readonly line: number;
  readonly matchedText: string;
  readonly value: string;
  readonly targetStartCU: number;
  readonly targetEndCU: number;
  readonly confidence?: number;
  readonly provenanceRefs: readonly string[];
}

export interface TextlabPackBackedRuleInspection {
  readonly schemaVersion: 1;
  readonly sourcePackage: string;
  readonly documentId: string;
  readonly revision: string;
  readonly ruleAnnotationCount: number;
  readonly filteredAnnotationCount: number;
  readonly packCounts: readonly TextlabCount[];
  readonly resourceCounts: readonly TextlabCount[];
  readonly ruleKindCounts: readonly TextlabCount[];
  readonly rows: readonly TextlabPackBackedRuleRow[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((entry) => isNonEmptyString(entry));
}

function isTextlabInspectionSessionCommandKind(
  value: unknown,
): value is TextlabInspectionSessionCommandKind {
  return (
    value === "first-page" ||
    value === "previous-page" ||
    value === "next-page" ||
    value === "last-page" ||
    value === "goto-page"
  );
}

function isTextlabInspectionSessionCommandRecord(
  value: unknown,
): value is TextlabInspectionSessionCommandRecord {
  return (
    isRecord(value) &&
    isTextlabInspectionSessionCommandKind(value.command) &&
    isNonNegativeInteger(value.fromPageIndex) &&
    isNonNegativeInteger(value.toPageIndex) &&
    (value.pageIndex === undefined || isNonNegativeInteger(value.pageIndex))
  );
}

export function isTextlabInspectionSessionV1(
  value: unknown,
): value is TextlabInspectionSessionV1 {
  if (
    !isRecord(value) ||
    value.schemaVersion !== textlabInspectionSessionSchemaVersion ||
    value.artifactType !== "textlab-inspection-session-v1" ||
    !isNonEmptyString(value.sessionId) ||
    !isNonEmptyString(value.subjectId) ||
    (value.title !== undefined && !isNonEmptyString(value.title)) ||
    !isNonNegativeInteger(value.rowCount) ||
    !isNonNegativeInteger(value.pageSize) ||
    value.pageSize < 1 ||
    !isNonNegativeInteger(value.pageCount) ||
    !isNonNegativeInteger(value.pageIndex) ||
    !isNonNegativeInteger(value.pageStart) ||
    !isNonNegativeInteger(value.pageEnd) ||
    !isNonNegativeInteger(value.pageRowCount) ||
    typeof value.hasPreviousPage !== "boolean" ||
    typeof value.hasNextPage !== "boolean" ||
    !Array.isArray(value.pageRows) ||
    !Array.isArray(value.commandHistory) ||
    !value.commandHistory.every((entry) => isTextlabInspectionSessionCommandRecord(entry))
  ) {
    return false;
  }
  const maxPageIndex = Math.max(0, value.pageCount - 1);
  return (
    value.pageIndex <= maxPageIndex &&
    value.pageStart <= value.pageEnd &&
    value.pageEnd <= value.rowCount &&
    value.pageRowCount === value.pageRows.length &&
    value.pageRowCount === value.pageEnd - value.pageStart &&
    value.hasPreviousPage === (value.pageIndex > 0) &&
    value.hasNextPage === (value.pageIndex + 1 < value.pageCount)
  );
}

function normalizeTextlabSessionPageSize(pageSize: number | undefined): number {
  const normalized = pageSize ?? 20;
  if (!Number.isInteger(normalized) || normalized < 1) {
    throw new RangeError("textlab inspection session pageSize must be a positive integer");
  }
  return normalized;
}

function clampTextlabSessionPageIndex(pageIndex: number, pageCount: number): number {
  if (pageCount === 0) return 0;
  return Math.min(Math.max(0, pageIndex), pageCount - 1);
}

function createTextlabInspectionSessionPage(
  rows: readonly unknown[],
  options: TextlabInspectionSessionOptions,
  pageIndex: number,
  commandHistory: readonly TextlabInspectionSessionCommandRecord[],
): TextlabInspectionSessionV1 {
  if (!isRecord(options) || !isNonEmptyString(options.sessionId)) {
    throw new TypeError("textlab inspection session id must be a non-empty string");
  }
  if (!isNonEmptyString(options.subjectId)) {
    throw new TypeError("textlab inspection session subject id must be a non-empty string");
  }
  if (options.title !== undefined && !isNonEmptyString(options.title)) {
    throw new TypeError("textlab inspection session title must be a non-empty string");
  }
  const pageSize = normalizeTextlabSessionPageSize(options.pageSize);
  const pageCount = rows.length === 0 ? 0 : Math.ceil(rows.length / pageSize);
  const normalizedPageIndex = clampTextlabSessionPageIndex(pageIndex, pageCount);
  const pageStart = pageCount === 0 ? 0 : normalizedPageIndex * pageSize;
  const pageEnd = Math.min(rows.length, pageStart + pageSize);
  const session = {
    schemaVersion: textlabInspectionSessionSchemaVersion,
    artifactType: "textlab-inspection-session-v1",
    sessionId: options.sessionId,
    subjectId: options.subjectId,
    ...(options.title === undefined ? {} : { title: options.title }),
    rowCount: rows.length,
    pageSize,
    pageCount,
    pageIndex: normalizedPageIndex,
    pageStart,
    pageEnd,
    pageRowCount: pageEnd - pageStart,
    hasPreviousPage: normalizedPageIndex > 0,
    hasNextPage: normalizedPageIndex + 1 < pageCount,
    pageRows: rows.slice(pageStart, pageEnd),
    commandHistory,
  } satisfies TextlabInspectionSessionV1;
  if (!isTextlabInspectionSessionV1(session)) {
    throw new TypeError("textlab inspection session is invalid");
  }
  return session;
}

export function createTextlabInspectionSession(
  rows: readonly unknown[],
  options: TextlabInspectionSessionOptions,
): TextlabInspectionSessionV1 {
  if (!Array.isArray(rows)) {
    throw new TypeError("textlab inspection session rows must be an array");
  }
  const initialPageIndex = options.initialPageIndex ?? 0;
  if (!isNonNegativeInteger(initialPageIndex)) {
    throw new RangeError("textlab inspection session initialPageIndex must be a non-negative integer");
  }
  return createTextlabInspectionSessionPage(rows, options, initialPageIndex, []);
}

export function applyTextlabInspectionSessionCommand(
  session: TextlabInspectionSessionV1,
  rows: readonly unknown[],
  command: TextlabInspectionSessionCommand,
): TextlabInspectionSessionV1 {
  if (!isTextlabInspectionSessionV1(session)) {
    throw new TypeError("textlab inspection session must satisfy TextlabInspectionSessionV1");
  }
  if (!Array.isArray(rows)) {
    throw new TypeError("textlab inspection session rows must be an array");
  }
  if (!isRecord(command) || !isTextlabInspectionSessionCommandKind(command.command)) {
    throw new TypeError("textlab inspection session command is invalid");
  }
  if (rows.length !== session.rowCount) {
    throw new Error("textlab inspection session rows must match the session row count");
  }
  const maxPageIndex = Math.max(0, session.pageCount - 1);
  let targetPageIndex = session.pageIndex;
  if (command.command === "first-page") targetPageIndex = 0;
  if (command.command === "previous-page") targetPageIndex = Math.max(0, session.pageIndex - 1);
  if (command.command === "next-page") targetPageIndex = Math.min(maxPageIndex, session.pageIndex + 1);
  if (command.command === "last-page") targetPageIndex = maxPageIndex;
  if (command.command === "goto-page") {
    if (!isNonNegativeInteger(command.pageIndex)) {
      throw new RangeError("textlab inspection session goto-page requires a non-negative pageIndex");
    }
    targetPageIndex = clampTextlabSessionPageIndex(command.pageIndex, session.pageCount);
  }
  return createTextlabInspectionSessionPage(
    rows,
    {
      sessionId: session.sessionId,
      subjectId: session.subjectId,
      ...(session.title === undefined ? {} : { title: session.title }),
      pageSize: session.pageSize,
    },
    targetPageIndex,
    [
      ...session.commandHistory,
      {
        command: command.command,
        fromPageIndex: session.pageIndex,
        toPageIndex: targetPageIndex,
        ...(command.pageIndex === undefined ? {} : { pageIndex: command.pageIndex }),
      },
    ],
  );
}

export function renderTextlabInspectionSession(session: TextlabInspectionSessionV1): string {
  if (!isTextlabInspectionSessionV1(session)) {
    throw new TypeError("textlab inspection session must satisfy TextlabInspectionSessionV1");
  }
  return [
    "# textlab inspection session",
    "",
    `Session: ${session.sessionId}`,
    `Subject: ${session.subjectId}`,
    `Title: ${session.title ?? "none"}`,
    `Rows: ${session.rowCount}`,
    `Page: ${session.pageCount === 0 ? 0 : session.pageIndex + 1} / ${session.pageCount}`,
    `Page size: ${session.pageSize}`,
    `Page rows: ${session.pageRowCount}`,
    `Has previous page: ${session.hasPreviousPage ? "yes" : "no"}`,
    `Has next page: ${session.hasNextPage ? "yes" : "no"}`,
    `Commands: ${session.commandHistory.length}`,
    "",
    "## Rows",
    ...session.pageRows.map((row, index) => `- ${session.pageStart + index}: ${JSON.stringify(row)}`),
    "",
  ].join("\n");
}

function isStringRecord(value: unknown): value is Readonly<Record<string, string>> {
  return isRecord(value) && Object.values(value).every((entry) => typeof entry === "string");
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isNonNegativeFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function positiveInteger(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    throw new TypeError(`${label} must be a positive integer`);
  }
  return value;
}

function isTextlabExternalToolExecutionStatus(value: unknown): value is TextlabExternalToolExecutionStatus {
  return value === "passed" || value === "failed" || value === "timed-out";
}

export function isTextlabExternalToolExecutionReportV1(
  value: unknown,
): value is TextlabExternalToolExecutionReportV1 {
  return (
    isRecord(value) &&
    value.schemaVersion === textlabExternalToolExecutionReportSchemaVersion &&
    value.artifactType === "textlab-external-tool-execution-report-v1" &&
    isNonEmptyString(value.toolId) &&
    isNonEmptyString(value.command) &&
    isStringArray(value.args) &&
    (value.cwd === undefined || isNonEmptyString(value.cwd)) &&
    isTextlabExternalToolExecutionStatus(value.status) &&
    (value.exitCode === undefined || isNonNegativeInteger(value.exitCode)) &&
    (value.signal === undefined || isNonEmptyString(value.signal)) &&
    (value.failureCode === undefined || isNonEmptyString(value.failureCode)) &&
    typeof value.timedOut === "boolean" &&
    isNonNegativeFiniteNumber(value.durationMs) &&
    isNonNegativeInteger(value.stdoutLength) &&
    isNonNegativeInteger(value.stderrLength) &&
    typeof value.stdoutPreview === "string" &&
    typeof value.stderrPreview === "string" &&
    typeof value.stdoutTruncated === "boolean" &&
    typeof value.stderrTruncated === "boolean" &&
    isStringArray(value.evidenceRefs) &&
    isStringArray(value.limitations) &&
    value.limitations.length >= 1 &&
    (value.status === "timed-out" ? value.timedOut : true)
  );
}

function assertTextlabExternalToolExecutionSpec(
  spec: TextlabExternalToolExecutionSpec,
): void {
  if (!isRecord(spec)) {
    throw new TypeError("external tool execution spec must be a record");
  }
  if (!isNonEmptyString(spec.toolId)) {
    throw new TypeError("external tool id must be a non-empty string");
  }
  if (!isNonEmptyString(spec.command)) {
    throw new TypeError("external tool command must be a non-empty string");
  }
  if (spec.args !== undefined && !isStringArray(spec.args)) {
    throw new TypeError("external tool args must be strings");
  }
  if (spec.cwd !== undefined && !isNonEmptyString(spec.cwd)) {
    throw new TypeError("external tool cwd must be a non-empty string");
  }
  if (spec.timeoutMs !== undefined) positiveInteger(spec.timeoutMs, "external tool timeoutMs");
  if (spec.maxOutputChars !== undefined) positiveInteger(spec.maxOutputChars, "external tool maxOutputChars");
  if (spec.env !== undefined && !isStringRecord(spec.env)) {
    throw new TypeError("external tool env must be a string record");
  }
  if (spec.evidenceRefs !== undefined && !isStringArray(spec.evidenceRefs)) {
    throw new TypeError("external tool evidence refs must be strings");
  }
  if (spec.limitations !== undefined && (!isStringArray(spec.limitations) || spec.limitations.length === 0)) {
    throw new TypeError("external tool limitations must be a non-empty string array");
  }
}

function previewOutput(value: string, maxOutputChars: number): {
  readonly preview: string;
  readonly truncated: boolean;
} {
  return {
    preview: value.length <= maxOutputChars ? value : value.slice(0, maxOutputChars),
    truncated: value.length > maxOutputChars,
  };
}

interface TextlabExecFileResult {
  readonly exitCode?: number;
  readonly signal?: string;
  readonly failureCode?: string;
  readonly timedOut: boolean;
  readonly stdout: string;
  readonly stderr: string;
}

function runExecFile(spec: TextlabExternalToolExecutionSpec): Promise<TextlabExecFileResult> {
  const timeout = spec.timeoutMs ?? 30_000;
  return new Promise((resolve) => {
    execFile(
      spec.command,
      [...(spec.args ?? [])],
      {
        ...(spec.cwd === undefined ? {} : { cwd: spec.cwd }),
        env: spec.env === undefined ? process.env : { ...process.env, ...spec.env },
        encoding: "utf8",
        timeout,
        windowsHide: true,
      },
      (error, stdout, stderr) => {
        if (error === null) {
          resolve({
            exitCode: 0,
            timedOut: false,
            stdout,
            stderr,
          });
          return;
        }
        const execError = error as Error & {
          readonly code?: number | string;
          readonly signal?: string;
          readonly killed?: boolean;
        };
        const exitCode = typeof execError.code === "number" ? execError.code : undefined;
        const failureCode = typeof execError.code === "string" ? execError.code : undefined;
        const signal = typeof execError.signal === "string" ? execError.signal : undefined;
        resolve({
          ...(exitCode === undefined ? {} : { exitCode }),
          ...(signal === undefined ? {} : { signal }),
          ...(failureCode === undefined ? {} : { failureCode }),
          timedOut: execError.killed === true && signal === "SIGTERM",
          stdout,
          stderr,
        });
      },
    );
  });
}

export async function executeTextlabExternalTool(
  spec: TextlabExternalToolExecutionSpec,
): Promise<TextlabExternalToolExecutionReportV1> {
  assertTextlabExternalToolExecutionSpec(spec);
  const maxOutputChars = spec.maxOutputChars ?? 4096;
  const started = performance.now();
  const result = await runExecFile(spec);
  const durationMs = Math.max(0, performance.now() - started);
  const stdout = previewOutput(result.stdout, maxOutputChars);
  const stderr = previewOutput(result.stderr, maxOutputChars);
  const status: TextlabExternalToolExecutionStatus = result.timedOut
    ? "timed-out"
    : result.exitCode === 0
      ? "passed"
      : "failed";
  const report = {
    schemaVersion: textlabExternalToolExecutionReportSchemaVersion,
    artifactType: "textlab-external-tool-execution-report-v1",
    toolId: spec.toolId,
    command: spec.command,
    args: [...(spec.args ?? [])],
    ...(spec.cwd === undefined ? {} : { cwd: spec.cwd }),
    status,
    ...(result.exitCode === undefined ? {} : { exitCode: result.exitCode }),
    ...(result.signal === undefined ? {} : { signal: result.signal }),
    ...(result.failureCode === undefined ? {} : { failureCode: result.failureCode }),
    timedOut: result.timedOut,
    durationMs,
    stdoutLength: result.stdout.length,
    stderrLength: result.stderr.length,
    stdoutPreview: stdout.preview,
    stderrPreview: stderr.preview,
    stdoutTruncated: stdout.truncated,
    stderrTruncated: stderr.truncated,
    evidenceRefs: [...(spec.evidenceRefs ?? [])],
    limitations: [
      ...(spec.limitations ?? [
        "External tool execution report records one local child-process result for an explicit command and argument vector.",
      ]),
    ],
  } satisfies TextlabExternalToolExecutionReportV1;
  if (!isTextlabExternalToolExecutionReportV1(report)) {
    throw new TypeError("external tool execution report is invalid");
  }
  return report;
}

export function renderTextlabExternalToolExecutionReport(
  report: TextlabExternalToolExecutionReportV1,
): string {
  if (!isTextlabExternalToolExecutionReportV1(report)) {
    throw new TypeError("external tool execution report is invalid");
  }
  return [
    "# textlab external tool execution",
    `Tool: ${report.toolId}`,
    `Command: ${[report.command, ...report.args].join(" ")}`,
    `Status: ${report.status}`,
    `Exit code: ${report.exitCode ?? "none"}`,
    `Signal: ${report.signal ?? "none"}`,
    `Duration ms: ${report.durationMs}`,
    `Stdout length: ${report.stdoutLength}`,
    `Stderr length: ${report.stderrLength}`,
    `Stdout truncated: ${String(report.stdoutTruncated)}`,
    `Stderr truncated: ${String(report.stderrTruncated)}`,
    report.stdoutPreview.length === 0 ? "Stdout: " : `Stdout: ${report.stdoutPreview}`,
    report.stderrPreview.length === 0 ? "Stderr: " : `Stderr: ${report.stderrPreview}`,
    "",
  ].join("\n");
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

function recordKeys(value: unknown): readonly string[] {
  return isRecord(value) ? Object.keys(value).sort() : [];
}

function payloadShape(value: unknown): string {
  if (Array.isArray(value)) return `array:${value.length}`;
  if (isRecord(value)) {
    const keys = recordKeys(value);
    return `object:${keys.join(",") || "<empty>"}`;
  }
  if (value === null) return "null";
  return typeof value;
}

function recordStringArrayEntries(value: unknown): readonly TextlabCount[] {
  if (!isRecord(value)) return [];
  return Object.entries(value)
    .map(([id, entry]) => ({ id, count: Array.isArray(entry) ? entry.length : 0 }))
    .sort((left, right) => left.id.localeCompare(right.id));
}

function numeric(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function isTextRulesTextPackRuleKind(value: unknown): value is TextRulesTextPackRuleKind {
  return value === "stopword" || value === "lexicon" || value === "gazetteer" || value === "rule-list";
}

function firstSpanTarget(annotation: Record<string, unknown>): { startCU: number; endCU: number } {
  const targets = annotation.targets;
  if (!Array.isArray(targets)) return { startCU: 0, endCU: 0 };
  for (const target of targets) {
    if (
      isRecord(target) &&
      target.kind === "span" &&
      typeof target.startCU === "number" &&
      typeof target.endCU === "number"
    ) {
      return {
        startCU: target.startCU,
        endCU: target.endCU,
      };
    }
  }
  return { startCU: 0, endCU: 0 };
}

function provenanceRefs(annotation: Record<string, unknown>): readonly string[] {
  const provenance = annotation.provenance;
  if (!isRecord(provenance) || !Array.isArray(provenance.references)) return [];
  return provenance.references
    .filter((reference): reference is Record<string, unknown> => isRecord(reference))
    .map((reference) => {
      const kind = isNonEmptyString(reference.kind) ? reference.kind : "<missing-kind>";
      const id = isNonEmptyString(reference.id) ? reference.id : "<missing-id>";
      return `${kind}:${id}`;
    })
    .sort();
}

function compareTraceRows(left: TextlabPipelineTraceRow, right: TextlabPipelineTraceRow): number {
  return `${left.processorId}\u0000${left.inputRevision}\u0000${left.outputRevision}`.localeCompare(
    `${right.processorId}\u0000${right.inputRevision}\u0000${right.outputRevision}`,
  );
}

function comparePipelineBatchRows(
  left: TextlabPipelineBatchReportRow,
  right: TextlabPipelineBatchReportRow,
): number {
  return left.inputIndex - right.inputIndex || left.documentId.localeCompare(right.documentId);
}

function protocolDiagnosticRows(
  diagnostics: readonly TextProtocolDiagnostic[] | undefined,
): readonly TextlabProtocolDiagnosticRow[] {
  return (diagnostics ?? [])
    .map((diagnostic) => ({
      code: diagnostic.code,
      severity: diagnostic.severity,
      ...(diagnostic.message === undefined ? {} : { message: diagnostic.message }),
    }))
    .sort((left, right) =>
      `${left.code}\u0000${left.severity}\u0000${left.message ?? ""}`.localeCompare(
        `${right.code}\u0000${right.severity}\u0000${right.message ?? ""}`,
      ),
    );
}

function comparePackBackedRuleRows(
  left: TextlabPackBackedRuleRow,
  right: TextlabPackBackedRuleRow,
): number {
  return (
    left.targetStartCU - right.targetStartCU ||
    right.targetEndCU - left.targetEndCU ||
    left.layerId.localeCompare(right.layerId) ||
    left.packId.localeCompare(right.packId) ||
    left.resourceId.localeCompare(right.resourceId) ||
    left.ruleKind.localeCompare(right.ruleKind) ||
    left.line - right.line ||
    left.ruleId.localeCompare(right.ruleId) ||
    left.annotationId.localeCompare(right.annotationId)
  );
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

export function inspectPackageManifest(value: unknown): TextlabPackageInspection {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.name) ||
    !isNonEmptyString(value.version)
  ) {
    throw new TypeError("package manifest is invalid");
  }

  return {
    schemaVersion: 1,
    name: value.name,
    version: value.version,
    private: value.private === true,
    exportPaths: recordKeys(value.exports),
    binNames: recordKeys(value.bin),
    fileEntries: isStringArray(value.files) ? [...value.files].sort() : [],
    scriptNames: recordKeys(value.scripts),
    dependencyNames: recordKeys(value.dependencies),
    devDependencyNames: recordKeys(value.devDependencies),
  };
}

export function renderPackageInspection(inspection: TextlabPackageInspection): string {
  return [
    "# textlab package inspection",
    "",
    `Package: ${inspection.name}`,
    `Version: ${inspection.version}`,
    `Private: ${inspection.private ? "yes" : "no"}`,
    `Exports: ${inspection.exportPaths.length}`,
    `Bins: ${inspection.binNames.length}`,
    `Files: ${inspection.fileEntries.length}`,
    `Scripts: ${inspection.scriptNames.length}`,
    `Dependencies: ${inspection.dependencyNames.length}`,
    `Dev dependencies: ${inspection.devDependencyNames.length}`,
    "",
    "## Export paths",
    ...inspection.exportPaths.map((entry) => `- ${entry}`),
    "",
  ].join("\n");
}

export function inspectTextPackManifest(value: unknown): TextlabPackInspection {
  if (!isTextPackManifestV1(value)) {
    throw new TypeError("textpack manifest is invalid");
  }

  return {
    schemaVersion: 1,
    id: value.id,
    packageName: value.packageName,
    version: value.version,
    kinds: [...value.kind].sort(),
    languages: [...(value.targets.languages ?? [])].sort(),
    scripts: [...(value.targets.scripts ?? [])].sort(),
    profiles: [...(value.targets.profiles ?? [])].sort(),
    domains: [...(value.targets.domains ?? [])].sort(),
    resourceFamilies: recordStringArrayEntries(value.resources),
    provides: recordStringArrayEntries(value.provides),
    reviewState: value.reviewState,
    ...(value.composition?.overlayPrecedence !== undefined
      ? { overlayPrecedence: value.composition.overlayPrecedence }
      : {}),
    codeLicenseCount: value.licenses.code.length,
    dataLicenseCount: value.licenses.data.length,
    provenanceSourceCount: value.provenance.sources.length,
    limitations: [...(value.limitations ?? [])].sort(),
  };
}

function packValidationDiagnosticRow(
  diagnostic: TextPackManifestGovernanceDiagnostic,
): TextlabPackValidationDiagnostic {
  return {
    code: diagnostic.code,
    ...(diagnostic.packId === undefined ? {} : { packId: diagnostic.packId }),
    ...(diagnostic.resourceId === undefined ? {} : { resourceId: diagnostic.resourceId }),
    ...(diagnostic.ref === undefined ? {} : { ref: diagnostic.ref }),
    message: diagnostic.message,
  };
}

function packAuditDiagnosticRow(
  diagnostic: TextPackResourceInventoryDiagnostic,
): TextlabPackAuditDiagnostic {
  return {
    code: diagnostic.code,
    ...(diagnostic.packId === undefined ? {} : { packId: diagnostic.packId }),
    ...(diagnostic.resourceId === undefined ? {} : { resourceId: diagnostic.resourceId }),
    ...(diagnostic.family === undefined ? {} : { family: diagnostic.family }),
    ...(diagnostic.path === undefined ? {} : { path: diagnostic.path }),
    ...(diagnostic.ref === undefined ? {} : { ref: diagnostic.ref }),
    message: diagnostic.message,
  };
}

function packReviewRequirementRow(
  requirement: TextPackReviewRequirementResult,
): TextlabPackReviewRequirementRow {
  return {
    id: requirement.id,
    status: requirement.status,
    message: requirement.message,
    refs: [...requirement.refs].sort(),
  };
}

function packReviewDiagnosticRow(
  diagnostic: TextPackReviewDiagnostic,
): TextlabPackReviewDiagnostic {
  return {
    source: diagnostic.source,
    code: diagnostic.code,
    ...(diagnostic.packId === undefined ? {} : { packId: diagnostic.packId }),
    ...(diagnostic.resourceId === undefined ? {} : { resourceId: diagnostic.resourceId }),
    ...(diagnostic.family === undefined ? {} : { family: diagnostic.family }),
    ...(diagnostic.path === undefined ? {} : { path: diagnostic.path }),
    ...(diagnostic.ref === undefined ? {} : { ref: diagnostic.ref }),
    message: diagnostic.message,
  };
}

function inspectTextPackReviewReportValue(report: TextPackReviewReportV1): TextlabPackReviewInspection {
  return {
    schemaVersion: 1,
    ok: report.ok,
    decision: report.decision,
    packId: report.packId,
    packageName: report.packPackageName,
    version: report.version,
    currentReviewState: report.currentReviewState,
    targetReviewState: report.targetReviewState,
    transition: report.transition,
    manifestOk: report.manifestOk,
    resourceInventoryChecked: report.resourceInventoryChecked,
    resourceInventoryOk: report.resourceInventoryOk,
    compatibilityChecked: report.compatibilityChecked,
    compatibilityOk: report.compatibilityOk,
    resourceCount: report.resourceCount,
    requirementCount: report.requirementCount,
    passedRequirementCount: report.passedRequirementCount,
    failedRequirementCount: report.failedRequirementCount,
    notApplicableRequirementCount: report.notApplicableRequirementCount,
    evidenceRefCount: report.evidenceRefs.length,
    diagnosticCount: report.diagnosticCount,
    requirements: report.requirements.map(packReviewRequirementRow),
    diagnostics: report.diagnostics.map(packReviewDiagnosticRow),
  };
}

export function inspectTextPackValidation(value: unknown): TextlabPackValidationInspection {
  const validation = validateTextPackManifestGovernance(value);
  const packId = isTextPackManifestV1(value) ? value.id : "<invalid>";
  return {
    schemaVersion: 1,
    ok: validation.ok,
    packId,
    diagnosticCount: validation.diagnostics.length,
    diagnostics: validation.diagnostics
      .map(packValidationDiagnosticRow)
      .sort((left, right) => `${left.code}\u0000${left.ref ?? ""}`.localeCompare(`${right.code}\u0000${right.ref ?? ""}`)),
  };
}

export function inspectTextPackReview(
  manifest: unknown,
  inventoryResourcePaths: readonly string[] = [],
  policy: TextPackReviewPolicy = {},
): TextlabPackReviewInspection {
  return inspectTextPackReviewReportValue(
    createTextPackReviewReport(manifest, {
      ...policy,
      inventoryResourcePaths,
    }),
  );
}

export function inspectTextPackReviewReport(value: unknown): TextlabPackReviewInspection {
  if (!isTextPackReviewReportV1(value)) {
    throw new TypeError("textpack review report is invalid");
  }
  return inspectTextPackReviewReportValue(value);
}

export function renderTextPackValidationInspection(inspection: TextlabPackValidationInspection): string {
  return [
    "# textlab pack validation",
    "",
    `Pack: ${inspection.packId}`,
    `Status: ${inspection.ok ? "valid" : "invalid"}`,
    `Diagnostics: ${inspection.diagnosticCount}`,
    "",
    "## Diagnostics",
    ...inspection.diagnostics.map((entry) =>
      `- ${entry.code}${entry.resourceId === undefined ? "" : ` resource=${entry.resourceId}`}${entry.ref === undefined ? "" : ` ref=${entry.ref}`}: ${entry.message}`,
    ),
    "",
  ].join("\n");
}

export function inspectTextPackResourceList(value: unknown): TextlabPackResourceListInspection {
  if (!isTextPackManifestV1(value)) {
    throw new TypeError("textpack manifest is invalid");
  }
  const registry = createTextPackResourceRegistry([value]);
  return {
    schemaVersion: 1,
    packId: value.id,
    packageName: value.packageName,
    version: value.version,
    resourceCount: registry.resources.length,
    resources: registry.resources.map((resource) => ({
      packId: resource.packId,
      resourceId: resource.resourceId,
      family: resource.family,
      kind: resource.kind,
      path: resource.path,
      ...(resource.language === undefined ? {} : { language: resource.language }),
      profiles: [...(resource.profiles ?? [])].sort(),
      overlayPrecedence: resource.overlayPrecedence,
      reviewState: resource.reviewState,
      licenseId: resource.licenseId,
      provenanceId: resource.provenanceId,
    })),
  };
}

export function inspectTextPackResourceAudit(
  manifest: unknown,
  inventoryResourcePaths: readonly string[],
): TextlabPackAuditInspection {
  const validation = validateTextPackResourceInventory(manifest, inventoryResourcePaths);
  return {
    schemaVersion: 1,
    ok: validation.ok,
    manifestValid: validation.manifestValid,
    ...(validation.packId === undefined ? {} : { packId: validation.packId }),
    declaredResourceCount: validation.declaredResourceCount,
    inventoryResourceCount: validation.inventoryResourceCount,
    missingResourceCount: validation.missingResourceCount,
    orphanResourceCount: validation.orphanResourceCount,
    duplicateProvidedIdCount: validation.duplicateProvidedIdCount,
    stalePairCount: validation.stalePairCount,
    diagnosticCount: validation.diagnostics.length,
    resourceFamilies: validation.resourceFamilies.map((entry) => ({
      id: entry.family,
      count: entry.declaredResourceCount,
    })),
    diagnostics: validation.diagnostics
      .map(packAuditDiagnosticRow)
      .sort((left, right) =>
        `${left.code}\u0000${left.family ?? ""}\u0000${left.path ?? ""}\u0000${left.resourceId ?? ""}\u0000${left.ref ?? ""}`.localeCompare(
          `${right.code}\u0000${right.family ?? ""}\u0000${right.path ?? ""}\u0000${right.resourceId ?? ""}\u0000${right.ref ?? ""}`,
        ),
      ),
  };
}

export function renderTextPackResourceListInspection(inspection: TextlabPackResourceListInspection): string {
  return [
    "# textlab pack resources",
    "",
    `Pack: ${inspection.packId}`,
    `Package: ${inspection.packageName}`,
    `Version: ${inspection.version}`,
    `Resources: ${inspection.resourceCount}`,
    "",
    "## Resources",
    ...inspection.resources.map((entry) =>
      `- ${entry.resourceId} family=${entry.family} kind=${entry.kind} path=${entry.path} language=${entry.language ?? "none"} profiles=${entry.profiles.join(",") || "none"} overlay=${entry.overlayPrecedence}`,
    ),
    "",
  ].join("\n");
}

export function renderTextPackAuditInspection(inspection: TextlabPackAuditInspection): string {
  return [
    "# textlab textpack audit",
    "",
    `Pack: ${inspection.packId ?? "<invalid>"}`,
    `Status: ${inspection.ok ? "valid" : "invalid"}`,
    `Manifest valid: ${inspection.manifestValid ? "yes" : "no"}`,
    `Declared resources: ${inspection.declaredResourceCount}`,
    `Inventory resources: ${inspection.inventoryResourceCount}`,
    `Missing resources: ${inspection.missingResourceCount}`,
    `Orphan resources: ${inspection.orphanResourceCount}`,
    `Duplicate provided ids: ${inspection.duplicateProvidedIdCount}`,
    `Stale resource/provides pairs: ${inspection.stalePairCount}`,
    `Diagnostics: ${inspection.diagnosticCount}`,
    "",
    "## Resource families",
    ...inspection.resourceFamilies.map((entry) => `- ${entry.id}: ${entry.count}`),
    "",
    "## Diagnostics",
    ...(inspection.diagnostics.length === 0
      ? ["- none"]
      : inspection.diagnostics.map((entry) =>
          `- ${entry.code}${entry.family === undefined ? "" : ` family=${entry.family}`}${entry.path === undefined ? "" : ` path=${entry.path}`}${entry.resourceId === undefined ? "" : ` resource=${entry.resourceId}`}${entry.ref === undefined ? "" : ` ref=${entry.ref}`}: ${entry.message}`,
        )),
    "",
  ].join("\n");
}

export function renderTextPackReviewInspection(inspection: TextlabPackReviewInspection): string {
  return [
    "# textlab textpack review",
    "",
    `Pack: ${inspection.packId}`,
    `Package: ${inspection.packageName}`,
    `Version: ${inspection.version}`,
    `Decision: ${inspection.decision}`,
    `Status: ${inspection.ok ? "accepted" : "blocked"}`,
    `Current review state: ${inspection.currentReviewState}`,
    `Target review state: ${inspection.targetReviewState}`,
    `Transition: ${inspection.transition}`,
    `Manifest valid: ${inspection.manifestOk ? "yes" : "no"}`,
    `Inventory checked: ${inspection.resourceInventoryChecked ? "yes" : "no"}`,
    `Inventory valid: ${inspection.resourceInventoryOk ? "yes" : "no"}`,
    `Compatibility checked: ${inspection.compatibilityChecked ? "yes" : "no"}`,
    `Compatibility valid: ${inspection.compatibilityOk ? "yes" : "no"}`,
    `Resources: ${inspection.resourceCount}`,
    `Requirements: ${inspection.requirementCount}`,
    `Requirements passed: ${inspection.passedRequirementCount}`,
    `Requirements failed: ${inspection.failedRequirementCount}`,
    `Requirements not applicable: ${inspection.notApplicableRequirementCount}`,
    `Evidence refs: ${inspection.evidenceRefCount}`,
    `Diagnostics: ${inspection.diagnosticCount}`,
    "",
    "## Requirements",
    ...inspection.requirements.map((entry) =>
      `- ${entry.id} status=${entry.status} refs=${entry.refs.join(",") || "none"}: ${entry.message}`,
    ),
    "",
    "## Diagnostics",
    ...(inspection.diagnostics.length === 0
      ? ["- none"]
      : inspection.diagnostics.map((entry) =>
          `- ${entry.source}:${entry.code}${entry.family === undefined ? "" : ` family=${entry.family}`}${entry.path === undefined ? "" : ` path=${entry.path}`}${entry.resourceId === undefined ? "" : ` resource=${entry.resourceId}`}${entry.ref === undefined ? "" : ` ref=${entry.ref}`}: ${entry.message}`,
        )),
    "",
  ].join("\n");
}

export function renderTextPackInspection(inspection: TextlabPackInspection): string {
  return [
    "# textlab pack inspection",
    "",
    `Pack: ${inspection.id}`,
    `Package: ${inspection.packageName}`,
    `Version: ${inspection.version}`,
    `Kinds: ${inspection.kinds.join(",")}`,
    `Languages: ${inspection.languages.join(",")}`,
    `Scripts: ${inspection.scripts.join(",")}`,
    `Review state: ${inspection.reviewState}`,
    `Overlay precedence: ${inspection.overlayPrecedence ?? "none"}`,
    `Code licenses: ${inspection.codeLicenseCount}`,
    `Data licenses: ${inspection.dataLicenseCount}`,
    `Provenance sources: ${inspection.provenanceSourceCount}`,
    "",
    "## Resources",
    ...inspection.resourceFamilies.map((entry) => `- ${entry.id}: ${entry.count}`),
    "",
    "## Provides",
    ...inspection.provides.map((entry) => `- ${entry.id}: ${entry.count}`),
    "",
  ].join("\n");
}

export function summarizeConformanceReport(value: unknown): TextlabConformanceReportSummary {
  if (!isTextConformanceReportV1(value)) {
    throw new TypeError("conformance report is invalid");
  }

  return {
    schemaVersion: 1,
    reportId: value.reportId,
    subject: `${value.subject.kind}:${value.subject.id}`,
    pass: value.summary.pass,
    fail: value.summary.fail,
    notRun: value.summary.notRun,
    checkCount: value.checks.length,
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

export function inspectConformanceReportDiff(
  expected: unknown,
  actual: unknown,
): TextlabConformanceDiffInspection {
  if (!isTextConformanceReportV1(expected)) {
    throw new TypeError("expected conformance report is invalid");
  }
  if (!isTextConformanceReportV1(actual)) {
    throw new TypeError("actual conformance report is invalid");
  }
  const diff: TextConformanceReportDiffV1 = diffTextConformanceReports(expected, actual);
  return {
    schemaVersion: 1,
    expectedReportId: diff.expectedReportId,
    actualReportId: diff.actualReportId,
    subjectChanged: diff.subjectChanged,
    same: diff.summary.same,
    changed: diff.summary.changed,
    added: diff.summary.added,
    removed: diff.summary.removed,
    changedCheckIds: diff.checks
      .filter((entry) => entry.status !== "same")
      .map((entry) => entry.checkId)
      .sort(),
  };
}

export function renderConformanceDiffInspection(
  inspection: TextlabConformanceDiffInspection,
): string {
  return [
    "# textlab conformance diff inspection",
    "",
    `Expected: ${inspection.expectedReportId}`,
    `Actual: ${inspection.actualReportId}`,
    `Subject changed: ${inspection.subjectChanged ? "yes" : "no"}`,
    `Same: ${inspection.same}`,
    `Changed: ${inspection.changed}`,
    `Added: ${inspection.added}`,
    `Removed: ${inspection.removed}`,
    "",
    "## Changed checks",
    ...inspection.changedCheckIds.map((entry) => `- ${entry}`),
    "",
  ].join("\n");
}

export function inspectTextConformanceBenchmarkReport(
  value: unknown,
): TextlabBenchmarkReportInspection {
  if (!isTextConformanceBenchmarkReportV1(value)) {
    throw new TypeError("benchmark report is invalid");
  }
  const metrics = [...value.metrics].sort((left, right) =>
    left.metricId.localeCompare(right.metricId),
  );
  return {
    schemaVersion: 1,
    benchmarkId: value.benchmarkId,
    subject: `${value.subject.kind}:${value.subject.id}`,
    metricCount: metrics.length,
    evidenceRefCount: value.evidenceRefs.length,
    limitationCount: value.limitations.length,
    noteCount: value.notes?.length ?? 0,
    metrics: metrics.map((metric) => ({
      metricId: metric.metricId,
      value: metric.value,
      unit: metric.unit,
      preference:
        metric.higherIsPreferred === undefined
          ? "unspecified"
          : metric.higherIsPreferred
            ? "higher"
            : "lower",
    })),
  };
}

export function renderTextConformanceBenchmarkReportInspection(
  inspection: TextlabBenchmarkReportInspection,
): string {
  return [
    "# textlab benchmark report inspection",
    "",
    `Benchmark: ${inspection.benchmarkId}`,
    `Subject: ${inspection.subject}`,
    `Metrics: ${inspection.metricCount}`,
    `Evidence refs: ${inspection.evidenceRefCount}`,
    `Limitations: ${inspection.limitationCount}`,
    `Notes: ${inspection.noteCount}`,
    "",
    "## Metrics",
    ...inspection.metrics.map(
      (metric) =>
        `- ${metric.metricId}: ${metric.value} ${metric.unit} (preference=${metric.preference})`,
    ),
    "",
  ].join("\n");
}

export function inspectTextdocDocument(document: unknown): TextlabDocumentInspection {
  if (!isTextDocDocumentV1(document)) {
    throw new TypeError("textdoc document is invalid");
  }
  const annotationCount = document.layers.reduce(
    (sum, layer) => sum + layer.annotations.length,
    0,
  );
  return {
    schemaVersion: 1,
    documentId: document.documentId,
    revision: document.revision,
    viewCount: document.views.length,
    spanMapCount: document.spanMaps?.length ?? 0,
    layerCount: document.layers.length,
    annotationCount,
    viewKindCounts: countById(document.views.map((view) => view.kind)),
    layerKindCounts: countById(document.layers.map((layer) => layer.kind)),
  };
}

export function renderTextdocDocumentInspection(inspection: TextlabDocumentInspection): string {
  return [
    "# textlab document inspection",
    "",
    `Document: ${inspection.documentId}`,
    `Revision: ${inspection.revision}`,
    `Views: ${inspection.viewCount}`,
    `Span maps: ${inspection.spanMapCount}`,
    `Layers: ${inspection.layerCount}`,
    `Annotations: ${inspection.annotationCount}`,
    "",
    "## View kinds",
    ...inspection.viewKindCounts.map((entry) => `- ${entry.id}: ${entry.count}`),
    "",
    "## Layer kinds",
    ...inspection.layerKindCounts.map((entry) => `- ${entry.id}: ${entry.count}`),
    "",
  ].join("\n");
}

export function inspectTextdocAnnotations(
  document: unknown,
  options: TextlabAnnotationInspectionOptions = {},
): TextlabAnnotationInspection {
  if (!isTextDocDocumentV1(document)) {
    throw new TypeError("textdoc document is invalid");
  }

  const allRows: TextlabAnnotationInspectionRow[] = [];
  for (const layer of document.layers) {
    for (const annotation of layer.annotations) {
      const annotationRecord = annotation as unknown as Record<string, unknown>;
      allRows.push({
        layerId: layer.id,
        layerKind: layer.kind,
        viewId: layer.viewId,
        annotationId: annotation.id,
        annotationKind: annotation.kind,
        lifecycleState: annotation.lifecycle.state,
        targetCount: annotation.targets.length,
        targetKinds: stringSet(annotation.targets.map((target) => target.kind)),
        graphEdgeCount: annotationGraphEdgeCount(annotationRecord),
        details: annotationDetails(annotationRecord),
      });
    }
  }

  const rows = allRows.filter((row) => rowMatchesOptions(row, options)).sort(compareAnnotationRows);

  return {
    schemaVersion: 1,
    documentId: document.documentId as string,
    revision: document.revision as string,
    layerCount: document.layers.length,
    annotationCount: allRows.length,
    graphEdgeCount: allRows.reduce((sum, row) => sum + row.graphEdgeCount, 0),
    layerKindCounts: countById(document.layers.map((layer) => layer.kind)),
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

export function inspectTextPipelineTrace(value: unknown): TextlabPipelineTraceInspection {
  if (!isTextPipelineTraceV1(value)) {
    throw new TypeError("textpipeline trace is invalid");
  }
  const rows = value.entries
    .map((entry: TextPipelineTraceEntry): TextlabPipelineTraceRow => ({
      processorId: entry.processorId,
      version: entry.version,
      status: entry.status,
      inputRevision: entry.inputRevision,
      outputRevision: entry.outputRevision,
      emittedViewCount: entry.emittedViews.length,
      emittedLayerCount: entry.emittedLayers.length,
      diagnosticCount: entry.diagnostics?.length ?? 0,
      ...(entry.cacheKey === undefined ? {} : { cacheKey: entry.cacheKey }),
    }))
    .sort(compareTraceRows);
  return {
    schemaVersion: 1,
    documentId: value.documentId,
    finalRevision: value.finalRevision,
    executionMode: value.executionMode,
    runStatus: value.runStatus,
    processorCount: value.processorOrder.length,
    entryCount: value.entries.length,
    emittedViewCount: rows.reduce((sum, row) => sum + row.emittedViewCount, 0),
    emittedLayerCount: rows.reduce((sum, row) => sum + row.emittedLayerCount, 0),
    diagnosticCount: rows.reduce((sum, row) => sum + row.diagnosticCount, 0),
    cacheHitCount: rows.filter((row) => row.status === "cached").length,
    statusCounts: countById(rows.map((row) => row.status)),
    processorOrder: [...value.processorOrder],
    rows,
  };
}

export function renderTextPipelineTraceInspection(
  inspection: TextlabPipelineTraceInspection,
): string {
  return [
    "# textlab pipeline trace inspection",
    "",
    `Document: ${inspection.documentId}`,
    `Final revision: ${inspection.finalRevision}`,
    `Execution mode: ${inspection.executionMode}`,
    `Run status: ${inspection.runStatus}`,
    `Processors: ${inspection.processorCount}`,
    `Entries: ${inspection.entryCount}`,
    `Emitted views: ${inspection.emittedViewCount}`,
    `Emitted layers: ${inspection.emittedLayerCount}`,
    `Diagnostics: ${inspection.diagnosticCount}`,
    `Cache hits: ${inspection.cacheHitCount}`,
    "",
    "## Statuses",
    ...inspection.statusCounts.map((entry) => `- ${entry.id}: ${entry.count}`),
    "",
    "## Processor order",
    ...inspection.processorOrder.map((entry) => `- ${entry}`),
    "",
    "## Entries",
    ...inspection.rows.map((row) =>
      `- ${row.processorId}@${row.version} status=${row.status} input=${row.inputRevision} output=${row.outputRevision} emittedViews=${row.emittedViewCount} emittedLayers=${row.emittedLayerCount} diagnostics=${row.diagnosticCount}`,
    ),
    "",
  ].join("\n");
}

export function inspectTextPipelineBatchReport(value: unknown): TextlabPipelineBatchReportInspection {
  if (!isTextPipelineBatchRunReportV1(value)) {
    throw new TypeError("textpipeline batch report is invalid");
  }
  const rows = value.items
    .map(
      (item): TextlabPipelineBatchReportRow => ({
        inputIndex: item.inputIndex,
        documentId: item.documentId,
        finalRevision: item.finalRevision,
        runStatus: item.runStatus,
        executionMode: item.executionMode,
        cachePolicy: item.cachePolicy,
        processorCount: item.processorOrder.length,
        traceEntryCount: item.traceEntryCount,
        processorOrder: [...item.processorOrder],
      }),
    )
    .sort(comparePipelineBatchRows);
  const processorIds = stringSet(rows.flatMap((row) => row.processorOrder));
  return {
    schemaVersion: 1,
    documentCount: value.documentCount,
    completeCount: value.completeCount,
    partialCount: value.partialCount,
    executionModes: [...value.executionModes],
    cachePolicies: [...value.cachePolicies],
    contextFingerprintCount: value.contextFingerprints.length,
    processorCount: processorIds.length,
    traceEntryCount: rows.reduce((sum, row) => sum + row.traceEntryCount, 0),
    statusCounts: countById(rows.map((row) => row.runStatus)),
    processorIds,
    rows,
  };
}

export function renderTextPipelineBatchReportInspection(
  inspection: TextlabPipelineBatchReportInspection,
): string {
  return [
    "# textlab pipeline batch report inspection",
    "",
    `Documents: ${inspection.documentCount}`,
    `Complete: ${inspection.completeCount}`,
    `Partial: ${inspection.partialCount}`,
    `Execution modes: ${inspection.executionModes.join(",") || "<none>"}`,
    `Cache policies: ${inspection.cachePolicies.join(",") || "<none>"}`,
    `Context fingerprints: ${inspection.contextFingerprintCount}`,
    `Processors: ${inspection.processorCount}`,
    `Trace entries: ${inspection.traceEntryCount}`,
    "",
    "## Statuses",
    ...inspection.statusCounts.map((entry) => `- ${entry.id}: ${entry.count}`),
    "",
    "## Processors",
    ...inspection.processorIds.map((entry) => `- ${entry}`),
    "",
    "## Documents",
    ...inspection.rows.map(
      (row) =>
        `- [${row.inputIndex}] ${row.documentId} status=${row.runStatus} mode=${row.executionMode} cache=${row.cachePolicy} processors=${row.processorCount} traceEntries=${row.traceEntryCount} revision=${row.finalRevision}`,
    ),
    "",
  ].join("\n");
}

export function inspectTextProtocolResultEnvelope(
  value: unknown,
): TextlabProtocolResultEnvelopeInspection {
  if (!isTextProtocolResultEnvelopeV1(value)) {
    throw new TypeError("textprotocol result envelope is invalid");
  }
  const descriptor = getTextProtocolPayloadKindDescriptor(value.payloadKind);
  const compatibility = checkTextProtocolResultEnvelopeCompatibility(value);
  const diagnostics = protocolDiagnosticRows(value.diagnostics);
  const compatibilityDiagnostics = protocolDiagnosticRows(compatibility.diagnostics);
  const payloadKeys = recordKeys(value.payload);
  return {
    schemaVersion: 1,
    envelopeSchemaId: value.schemaId,
    envelopeSchemaVersion: value.schemaVersion,
    producerPackage: value.producer.package,
    producerVersion: value.producer.version,
    payloadKind: value.payloadKind,
    registeredPayloadKind: descriptor !== undefined,
    ...(descriptor?.ownerPackage === undefined ? {} : { payloadOwnerPackage: descriptor.ownerPackage }),
    ...(descriptor?.schemaId === undefined ? {} : { payloadSchemaId: descriptor.schemaId }),
    ...(descriptor?.schemaVersion === undefined ? {} : { payloadSchemaVersion: descriptor.schemaVersion }),
    payloadShape: payloadShape(value.payload),
    payloadKeys,
    provenanceReferenceCount: value.provenance?.references?.length ?? 0,
    diagnosticCount: diagnostics.length,
    scopeBoundaryPresent: isNonEmptyString(value.scopeBoundary),
    limitationCount: value.limitations?.length ?? 0,
    compatibilityOk: compatibility.ok,
    compatibilityDiagnosticCounts: countById(compatibilityDiagnostics.map((entry) => entry.code)),
    diagnostics,
    compatibilityDiagnostics,
  };
}

export function renderTextProtocolResultEnvelopeInspection(
  inspection: TextlabProtocolResultEnvelopeInspection,
): string {
  return [
    "# textlab result envelope inspection",
    "",
    `Schema: ${inspection.envelopeSchemaId}@${inspection.envelopeSchemaVersion}`,
    `Producer: ${inspection.producerPackage}@${inspection.producerVersion}`,
    `Payload kind: ${inspection.payloadKind}`,
    `Registered payload kind: ${inspection.registeredPayloadKind ? "yes" : "no"}`,
    `Payload owner: ${inspection.payloadOwnerPackage ?? "<unregistered>"}`,
    `Payload schema: ${inspection.payloadSchemaId ?? "<none>"}`,
    `Payload shape: ${inspection.payloadShape}`,
    `Payload keys: ${inspection.payloadKeys.join(",") || "<none>"}`,
    `Provenance references: ${inspection.provenanceReferenceCount}`,
    `Diagnostics: ${inspection.diagnosticCount}`,
    `Scope boundary: ${inspection.scopeBoundaryPresent ? "present" : "absent"}`,
    `Limitations: ${inspection.limitationCount}`,
    `Compatibility: ${inspection.compatibilityOk ? "pass" : "fail"}`,
    "",
    "## Compatibility diagnostics",
    ...inspection.compatibilityDiagnostics.map(
      (entry) =>
        `- ${entry.code} severity=${entry.severity}${entry.message === undefined ? "" : ` message=${entry.message}`}`,
    ),
    "",
    "## Envelope diagnostics",
    ...inspection.diagnostics.map(
      (entry) =>
        `- ${entry.code} severity=${entry.severity}${entry.message === undefined ? "" : ` message=${entry.message}`}`,
    ),
    "",
  ].join("\n");
}

export function inspectTextProtocolSchemaFamilyEnvelope(
  value: unknown,
  options: TextProtocolSchemaFamilyValidationOptions = {},
): TextlabProtocolSchemaFamilyEnvelopeInspection {
  const compatibility = checkTextProtocolSchemaFamilyEnvelope(value, options);
  if (!isRecord(value)) {
    throw new TypeError("textprotocol schema-family envelope is invalid");
  }
  const descriptor =
    typeof value.schemaId === "string"
      ? getTextProtocolSchemaFamilyDescriptorBySchemaId(value.schemaId)
      : undefined;
  if (!compatibility.ok || descriptor === undefined || !isTextProtocolProducerRef(value.producer)) {
    throw new TypeError("textprotocol schema-family envelope is invalid");
  }
  const envelope = value as unknown as TextProtocolSchemaFamilyEnvelopeV1;
  const diagnostics = protocolDiagnosticRows(envelope.diagnostics);
  const compatibilityDiagnostics = protocolDiagnosticRows(compatibility.diagnostics);
  const payloadKeys = recordKeys(envelope.payload);
  return {
    schemaVersion: 1,
    envelopeSchemaId: envelope.schemaId,
    envelopeSchemaVersion: envelope.schemaVersion,
    family: compatibility.family ?? descriptor.family,
    registeredSchemaFamily: true,
    ownerPackage: descriptor.ownerPackage,
    schemaPath: descriptor.schemaPath,
    producerPackage: envelope.producer.package,
    producerVersion: envelope.producer.version,
    payloadShape: payloadShape(envelope.payload),
    payloadKeys,
    provenanceReferenceCount: envelope.provenance?.references?.length ?? 0,
    diagnosticCount: diagnostics.length,
    limitationCount: envelope.limitations?.length ?? 0,
    extensionKeyCount: recordKeys(value.extensions).length,
    compatibilityOk: compatibility.ok,
    compatibilityDiagnosticCounts: countById(compatibilityDiagnostics.map((entry) => entry.code)),
    diagnostics,
    compatibilityDiagnostics,
  };
}

export function renderTextProtocolSchemaFamilyEnvelopeInspection(
  inspection: TextlabProtocolSchemaFamilyEnvelopeInspection,
): string {
  return [
    "# textlab schema-family envelope inspection",
    "",
    `Schema: ${inspection.envelopeSchemaId}@${inspection.envelopeSchemaVersion}`,
    `Family: ${inspection.family}`,
    `Registered schema family: ${inspection.registeredSchemaFamily ? "yes" : "no"}`,
    `Owner: ${inspection.ownerPackage ?? "<unregistered>"}`,
    `Schema path: ${inspection.schemaPath ?? "<none>"}`,
    `Producer: ${inspection.producerPackage}@${inspection.producerVersion}`,
    `Payload shape: ${inspection.payloadShape}`,
    `Payload keys: ${inspection.payloadKeys.join(",") || "<none>"}`,
    `Provenance references: ${inspection.provenanceReferenceCount}`,
    `Diagnostics: ${inspection.diagnosticCount}`,
    `Limitations: ${inspection.limitationCount}`,
    `Extension keys: ${inspection.extensionKeyCount}`,
    `Compatibility: ${inspection.compatibilityOk ? "pass" : "fail"}`,
    "",
    "## Compatibility diagnostics",
    ...inspection.compatibilityDiagnostics.map(
      (entry) =>
        `- ${entry.code} severity=${entry.severity}${entry.message === undefined ? "" : ` message=${entry.message}`}`,
    ),
    "",
    "## Envelope diagnostics",
    ...inspection.diagnostics.map(
      (entry) =>
        `- ${entry.code} severity=${entry.severity}${entry.message === undefined ? "" : ` message=${entry.message}`}`,
    ),
    "",
  ].join("\n");
}

function packBackedRuleRowFromAnnotation(
  layerId: string,
  annotation: Record<string, unknown>,
): TextlabPackBackedRuleRow | undefined {
  if (annotation.kind !== "extension" || !isNonEmptyString(annotation.extensionId)) return undefined;
  if (!annotation.extensionId.startsWith("textrules:textpack-")) return undefined;
  const data = annotation.data;
  if (!isRecord(data) || !isTextRulesTextPackRuleKind(data.kind)) return undefined;
  if (
    !isNonEmptyString(annotation.id) ||
    !isNonEmptyString(data.packId) ||
    !isNonEmptyString(data.resourceId) ||
    !isNonEmptyString(data.ruleId) ||
    !isNonEmptyString(data.matchedText) ||
    !isNonEmptyString(data.value) ||
    typeof data.line !== "number"
  ) {
    return undefined;
  }
  const target = firstSpanTarget(annotation);
  const confidence = isRecord(annotation.confidence) ? numeric(annotation.confidence.value) : undefined;
  return {
    layerId,
    annotationId: annotation.id,
    extensionId: annotation.extensionId,
    ruleKind: data.kind,
    packId: data.packId,
    resourceId: data.resourceId,
    ruleId: data.ruleId,
    line: data.line,
    matchedText: data.matchedText,
    value: data.value,
    targetStartCU: target.startCU,
    targetEndCU: target.endCU,
    ...(confidence === undefined ? {} : { confidence }),
    provenanceRefs: provenanceRefs(annotation),
  };
}

function packBackedRuleRowMatchesOptions(
  row: TextlabPackBackedRuleRow,
  options: TextlabPackBackedRuleInspectionOptions,
): boolean {
  return (
    (options.packIds === undefined || options.packIds.includes(row.packId)) &&
    (options.resourceIds === undefined || options.resourceIds.includes(row.resourceId)) &&
    (options.ruleKinds === undefined || options.ruleKinds.includes(row.ruleKind))
  );
}

export function inspectPackBackedRuleAnnotations(
  document: unknown,
  options: TextlabPackBackedRuleInspectionOptions = {},
): TextlabPackBackedRuleInspection {
  if (!isTextDocDocumentV1(document)) {
    throw new TypeError("textdoc document is invalid");
  }

  const allRows: TextlabPackBackedRuleRow[] = [];
  for (const layer of document.layers) {
    for (const annotation of layer.annotations) {
      const row = packBackedRuleRowFromAnnotation(layer.id, annotation as unknown as Record<string, unknown>);
      if (row !== undefined) allRows.push(row);
    }
  }

  const sortedAllRows = allRows.sort(comparePackBackedRuleRows);
  const rows = sortedAllRows.filter((row) => packBackedRuleRowMatchesOptions(row, options));
  return {
    schemaVersion: 1,
    sourcePackage: textRulesPackageName,
    documentId: document.documentId,
    revision: document.revision,
    ruleAnnotationCount: sortedAllRows.length,
    filteredAnnotationCount: rows.length,
    packCounts: countById(sortedAllRows.map((row) => row.packId)),
    resourceCounts: countById(sortedAllRows.map((row) => row.resourceId)),
    ruleKindCounts: countById(sortedAllRows.map((row) => row.ruleKind)),
    rows,
  };
}

export function renderPackBackedRuleInspection(
  inspection: TextlabPackBackedRuleInspection,
): string {
  return [
    "# textlab pack-backed rule inspection",
    "",
    `Document: ${inspection.documentId}`,
    `Revision: ${inspection.revision}`,
    `Source package: ${inspection.sourcePackage}`,
    `Rule annotations: ${inspection.ruleAnnotationCount}`,
    `Filtered annotations: ${inspection.filteredAnnotationCount}`,
    "",
    "## Packs",
    ...inspection.packCounts.map((entry) => `- ${entry.id}: ${entry.count}`),
    "",
    "## Resources",
    ...inspection.resourceCounts.map((entry) => `- ${entry.id}: ${entry.count}`),
    "",
    "## Rule kinds",
    ...inspection.ruleKindCounts.map((entry) => `- ${entry.id}: ${entry.count}`),
    "",
    "## Rows",
    ...inspection.rows.map((row) =>
      `- ${row.annotationId} ${row.ruleKind} pack=${row.packId} resource=${row.resourceId} rule=${row.ruleId} line=${row.line} span=${row.targetStartCU}-${row.targetEndCU} text=${JSON.stringify(row.matchedText)}`,
    ),
    "",
  ].join("\n");
}

function corpusArtifactSource(value: unknown): unknown {
  return isTextCorpusRetrievalIndexArtifactV1(value) ? value.index : value;
}

function corpusArtifactKind(value: unknown): string {
  if (isTextCorpusMetricEnvelopePayloadV1(value)) return "metric-envelope-payload";
  if (isTextCorpusRetrievalIndexArtifactV1(value)) return "retrieval-index-artifact";
  if (isTextCorpusRetrievalIndexStorageRefV1(value)) return "retrieval-index-storage-ref";
  const source = corpusArtifactSource(value);
  if (isTextCorpusConcordanceResultV1(source)) return "concordance";
  if (isTextCorpusFrequencyResultV1(source)) return "frequency";
  if (isTextCorpusNgramResultV1(source)) return "ngram";
  if (isTextCorpusCooccurrenceResultV1(source)) return "cooccurrence";
  if (isTextCorpusCollocateResultV1(source)) return "collocate";
  if (isTextCorpusPairwiseRelationResultV1(source)) return "pairwise-relation";
  if (isTextCorpusScoringResultV1(source)) return "scoring";
  if (isTextCorpusRetrievalIndexV1(source)) return "retrieval-index";
  if (isTextCorpusRetrievalResultV1(source)) return "retrieval-result";
  if (isTextCorpusRetrievalEvaluationResultV1(source)) return "retrieval-evaluation";
  if (isTextCorpusRetrievalCalibrationReportV1(source)) return "retrieval-calibration";
  if (isTextCorpusCitationWindowSetV1(source)) return "citation-window-set";
  if (isTextCorpusQuoteGroundingResultV1(source)) return "quote-grounding";
  return "unknown";
}

function corpusArtifactRowCount(source: unknown): number {
  return corpusArtifactRows(source).length;
}

function corpusArtifactRows(source: unknown): readonly unknown[] {
  if (
    isTextCorpusConcordanceResultV1(source) ||
    isTextCorpusFrequencyResultV1(source) ||
    isTextCorpusNgramResultV1(source) ||
    isTextCorpusCooccurrenceResultV1(source) ||
    isTextCorpusCollocateResultV1(source) ||
    isTextCorpusPairwiseRelationResultV1(source)
  ) {
    return source.rows;
  }
  if (isTextCorpusScoringResultV1(source)) return source.documents;
  if (isTextCorpusRetrievalIndexV1(source)) return source.documents;
  if (isTextCorpusRetrievalResultV1(source)) return source.results;
  if (isTextCorpusRetrievalEvaluationResultV1(source)) return source.queries;
  if (isTextCorpusRetrievalCalibrationReportV1(source)) return source.candidates;
  if (isTextCorpusCitationWindowSetV1(source)) return source.windows;
  if (isTextCorpusQuoteGroundingResultV1(source)) return source.matches;
  if (isTextCorpusMetricEnvelopePayloadV1(source)) return source.metrics;
  return [];
}

function corpusArtifactQueryCount(source: unknown): number {
  if (isTextCorpusScoringResultV1(source)) return source.queries.length;
  if (isTextCorpusRetrievalResultV1(source)) return source.results.length;
  if (isTextCorpusRetrievalEvaluationResultV1(source)) return source.queries.length;
  if (isTextCorpusCitationWindowSetV1(source)) {
    return stringSet(source.windows.map((window) => window.queryId)).length;
  }
  return 0;
}

function corpusArtifactHitCount(source: unknown): number {
  if (isTextCorpusRetrievalResultV1(source)) {
    return source.results.reduce((sum, result) => sum + result.hits.length, 0);
  }
  if (isTextCorpusCitationWindowSetV1(source)) return source.windows.length;
  if (isTextCorpusQuoteGroundingResultV1(source)) return source.matches.length;
  return 0;
}

function corpusArtifactFormulaIds(source: unknown): readonly string[] {
  if (isRecord(source) && isNonEmptyString(source.formula)) return [source.formula];
  if (isRecord(source) && isStringArray(source.formulaSet)) return stringSet(source.formulaSet);
  return [];
}

function corpusArtifactDocumentCount(source: unknown): number {
  if (isTextCorpusRetrievalIndexV1(source)) return source.documents.length;
  if (isTextCorpusRetrievalIndexStorageRefV1(source)) return source.documentCount;
  if (isTextCorpusScoringResultV1(source)) return source.documents.length;
  if (isRecord(source) && isRecord(source.selection) && isStringArray(source.selection.documentOrder)) {
    return source.selection.documentOrder.length;
  }
  return 0;
}

function corpusArtifactTokenCount(source: unknown): number {
  if (isRecord(source) && isRecord(source.selection) && typeof source.selection.tokenCount === "number") {
    return source.selection.tokenCount;
  }
  return 0;
}

function nonNegativeIntegerOption(value: number | undefined, label: string, fallback: number): number {
  if (value === undefined) return fallback;
  if (!Number.isInteger(value) || value < 0) {
    throw new TypeError(`textcorpus artifact ${label} must be a non-negative integer`);
  }
  return value;
}

export function inspectTextCorpusArtifact(
  value: unknown,
  options: TextlabCorpusArtifactInspectionOptions = {},
): TextlabCorpusArtifactInspection {
  if (!isTextCorpusArtifactV1(value) && !isTextCorpusMetricEnvelopePayloadV1(value)) {
    throw new TypeError("textcorpus artifact is invalid");
  }
  const source = corpusArtifactSource(value);
  const sourceRecord = isRecord(source) ? source : {};
  const rows = corpusArtifactRows(source);
  const pageOffset = nonNegativeIntegerOption(options.offset, "offset", 0);
  const pageLimit = nonNegativeIntegerOption(options.limit, "limit", 20);
  const pageRows = rows.slice(pageOffset, pageOffset + pageLimit);
  const pageEnd = pageOffset + pageRows.length;
  return {
    schemaVersion: 1,
    artifactKind: corpusArtifactKind(value),
    corpusId: isTextCorpusMetricEnvelopePayloadV1(value) ? value.corpusId : (sourceRecord.corpusId as string),
    ...(isTextCorpusMetricEnvelopePayloadV1(value) ? { metricSetId: value.metricSetId } : {}),
    ...(isNonEmptyString(sourceRecord.evidenceClass)
      ? { evidenceClass: sourceRecord.evidenceClass }
      : {}),
    ...(isNonEmptyString(sourceRecord.tokenSource) ? { tokenSource: sourceRecord.tokenSource } : {}),
    documentCount: corpusArtifactDocumentCount(source),
    tokenCount: corpusArtifactTokenCount(source),
    rowCount: corpusArtifactRowCount(source),
    queryCount: corpusArtifactQueryCount(source),
    hitCount: corpusArtifactHitCount(source),
    metricCount: isTextCorpusMetricEnvelopePayloadV1(value) ? value.metrics.length : 0,
    formulaIds: corpusArtifactFormulaIds(source),
    pageOffset,
    pageLimit,
    pageEnd,
    pageRowCount: pageRows.length,
    hasNextPage: pageEnd < rows.length,
    pageRows,
    ...(isTextCorpusRetrievalIndexArtifactV1(value) ? { checksum: value.checksum.value } : {}),
    ...(isTextCorpusRetrievalIndexStorageRefV1(value)
      ? { checksum: value.checksum.value, storageKey: value.key, byteLength: value.byteLength }
      : {}),
  };
}

export function renderTextCorpusArtifactInspection(
  inspection: TextlabCorpusArtifactInspection,
): string {
  return [
    "# textlab textcorpus artifact inspection",
    "",
    `Kind: ${inspection.artifactKind}`,
    `Corpus: ${inspection.corpusId}`,
    `Metric set: ${inspection.metricSetId ?? "none"}`,
    `Evidence class: ${inspection.evidenceClass ?? "none"}`,
    `Token source: ${inspection.tokenSource ?? "none"}`,
    `Documents: ${inspection.documentCount}`,
    `Tokens: ${inspection.tokenCount}`,
    `Rows: ${inspection.rowCount}`,
    `Queries: ${inspection.queryCount}`,
    `Hits: ${inspection.hitCount}`,
    `Metrics: ${inspection.metricCount}`,
    `Formulas: ${inspection.formulaIds.join(",") || "none"}`,
    `Page offset: ${inspection.pageOffset}`,
    `Page limit: ${inspection.pageLimit}`,
    `Page rows: ${inspection.pageRowCount}`,
    `Page end: ${inspection.pageEnd}`,
    `Has next page: ${inspection.hasNextPage ? "yes" : "no"}`,
    `Checksum: ${inspection.checksum ?? "none"}`,
    `Storage key: ${inspection.storageKey ?? "none"}`,
    `Byte length: ${inspection.byteLength ?? 0}`,
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

export function inspectRetrievalQrels(document: unknown): TextlabRetrievalQrelsInspection {
  if (!isTextCorpusRetrievalQrelsV1(document)) {
    throw new TypeError("retrieval qrels document is invalid");
  }
  const ratings = document.judgments.flatMap((judgment) => judgment.ratings);
  return {
    schemaVersion: 1,
    taskId: document.taskId,
    corpusId: document.corpusId,
    queryCount: document.judgments.length,
    ratingCount: ratings.length,
    relevantRatingCount: ratings.filter((rating) => rating.grade > 0).length,
    maxGrade: ratings.reduce((max, rating) => Math.max(max, rating.grade), 0),
  };
}

export function renderRetrievalQrelsInspection(
  inspection: TextlabRetrievalQrelsInspection,
): string {
  return [
    "# textlab retrieval qrels inspection",
    "",
    `Task: ${inspection.taskId}`,
    `Corpus: ${inspection.corpusId}`,
    `Queries: ${inspection.queryCount}`,
    `Ratings: ${inspection.ratingCount}`,
    `Relevant ratings: ${inspection.relevantRatingCount}`,
    `Max grade: ${inspection.maxGrade}`,
    "",
  ].join("\n");
}

export function inspectRetrievalEvaluation(
  document: unknown,
): TextlabRetrievalEvaluationInspection {
  if (!isTextCorpusRetrievalEvaluationResultV1(document)) {
    throw new TypeError("retrieval evaluation document is invalid");
  }
  return {
    schemaVersion: 1,
    taskId: document.taskId,
    corpusId: document.corpusId,
    formula: document.formula,
    k: document.k,
    queryCount: document.queries.length,
    precisionAtK: document.summary.precisionAtK,
    recallAtK: document.summary.recallAtK,
    mrr: document.summary.mrr,
    ndcgAtK: document.summary.ndcgAtK,
  };
}

export function renderRetrievalEvaluationInspection(
  inspection: TextlabRetrievalEvaluationInspection,
): string {
  return [
    "# textlab retrieval evaluation inspection",
    "",
    `Task: ${inspection.taskId}`,
    `Corpus: ${inspection.corpusId}`,
    `Formula: ${inspection.formula}`,
    `K: ${inspection.k}`,
    `Queries: ${inspection.queryCount}`,
    `Precision@K: ${inspection.precisionAtK}`,
    `Recall@K: ${inspection.recallAtK}`,
    `MRR: ${inspection.mrr}`,
    `NDCG@K: ${inspection.ndcgAtK}`,
    "",
  ].join("\n");
}

export function inspectReleaseReadiness(document: unknown): TextlabReleaseReadinessInspection {
  if (
    !isRecord(document) ||
    document.schemaVersion !== 1 ||
    !isNonEmptyString(document.scope) ||
    !Array.isArray(document.dependencyReleaseOrder) ||
    !Array.isArray(document.packages)
  ) {
    throw new TypeError("release readiness document is invalid");
  }
  const packages = document.packages.filter(isRecord);
  const rows = packages
    .map((entry) => {
      const downstream = isRecord(entry.downstreamApiStability)
        ? entry.downstreamApiStability
        : {};
      return {
        packageName: isNonEmptyString(entry.packageName) ? entry.packageName : "<missing>",
        releaseTrack: isNonEmptyString(entry.releaseTrack) ? entry.releaseTrack : "<missing>",
        releaseReadiness: isNonEmptyString(entry.releaseReadiness)
          ? entry.releaseReadiness
          : "<missing>",
        downstreamApiStatus: isNonEmptyString(downstream.status) ? downstream.status : "<missing>",
        downstreamDependentCount: Array.isArray(downstream.downstreamDependents)
          ? downstream.downstreamDependents.length
          : 0,
        releaseBlockerCount: Array.isArray(entry.releaseBlockers)
          ? entry.releaseBlockers.length
          : 0,
        limitationCount: Array.isArray(entry.limitations) ? entry.limitations.length : 0,
      };
    })
    .sort((left, right) => left.packageName.localeCompare(right.packageName));
  return {
    schemaVersion: 1,
    scope: document.scope,
    packageCount: rows.length,
    stageCount: document.dependencyReleaseOrder.length,
    trackCounts: countById(rows.map((row) => row.releaseTrack)),
    readinessCounts: countById(rows.map((row) => row.releaseReadiness)),
    blockerCount: rows.reduce((sum, row) => sum + row.releaseBlockerCount, 0),
    rows,
  };
}

export function renderReleaseReadinessInspection(
  inspection: TextlabReleaseReadinessInspection,
): string {
  return [
    "# textlab release-readiness inspection",
    "",
    `Scope: ${inspection.scope}`,
    `Packages: ${inspection.packageCount}`,
    `Stages: ${inspection.stageCount}`,
    `Blockers: ${inspection.blockerCount}`,
    "",
    "## Release tracks",
    ...inspection.trackCounts.map((entry) => `- ${entry.id}: ${entry.count}`),
    "",
    "## Readiness",
    ...inspection.readinessCounts.map((entry) => `- ${entry.id}: ${entry.count}`),
    "",
    "## Packages",
    ...inspection.rows.map(
      (row) =>
        `- ${row.packageName} track=${row.releaseTrack} readiness=${row.releaseReadiness} downstream=${row.downstreamApiStatus} dependents=${row.downstreamDependentCount} blockers=${row.releaseBlockerCount}`,
    ),
    "",
  ].join("\n");
}
