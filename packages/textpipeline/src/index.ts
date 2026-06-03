import { isTextDocument, type TextDocument } from "@ismail-elkorchi/textdoc";

export const packageName = "@ismail-elkorchi/textpipeline" as const;
export const textPipelineTraceSchemaVersion = 1 as const;
export const textPipelineBatchRunReportSchemaVersion = 1 as const;
export const textPipelineCacheSnapshotSchemaVersion = 1 as const;
export const textPipelineWorkerRunReportSchemaVersion = 1 as const;
export const textPipelineWorkerPoolRunReportSchemaVersion = 1 as const;
export const textPipelineRecoveryPlanSchemaVersion = 1 as const;
export const textPipelineRecoveryExecutionReportSchemaVersion = 1 as const;
export const textPipelineDistributedScheduleSchemaVersion = 1 as const;

export type PackageName = typeof packageName;
export type TextPipelineTraceSchemaVersion =
	typeof textPipelineTraceSchemaVersion;
export type TextPipelineBatchRunReportSchemaVersion =
	typeof textPipelineBatchRunReportSchemaVersion;
export type TextPipelineCacheSnapshotSchemaVersion =
	typeof textPipelineCacheSnapshotSchemaVersion;
export type TextPipelineWorkerRunReportSchemaVersion =
	typeof textPipelineWorkerRunReportSchemaVersion;
export type TextPipelineWorkerPoolRunReportSchemaVersion =
	typeof textPipelineWorkerPoolRunReportSchemaVersion;
export type TextPipelineRecoveryPlanSchemaVersion =
	typeof textPipelineRecoveryPlanSchemaVersion;
export type TextPipelineRecoveryExecutionReportSchemaVersion =
	typeof textPipelineRecoveryExecutionReportSchemaVersion;
export type TextPipelineDistributedScheduleSchemaVersion =
	typeof textPipelineDistributedScheduleSchemaVersion;
export type TextPipelinePurity = "pure" | "stateful";
export type TextPipelineTraceStatus =
	| "applied"
	| "skipped"
	| "cached"
	| "failed";
export type TextPipelineRunStatus = "complete" | "partial";
export type TextPipelineExecutionMode = "sync" | "async";
export type TextPipelineErrorPolicy = "throw" | "continue";
export type TextPipelineCachePolicy = "none" | "read-through";
export type TextPipelineWorkerPoolStrategy = "round-robin";
export type TextPipelineDistributedScheduleStrategy = "capacity-round-robin";
export type TextPipelineRecoverySourceKind =
	| "batch-run-report"
	| "worker-run-report"
	| "worker-pool-run-report";
export type TextPipelineRecoveryAction = "retain" | "retry";
export type TextPipelineRecoveryReason = "complete-run" | "partial-run";
export type TextPipelineRecoveryExecutionStatus =
	| "retained"
	| "retry-complete"
	| "retry-exhausted";
export type TextPipelineDiagnosticSeverity = "info" | "warning" | "error";

export interface TextPipelineDiagnostic {
	readonly code: string;
	readonly severity: TextPipelineDiagnosticSeverity;
	readonly message?: string;
	readonly ref?: string;
	readonly evidenceRefs?: readonly string[];
}

export interface TextPipelineVersionRef {
	readonly id: string;
	readonly version: string;
}

export interface TextPipelineRequirementSet {
	readonly views?: readonly string[];
	readonly layers?: readonly string[];
	readonly packages?: readonly string[];
	readonly packs?: readonly string[];
	readonly profiles?: readonly string[];
	readonly packageVersions?: readonly TextPipelineVersionRef[];
	readonly packVersions?: readonly TextPipelineVersionRef[];
	readonly profileVersions?: readonly TextPipelineVersionRef[];
}

export interface TextPipelineEmitSet {
	readonly views?: readonly string[];
	readonly layers?: readonly string[];
}

export interface TextPipelineProcessorDescriptor {
	readonly id: string;
	readonly version: string;
	readonly dependsOn?: readonly string[];
	readonly requires?: TextPipelineRequirementSet;
	readonly emits?: TextPipelineEmitSet;
	readonly purity: TextPipelinePurity;
	readonly parallelSafe: boolean;
}

export interface TextPipelineContext {
	readonly packages?: readonly string[];
	readonly packs?: readonly string[];
	readonly profiles?: readonly string[];
	readonly packageVersions?: readonly TextPipelineVersionRef[];
	readonly packVersions?: readonly TextPipelineVersionRef[];
	readonly profileVersions?: readonly TextPipelineVersionRef[];
}

export interface TextPipelineProcessorRunResult {
	readonly document: TextDocument;
	readonly diagnostics?: readonly TextPipelineDiagnostic[];
}

export interface TextPipelineProcessor {
	readonly descriptor: TextPipelineProcessorDescriptor;
	run(
		document: TextDocument,
		context: TextPipelineContext,
	): TextPipelineProcessorRunResult;
}

export interface TextPipelineAsyncProcessor {
	readonly descriptor: TextPipelineProcessorDescriptor;
	run(
		document: TextDocument,
		context: TextPipelineContext,
	): TextPipelineProcessorRunResult | Promise<TextPipelineProcessorRunResult>;
}

export interface TextPipelineDocumentCache {
	get(
		key: string,
	): TextDocument | undefined | Promise<TextDocument | undefined>;
	set?(key: string, document: TextDocument): void | Promise<void>;
}

export interface TextPipelineCacheSnapshotEntryV1 {
	readonly key: string;
	readonly document: TextDocument;
}

export interface TextPipelineCacheSnapshotV1 {
	readonly schemaVersion: TextPipelineCacheSnapshotSchemaVersion;
	readonly artifactType: "textpipeline-cache-snapshot-v1";
	readonly namespace: string;
	readonly entryCount: number;
	readonly entries: readonly TextPipelineCacheSnapshotEntryV1[];
}

export interface TextPipelineSnapshotBackedDocumentCache
	extends TextPipelineDocumentCache {
	readonly namespace: string;
	snapshot(): TextPipelineCacheSnapshotV1;
}

export interface TextPipelineSnapshotBackedDocumentCacheOptions {
	readonly namespace?: string;
}

export interface TextPipelineRunOptions {
	readonly signal?: AbortSignal;
	readonly errorPolicy?: TextPipelineErrorPolicy;
	readonly cache?: TextPipelineDocumentCache;
	readonly cacheNamespace?: string;
}

export interface TextPipelineCacheKeyOptions {
	readonly cacheNamespace?: string;
}

export interface TextPipelineGraphValidationResult {
	readonly ok: boolean;
	readonly processorOrder: readonly string[];
	readonly diagnostics: readonly TextPipelineDiagnostic[];
}

export interface TextPipelineExecutionPlan {
	readonly processorOrder: readonly string[];
}

export interface TextPipelineTraceEntry {
	readonly processorId: string;
	readonly version: string;
	readonly status: TextPipelineTraceStatus;
	readonly emittedViews: readonly string[];
	readonly emittedLayers: readonly string[];
	readonly diagnostics?: readonly TextPipelineDiagnostic[];
	readonly inputRevision: string;
	readonly outputRevision: string;
	readonly cacheKey?: string;
}

export interface TextPipelineTraceV1 {
	readonly schemaVersion: TextPipelineTraceSchemaVersion;
	readonly documentId: string;
	readonly finalRevision: string;
	readonly executionMode: TextPipelineExecutionMode;
	readonly runStatus: TextPipelineRunStatus;
	readonly processorOrder: readonly string[];
	readonly contextFingerprint: string;
	readonly cachePolicy: TextPipelineCachePolicy;
	readonly entries: readonly TextPipelineTraceEntry[];
}

export interface TextPipelineRunResult {
	readonly document: TextDocument;
	readonly trace: TextPipelineTraceV1;
}

export interface TextPipelineBatchRunItem {
	readonly inputIndex: number;
	readonly documentId: string;
	readonly finalRevision: string;
	readonly runStatus: TextPipelineRunStatus;
	readonly executionMode: TextPipelineExecutionMode;
	readonly cachePolicy: TextPipelineCachePolicy;
	readonly processorOrder: readonly string[];
	readonly traceEntryCount: number;
}

export interface TextPipelineBatchRunReport {
	readonly schemaVersion: TextPipelineBatchRunReportSchemaVersion;
	readonly documentCount: number;
	readonly completeCount: number;
	readonly partialCount: number;
	readonly executionModes: readonly TextPipelineExecutionMode[];
	readonly cachePolicies: readonly TextPipelineCachePolicy[];
	readonly contextFingerprints: readonly string[];
	readonly items: readonly TextPipelineBatchRunItem[];
}

export interface TextPipelineBatchRunResult {
	readonly runs: readonly TextPipelineRunResult[];
	readonly report: TextPipelineBatchRunReport;
}

export interface TextPipelineWorkerRunInput {
	readonly inputIndex: number;
	readonly document: TextDocument;
	readonly processors: readonly TextPipelineExecutableProcessor[];
	readonly context: TextPipelineContext;
	readonly options: TextPipelineRunOptions;
}

export interface TextPipelineWorker {
	readonly workerId: string;
	run(
		input: TextPipelineWorkerRunInput,
	): TextPipelineRunResult | Promise<TextPipelineRunResult>;
}

export interface TextPipelineWorkerRunItem extends TextPipelineBatchRunItem {
	readonly workerId: string;
}

export interface TextPipelineWorkerRunReport {
	readonly schemaVersion: TextPipelineWorkerRunReportSchemaVersion;
	readonly workerId: string;
	readonly documentCount: number;
	readonly completeCount: number;
	readonly partialCount: number;
	readonly executionModes: readonly TextPipelineExecutionMode[];
	readonly cachePolicies: readonly TextPipelineCachePolicy[];
	readonly contextFingerprints: readonly string[];
	readonly items: readonly TextPipelineWorkerRunItem[];
}

export interface TextPipelineWorkerBatchRunResult {
	readonly runs: readonly TextPipelineRunResult[];
	readonly report: TextPipelineWorkerRunReport;
}

export interface TextPipelineWorkerPoolRunOptions
	extends TextPipelineRunOptions {
	readonly poolId?: string;
	readonly strategy?: TextPipelineWorkerPoolStrategy;
	readonly maxConcurrency?: number;
}

export interface TextPipelineWorkerPoolAssignment {
	readonly workerId: string;
	readonly workerSlot: number;
}

export interface TextPipelineWorkerPoolRunItem
	extends TextPipelineBatchRunItem {
	readonly workerId: string;
	readonly workerSlot: number;
}

export interface TextPipelineWorkerPoolRunReport {
	readonly schemaVersion: TextPipelineWorkerPoolRunReportSchemaVersion;
	readonly poolId: string;
	readonly strategy: TextPipelineWorkerPoolStrategy;
	readonly workerIds: readonly string[];
	readonly documentCount: number;
	readonly completeCount: number;
	readonly partialCount: number;
	readonly executionModes: readonly TextPipelineExecutionMode[];
	readonly cachePolicies: readonly TextPipelineCachePolicy[];
	readonly contextFingerprints: readonly string[];
	readonly items: readonly TextPipelineWorkerPoolRunItem[];
}

export interface TextPipelineWorkerPoolBatchRunResult {
	readonly runs: readonly TextPipelineRunResult[];
	readonly report: TextPipelineWorkerPoolRunReport;
}

export interface TextPipelineDistributedNodeSpec {
	readonly nodeId: string;
	readonly workerIds: readonly string[];
	readonly maxConcurrentDocuments?: number;
	readonly labels?: readonly string[];
}

export interface TextPipelineDistributedScheduleOptions {
	readonly scheduleId?: string;
	readonly strategy?: TextPipelineDistributedScheduleStrategy;
	readonly cacheNamespace?: string;
	readonly requireParallelSafeProcessors?: boolean;
}

export interface TextPipelineDistributedScheduleNodeV1 {
	readonly nodeId: string;
	readonly nodeSlot: number;
	readonly workerIds: readonly string[];
	readonly activeWorkerIds: readonly string[];
	readonly maxConcurrentDocuments: number;
	readonly labels?: readonly string[];
}

export interface TextPipelineDistributedScheduleItem {
	readonly inputIndex: number;
	readonly documentId: string;
	readonly nodeId: string;
	readonly nodeSlot: number;
	readonly workerId: string;
	readonly workerSlot: number;
	readonly globalWorkerSlot: number;
	readonly processorOrder: readonly string[];
	readonly contextFingerprint: string;
}

export interface TextPipelineDistributedSchedulePlanV1 {
	readonly schemaVersion: TextPipelineDistributedScheduleSchemaVersion;
	readonly artifactType: "textpipeline-distributed-schedule-plan-v1";
	readonly scheduleId: string;
	readonly strategy: TextPipelineDistributedScheduleStrategy;
	readonly documentCount: number;
	readonly nodeCount: number;
	readonly workerCount: number;
	readonly processorOrder: readonly string[];
	readonly contextFingerprint: string;
	readonly parallelSafe: boolean;
	readonly nonParallelSafeProcessorIds: readonly string[];
	readonly cacheNamespace?: string;
	readonly nodeIds: readonly string[];
	readonly workerIds: readonly string[];
	readonly nodes: readonly TextPipelineDistributedScheduleNodeV1[];
	readonly items: readonly TextPipelineDistributedScheduleItem[];
}

export type TextPipelineRecoverySourceReport =
	| TextPipelineBatchRunReport
	| TextPipelineWorkerRunReport
	| TextPipelineWorkerPoolRunReport;

export interface TextPipelineRecoveryPlanOptions {
	readonly planId?: string;
	readonly maxRetryAttempts?: number;
	readonly includeCompleteItems?: boolean;
}

export interface TextPipelineRecoveryPlanItem {
	readonly inputIndex: number;
	readonly documentId: string;
	readonly finalRevision: string;
	readonly recoveryAction: TextPipelineRecoveryAction;
	readonly reason: TextPipelineRecoveryReason;
	readonly nextAttempt: number;
	readonly maxAttempts: number;
	readonly processorOrder: readonly string[];
	readonly traceEntryCount: number;
	readonly cachePolicy: TextPipelineCachePolicy;
	readonly failedProcessorIds: readonly string[];
	readonly skippedProcessorIds: readonly string[];
	readonly workerId?: string;
	readonly workerSlot?: number;
}

export interface TextPipelineRecoveryPlanV1 {
	readonly schemaVersion: TextPipelineRecoveryPlanSchemaVersion;
	readonly artifactType: "textpipeline-recovery-plan-v1";
	readonly planId: string;
	readonly sourceKind: TextPipelineRecoverySourceKind;
	readonly documentCount: number;
	readonly completeCount: number;
	readonly partialCount: number;
	readonly retryCount: number;
	readonly maxRetryAttempts: number;
	readonly retryInputIndexes: readonly number[];
	readonly items: readonly TextPipelineRecoveryPlanItem[];
}

export interface TextPipelineRecoveryExecutionAttempt {
	readonly attempt: number;
	readonly runStatus: TextPipelineRunStatus;
	readonly finalRevision: string;
	readonly traceEntryCount: number;
	readonly failedProcessorIds: readonly string[];
	readonly skippedProcessorIds: readonly string[];
}

export interface TextPipelineRecoveryExecutionReportItem {
	readonly inputIndex: number;
	readonly documentId: string;
	readonly recoveryAction: TextPipelineRecoveryAction;
	readonly executionStatus: TextPipelineRecoveryExecutionStatus;
	readonly startAttempt: number;
	readonly maxAttempts: number;
	readonly attemptedAttempts: number;
	readonly finalAttempt: number;
	readonly finalRevision: string;
	readonly traceEntryCount: number;
	readonly failedProcessorIds: readonly string[];
	readonly skippedProcessorIds: readonly string[];
	readonly attempts: readonly TextPipelineRecoveryExecutionAttempt[];
	readonly workerId?: string;
	readonly workerSlot?: number;
}

export interface TextPipelineRecoveryExecutionReportV1 {
	readonly schemaVersion: TextPipelineRecoveryExecutionReportSchemaVersion;
	readonly artifactType: "textpipeline-recovery-execution-report-v1";
	readonly planId: string;
	readonly sourceKind: TextPipelineRecoverySourceKind;
	readonly documentCount: number;
	readonly retainedCount: number;
	readonly retryCount: number;
	readonly attemptedRetryCount: number;
	readonly completeRetryCount: number;
	readonly exhaustedRetryCount: number;
	readonly attemptCount: number;
	readonly retryInputIndexes: readonly number[];
	readonly items: readonly TextPipelineRecoveryExecutionReportItem[];
}

export interface TextPipelineRecoveryExecutionInput {
	readonly inputIndex: number;
	readonly document: TextDocument;
	readonly planItem: TextPipelineRecoveryPlanItem;
	readonly attempt: number;
	readonly processors: readonly TextPipelineAsyncProcessor[];
	readonly context: TextPipelineContext;
	readonly options: TextPipelineRunOptions;
}

export interface TextPipelineRecoveryExecutor {
	run(
		input: TextPipelineRecoveryExecutionInput,
	): TextPipelineRunResult | Promise<TextPipelineRunResult>;
}

export interface TextPipelineRecoveryExecutionOptions
	extends TextPipelineRunOptions {
	readonly executor?: TextPipelineRecoveryExecutor;
}

export interface TextPipelineRecoveryExecutionResult {
	readonly runs: readonly TextPipelineRunResult[];
	readonly report: TextPipelineRecoveryExecutionReportV1;
}

export type TextPipelineExecutableProcessor =
	| TextPipelineProcessor
	| TextPipelineAsyncProcessor;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
	return typeof value === "string" && value.length > 0;
}

function isStringArray(value: unknown): value is readonly string[] {
	return (
		Array.isArray(value) && value.every((entry) => isNonEmptyString(entry))
	);
}

export function isTextPipelineDiagnostic(
	value: unknown,
): value is TextPipelineDiagnostic {
	return (
		isRecord(value) &&
		isNonEmptyString(value.code) &&
		(value.severity === "info" ||
			value.severity === "warning" ||
			value.severity === "error") &&
		(value.message === undefined || typeof value.message === "string") &&
		(value.ref === undefined || isNonEmptyString(value.ref)) &&
		(value.evidenceRefs === undefined || isStringArray(value.evidenceRefs))
	);
}

function isNonNegativeInteger(value: unknown): value is number {
	return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function hasUniqueStrings(values: readonly string[]): boolean {
	return new Set(values).size === values.length;
}

function sameStringArray(
	left: readonly string[],
	right: readonly string[],
): boolean {
	return (
		left.length === right.length &&
		left.every((entry, index) => entry === right[index])
	);
}

function sameNumberArray(
	left: readonly number[],
	right: readonly number[],
): boolean {
	return (
		left.length === right.length &&
		left.every((entry, index) => entry === right[index])
	);
}

function isVersionRef(value: unknown): value is TextPipelineVersionRef {
	return (
		isRecord(value) &&
		isNonEmptyString(value.id) &&
		isNonEmptyString(value.version)
	);
}

function hasUniqueVersionRefIds(
	values: readonly TextPipelineVersionRef[],
): boolean {
	return new Set(values.map((entry) => entry.id)).size === values.length;
}

function isVersionRefArray(
	value: unknown,
): value is readonly TextPipelineVersionRef[] {
	return (
		Array.isArray(value) &&
		value.every((entry) => isVersionRef(entry)) &&
		hasUniqueVersionRefIds(value)
	);
}

function listMissingValues(
	expected: readonly string[] | undefined,
	actual: ReadonlySet<string>,
): readonly string[] {
	if (expected === undefined) return [];
	return expected.filter((entry) => !actual.has(entry));
}

function textDocumentRevision(document: TextDocument): string {
	const revision = document.metadata["revision"];
	return isNonEmptyString(revision) ? revision : "0";
}

function collectEmittedIds(
	before: Readonly<Record<string, unknown>>,
	after: Readonly<Record<string, unknown>>,
): readonly string[] {
	const existingIds = new Set(Object.keys(before));
	return Object.keys(after)
		.filter((entry) => !existingIds.has(entry))
		.sort((left, right) => left.localeCompare(right));
}

function uniqueSortedStrings(values: readonly string[]): readonly string[] {
	return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function normalizeIdSet(
	values: readonly string[] | undefined,
	versionRefs: readonly TextPipelineVersionRef[] | undefined,
): ReadonlySet<string> {
	return new Set([
		...(values ?? []),
		...(versionRefs ?? []).map((entry) => entry.id),
	]);
}

function sortedVersionRefs(
	values: readonly TextPipelineVersionRef[] | undefined,
): readonly TextPipelineVersionRef[] {
	return [...(values ?? [])].sort((left, right) =>
		left.id.localeCompare(right.id),
	);
}

function getVersionMap(
	values: readonly TextPipelineVersionRef[] | undefined,
): ReadonlyMap<string, string> {
	return new Map((values ?? []).map((entry) => [entry.id, entry.version]));
}

function stableJson(value: unknown): string {
	if (Array.isArray(value)) {
		return `[${value.map((entry) => stableJson(entry)).join(",")}]`;
	}
	if (isRecord(value)) {
		return `{${Object.keys(value)
			.sort((left, right) => left.localeCompare(right))
			.map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
			.join(",")}}`;
	}
	return JSON.stringify(value);
}

function canonicalContext(
	context: TextPipelineContext,
): Readonly<Record<string, unknown>> {
	return {
		packages: uniqueSortedStrings([
			...(context.packages ?? []),
			...(context.packageVersions ?? []).map((entry) => entry.id),
		]),
		packageVersions: sortedVersionRefs(context.packageVersions),
		packs: uniqueSortedStrings([
			...(context.packs ?? []),
			...(context.packVersions ?? []).map((entry) => entry.id),
		]),
		packVersions: sortedVersionRefs(context.packVersions),
		profiles: uniqueSortedStrings([
			...(context.profiles ?? []),
			...(context.profileVersions ?? []).map((entry) => entry.id),
		]),
		profileVersions: sortedVersionRefs(context.profileVersions),
	};
}

function canonicalDocumentForCache(
	document: TextDocument,
): Readonly<Record<string, unknown>> {
	return {
		id: document.id,
		sources: document.sources,
		views: document.views,
		spanMaps: document.spanMaps,
		layers: document.layers,
		graphs: document.graphs,
		metadata: document.metadata,
	};
}

export function createTextPipelineContextFingerprint(
	context: TextPipelineContext = {},
): string {
	if (!isTextPipelineContext(context)) {
		throw new TypeError("pipeline context is invalid");
	}
	return stableJson(canonicalContext(context));
}

function diagnostic(
	code: string,
	severity: TextPipelineDiagnostic["severity"],
	message: string,
): TextPipelineDiagnostic {
	return { code, severity, message };
}

function formatMissingRequirementMessage(
	kind: string,
	values: readonly string[],
): string {
	return `missing required ${kind}: ${values.join(", ")}`;
}

function pushMissingIdDiagnostic(
	diagnostics: TextPipelineDiagnostic[],
	code: string,
	kind: string,
	values: readonly string[],
): void {
	if (values.length === 0) return;
	diagnostics.push(
		diagnostic(code, "warning", formatMissingRequirementMessage(kind, values)),
	);
}

function pushVersionDiagnostics(
	diagnostics: TextPipelineDiagnostic[],
	kind: "package" | "pack" | "profile",
	required: readonly TextPipelineVersionRef[] | undefined,
	actual: ReadonlyMap<string, string>,
): void {
	for (const requirement of required ?? []) {
		const actualVersion = actual.get(requirement.id);
		if (actualVersion === undefined) {
			diagnostics.push(
				diagnostic(
					`textpipeline.missing-${kind}-version`,
					"warning",
					`missing required ${kind} version: ${requirement.id}@${requirement.version}`,
				),
			);
		} else if (actualVersion !== requirement.version) {
			diagnostics.push(
				diagnostic(
					"textpipeline.version-mismatch",
					"warning",
					`${kind} ${requirement.id} requires ${requirement.version} but got ${actualVersion}`,
				),
			);
		}
	}
}

function getRequirementDiagnostics(
	descriptor: TextPipelineProcessorDescriptor,
	document: TextDocument,
	context: TextPipelineContext,
): readonly TextPipelineDiagnostic[] {
	const viewIds = new Set(Object.keys(document.views));
	const layerIds = new Set(Object.keys(document.layers));
	const packageIds = normalizeIdSet(context.packages, context.packageVersions);
	const packIds = normalizeIdSet(context.packs, context.packVersions);
	const profileIds = normalizeIdSet(context.profiles, context.profileVersions);
	const packageVersions = getVersionMap(context.packageVersions);
	const packVersions = getVersionMap(context.packVersions);
	const profileVersions = getVersionMap(context.profileVersions);

	const diagnostics: TextPipelineDiagnostic[] = [];

	pushMissingIdDiagnostic(
		diagnostics,
		"textpipeline.missing-view",
		"views",
		listMissingValues(descriptor.requires?.views, viewIds),
	);
	pushMissingIdDiagnostic(
		diagnostics,
		"textpipeline.missing-layer",
		"layers",
		listMissingValues(descriptor.requires?.layers, layerIds),
	);
	pushMissingIdDiagnostic(
		diagnostics,
		"textpipeline.missing-package",
		"packages",
		listMissingValues(descriptor.requires?.packages, packageIds),
	);
	pushMissingIdDiagnostic(
		diagnostics,
		"textpipeline.missing-pack",
		"packs",
		listMissingValues(descriptor.requires?.packs, packIds),
	);
	pushMissingIdDiagnostic(
		diagnostics,
		"textpipeline.missing-profile",
		"profiles",
		listMissingValues(descriptor.requires?.profiles, profileIds),
	);

	pushVersionDiagnostics(
		diagnostics,
		"package",
		descriptor.requires?.packageVersions,
		packageVersions,
	);
	pushVersionDiagnostics(
		diagnostics,
		"pack",
		descriptor.requires?.packVersions,
		packVersions,
	);
	pushVersionDiagnostics(
		diagnostics,
		"profile",
		descriptor.requires?.profileVersions,
		profileVersions,
	);

	return diagnostics;
}

function assertValidTraceDiagnostics(
	processorId: string,
	diagnostics: readonly TextPipelineDiagnostic[] | undefined,
): readonly TextPipelineDiagnostic[] {
	if (diagnostics === undefined) return [];
	if (
		!Array.isArray(diagnostics) ||
		!diagnostics.every((entry) => isTextPipelineDiagnostic(entry))
	) {
		throw new TypeError(
			`processor ${processorId} returned invalid diagnostics`,
		);
	}
	return diagnostics;
}

function assertEmitsSubset(
	processor: TextPipelineExecutableProcessor,
	emittedViews: readonly string[],
	emittedLayers: readonly string[],
): void {
	const declaredViews = new Set(processor.descriptor.emits?.views ?? []);
	const declaredLayers = new Set(processor.descriptor.emits?.layers ?? []);

	if (
		processor.descriptor.emits?.views !== undefined &&
		emittedViews.some((viewId) => !declaredViews.has(viewId))
	) {
		throw new Error(
			`processor ${processor.descriptor.id} emitted undeclared view ids`,
		);
	}

	if (
		processor.descriptor.emits?.layers !== undefined &&
		emittedLayers.some((layerId) => !declaredLayers.has(layerId))
	) {
		throw new Error(
			`processor ${processor.descriptor.id} emitted undeclared layer ids`,
		);
	}
}

function assertValidProcessorResult(
	processor: TextPipelineExecutableProcessor,
	currentDocument: TextDocument,
	result: TextPipelineProcessorRunResult,
): void {
	if (!isTextDocument(result.document)) {
		throw new TypeError(
			`processor ${processor.descriptor.id} returned an invalid document`,
		);
	}
	if (result.document.id !== currentDocument.id) {
		throw new Error(`processor ${processor.descriptor.id} changed document id`);
	}
}

function invalidGraphResult(
	diagnostics: readonly TextPipelineDiagnostic[],
): TextPipelineGraphValidationResult {
	return {
		ok: false,
		processorOrder: [],
		diagnostics,
	};
}

export function validateTextPipelineGraph(
	processors: readonly TextPipelineExecutableProcessor[],
): TextPipelineGraphValidationResult {
	const diagnostics: TextPipelineDiagnostic[] = [];
	const byId = new Map<string, TextPipelineExecutableProcessor>();
	const pendingCounts = new Map<string, number>();
	const dependents = new Map<string, string[]>();

	for (const processor of processors) {
		const descriptor = isRecord(processor) ? processor.descriptor : undefined;
		if (!isTextPipelineProcessorDescriptor(descriptor)) {
			diagnostics.push(
				diagnostic(
					"textpipeline.invalid-processor-descriptor",
					"error",
					"processor descriptor is invalid",
				),
			);
			continue;
		}
		if (typeof processor.run !== "function") {
			diagnostics.push(
				diagnostic(
					"textpipeline.invalid-processor-runner",
					"error",
					`processor ${descriptor.id} must expose a run function`,
				),
			);
			continue;
		}
		if (byId.has(descriptor.id)) {
			diagnostics.push(
				diagnostic(
					"textpipeline.duplicate-processor-id",
					"error",
					`duplicate processor id: ${descriptor.id}`,
				),
			);
			continue;
		}
		byId.set(descriptor.id, processor);
	}

	if (diagnostics.length > 0) return invalidGraphResult(diagnostics);

	for (const [processorId, processor] of byId) {
		const dependencies = processor.descriptor.dependsOn ?? [];
		pendingCounts.set(processorId, dependencies.length);
		for (const dependencyId of dependencies) {
			if (dependencyId === processorId) {
				diagnostics.push(
					diagnostic(
						"textpipeline.self-dependency",
						"error",
						`processor ${processorId} cannot depend on itself`,
					),
				);
				continue;
			}
			if (!byId.has(dependencyId)) {
				diagnostics.push(
					diagnostic(
						"textpipeline.missing-dependency",
						"error",
						`processor ${processorId} depends on missing processor ${dependencyId}`,
					),
				);
				continue;
			}
			const downstream = dependents.get(dependencyId) ?? [];
			downstream.push(processorId);
			downstream.sort((left, right) => left.localeCompare(right));
			dependents.set(dependencyId, downstream);
		}
	}

	if (diagnostics.length > 0) return invalidGraphResult(diagnostics);

	const ready = [...byId.keys()]
		.filter((processorId) => (pendingCounts.get(processorId) ?? 0) === 0)
		.sort((left, right) => left.localeCompare(right));
	const processorOrder: string[] = [];

	while (ready.length > 0) {
		const processorId = ready.shift();
		if (processorId === undefined) break;
		processorOrder.push(processorId);
		for (const dependentId of dependents.get(processorId) ?? []) {
			const remaining = (pendingCounts.get(dependentId) ?? 0) - 1;
			pendingCounts.set(dependentId, remaining);
			if (remaining === 0) {
				ready.push(dependentId);
				ready.sort((left, right) => left.localeCompare(right));
			}
		}
	}

	if (processorOrder.length !== byId.size) {
		const cyclicIds = [...byId.keys()]
			.filter((processorId) => !processorOrder.includes(processorId))
			.sort((left, right) => left.localeCompare(right));
		return invalidGraphResult([
			diagnostic(
				"textpipeline.cyclic-dependency-graph",
				"error",
				`processor dependency graph contains a cycle: ${cyclicIds.join(", ")}`,
			),
		]);
	}

	return {
		ok: true,
		processorOrder,
		diagnostics: [],
	};
}

export function createTextPipelineExecutionPlan(
	processors: readonly TextPipelineExecutableProcessor[],
): TextPipelineExecutionPlan {
	const validation = validateTextPipelineGraph(processors);
	if (!validation.ok) {
		throw new Error(
			validation.diagnostics
				.map((entry) => entry.message ?? entry.code)
				.join("; "),
		);
	}
	return {
		processorOrder: validation.processorOrder,
	};
}

function buildProcessorMap<TProcessor extends TextPipelineExecutableProcessor>(
	processors: readonly TProcessor[],
): {
	readonly byId: ReadonlyMap<string, TProcessor>;
	readonly plan: TextPipelineExecutionPlan;
} {
	const plan = createTextPipelineExecutionPlan(processors);
	return {
		byId: new Map(
			processors.map((processor) => [processor.descriptor.id, processor]),
		),
		plan,
	};
}

export function isTextPipelineVersionRef(
	value: unknown,
): value is TextPipelineVersionRef {
	return isVersionRef(value);
}

export function isTextPipelineRequirementSet(
	value: unknown,
): value is TextPipelineRequirementSet {
	return (
		isRecord(value) &&
		(value.views === undefined ||
			(isStringArray(value.views) && hasUniqueStrings(value.views))) &&
		(value.layers === undefined ||
			(isStringArray(value.layers) && hasUniqueStrings(value.layers))) &&
		(value.packages === undefined ||
			(isStringArray(value.packages) && hasUniqueStrings(value.packages))) &&
		(value.packs === undefined ||
			(isStringArray(value.packs) && hasUniqueStrings(value.packs))) &&
		(value.profiles === undefined ||
			(isStringArray(value.profiles) && hasUniqueStrings(value.profiles))) &&
		(value.packageVersions === undefined ||
			isVersionRefArray(value.packageVersions)) &&
		(value.packVersions === undefined ||
			isVersionRefArray(value.packVersions)) &&
		(value.profileVersions === undefined ||
			isVersionRefArray(value.profileVersions))
	);
}

export function isTextPipelineEmitSet(
	value: unknown,
): value is TextPipelineEmitSet {
	return (
		isRecord(value) &&
		(value.views === undefined ||
			(isStringArray(value.views) && hasUniqueStrings(value.views))) &&
		(value.layers === undefined ||
			(isStringArray(value.layers) && hasUniqueStrings(value.layers)))
	);
}

export function isTextPipelineProcessorDescriptor(
	value: unknown,
): value is TextPipelineProcessorDescriptor {
	return (
		isRecord(value) &&
		isNonEmptyString(value.id) &&
		isNonEmptyString(value.version) &&
		(value.dependsOn === undefined ||
			(isStringArray(value.dependsOn) && hasUniqueStrings(value.dependsOn))) &&
		(value.requires === undefined ||
			isTextPipelineRequirementSet(value.requires)) &&
		(value.emits === undefined || isTextPipelineEmitSet(value.emits)) &&
		(value.purity === "pure" || value.purity === "stateful") &&
		typeof value.parallelSafe === "boolean"
	);
}

export function isTextPipelineContext(
	value: unknown,
): value is TextPipelineContext {
	return (
		isRecord(value) &&
		(value.packages === undefined ||
			(isStringArray(value.packages) && hasUniqueStrings(value.packages))) &&
		(value.packs === undefined ||
			(isStringArray(value.packs) && hasUniqueStrings(value.packs))) &&
		(value.profiles === undefined ||
			(isStringArray(value.profiles) && hasUniqueStrings(value.profiles))) &&
		(value.packageVersions === undefined ||
			isVersionRefArray(value.packageVersions)) &&
		(value.packVersions === undefined ||
			isVersionRefArray(value.packVersions)) &&
		(value.profileVersions === undefined ||
			isVersionRefArray(value.profileVersions))
	);
}

export function isTextPipelineTraceEntry(
	value: unknown,
): value is TextPipelineTraceEntry {
	return (
		isRecord(value) &&
		isNonEmptyString(value.processorId) &&
		isNonEmptyString(value.version) &&
		(value.status === "applied" ||
			value.status === "skipped" ||
			value.status === "cached" ||
			value.status === "failed") &&
		isStringArray(value.emittedViews) &&
		isStringArray(value.emittedLayers) &&
		isNonEmptyString(value.inputRevision) &&
		isNonEmptyString(value.outputRevision) &&
		(value.cacheKey === undefined || isNonEmptyString(value.cacheKey)) &&
		(value.diagnostics === undefined ||
			(Array.isArray(value.diagnostics) &&
				value.diagnostics.every((entry) => isTextPipelineDiagnostic(entry))))
	);
}

export function isTextPipelineTraceV1(
	value: unknown,
): value is TextPipelineTraceV1 {
	return (
		isRecord(value) &&
		value.schemaVersion === textPipelineTraceSchemaVersion &&
		isNonEmptyString(value.documentId) &&
		isNonEmptyString(value.finalRevision) &&
		(value.executionMode === "sync" || value.executionMode === "async") &&
		(value.runStatus === "complete" || value.runStatus === "partial") &&
		isStringArray(value.processorOrder) &&
		isNonEmptyString(value.contextFingerprint) &&
		(value.cachePolicy === "none" || value.cachePolicy === "read-through") &&
		Array.isArray(value.entries) &&
		value.entries.every((entry) => isTextPipelineTraceEntry(entry))
	);
}

export function isTextPipelineCacheSnapshotEntryV1(
	value: unknown,
): value is TextPipelineCacheSnapshotEntryV1 {
	return (
		isRecord(value) &&
		isNonEmptyString(value.key) &&
		isTextDocument(value.document)
	);
}

export function isTextPipelineCacheSnapshotV1(
	value: unknown,
): value is TextPipelineCacheSnapshotV1 {
	if (
		!isRecord(value) ||
		value.schemaVersion !== textPipelineCacheSnapshotSchemaVersion ||
		value.artifactType !== "textpipeline-cache-snapshot-v1" ||
		!isNonEmptyString(value.namespace) ||
		!isNonNegativeInteger(value.entryCount) ||
		!Array.isArray(value.entries) ||
		!value.entries.every((entry) => isTextPipelineCacheSnapshotEntryV1(entry))
	) {
		return false;
	}
	const keys = value.entries.map((entry) => entry.key);
	return (
		value.entryCount === value.entries.length &&
		sameStringArray(keys, uniqueSortedStrings(keys))
	);
}

function createTextPipelineCacheSnapshot(
	namespace: string,
	entries: readonly TextPipelineCacheSnapshotEntryV1[],
): TextPipelineCacheSnapshotV1 {
	if (!isNonEmptyString(namespace)) {
		throw new TypeError(
			"textpipeline cache snapshot namespace must be a non-empty string",
		);
	}
	if (!entries.every((entry) => isTextPipelineCacheSnapshotEntryV1(entry))) {
		throw new TypeError(
			"textpipeline cache snapshot entries must contain valid documents",
		);
	}
	const sortedEntries = [...entries].sort((left, right) =>
		left.key.localeCompare(right.key),
	);
	const snapshot = {
		schemaVersion: textPipelineCacheSnapshotSchemaVersion,
		artifactType: "textpipeline-cache-snapshot-v1",
		namespace,
		entryCount: sortedEntries.length,
		entries: sortedEntries,
	} satisfies TextPipelineCacheSnapshotV1;
	if (!isTextPipelineCacheSnapshotV1(snapshot)) {
		throw new TypeError("textpipeline cache snapshot is invalid");
	}
	return snapshot;
}

export function createTextPipelineSnapshotBackedDocumentCache(
	snapshot?: TextPipelineCacheSnapshotV1,
	options: TextPipelineSnapshotBackedDocumentCacheOptions = {},
): TextPipelineSnapshotBackedDocumentCache {
	if (snapshot !== undefined && !isTextPipelineCacheSnapshotV1(snapshot)) {
		throw new TypeError("textpipeline cache snapshot is invalid");
	}
	if (options.namespace !== undefined && !isNonEmptyString(options.namespace)) {
		throw new TypeError(
			"textpipeline cache snapshot namespace must be a non-empty string",
		);
	}
	if (
		snapshot !== undefined &&
		options.namespace !== undefined &&
		snapshot.namespace !== options.namespace
	) {
		throw new Error(
			`textpipeline cache snapshot namespace mismatch: ${snapshot.namespace} != ${options.namespace}`,
		);
	}
	const namespace = snapshot?.namespace ?? options.namespace ?? "default";
	const documentsByKey = new Map<string, TextDocument>(
		snapshot?.entries.map((entry) => [entry.key, entry.document]) ?? [],
	);
	return {
		namespace,
		get(key) {
			if (!isNonEmptyString(key)) {
				throw new TypeError(
					"textpipeline cache key must be a non-empty string",
				);
			}
			return documentsByKey.get(key);
		},
		set(key, document) {
			if (!isNonEmptyString(key)) {
				throw new TypeError(
					"textpipeline cache key must be a non-empty string",
				);
			}
			if (!isTextDocument(document)) {
				throw new TypeError(
					"textpipeline cache document must satisfy TextDocument",
				);
			}
			documentsByKey.set(key, document);
		},
		snapshot() {
			return createTextPipelineCacheSnapshot(
				namespace,
				[...documentsByKey.entries()].map(([key, document]) => ({
					key,
					document,
				})),
			);
		},
	};
}

export function stringifyTextPipelineCacheSnapshot(
	snapshot: TextPipelineCacheSnapshotV1,
): string {
	if (!isTextPipelineCacheSnapshotV1(snapshot)) {
		throw new TypeError("textpipeline cache snapshot is invalid");
	}
	return `${JSON.stringify(snapshot, null, 2)}\n`;
}

export function parseTextPipelineCacheSnapshot(
	serialized: string,
): TextPipelineCacheSnapshotV1 {
	if (typeof serialized !== "string") {
		throw new TypeError("textpipeline cache snapshot JSON must be a string");
	}
	let parsed: unknown;
	try {
		parsed = JSON.parse(serialized);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		throw new SyntaxError(
			`textpipeline cache snapshot JSON parse failed: ${message}`,
		);
	}
	if (!isTextPipelineCacheSnapshotV1(parsed)) {
		throw new TypeError(
			"textpipeline cache snapshot JSON must satisfy TextPipelineCacheSnapshotV1",
		);
	}
	return parsed;
}

function isTextPipelineBatchRunItem(
	value: unknown,
): value is TextPipelineBatchRunItem {
	return (
		isRecord(value) &&
		isNonNegativeInteger(value.inputIndex) &&
		isNonEmptyString(value.documentId) &&
		isNonEmptyString(value.finalRevision) &&
		(value.runStatus === "complete" || value.runStatus === "partial") &&
		(value.executionMode === "sync" || value.executionMode === "async") &&
		(value.cachePolicy === "none" || value.cachePolicy === "read-through") &&
		isStringArray(value.processorOrder) &&
		isNonNegativeInteger(value.traceEntryCount)
	);
}

function isTextPipelineWorkerRunItem(
	value: unknown,
): value is TextPipelineWorkerRunItem {
	return (
		isRecord(value) &&
		isTextPipelineBatchRunItem(value) &&
		isNonEmptyString(value.workerId)
	);
}

function isTextPipelineWorkerPoolStrategy(
	value: unknown,
): value is TextPipelineWorkerPoolStrategy {
	return value === "round-robin";
}

function isTextPipelineWorkerPoolRunItem(
	value: unknown,
): value is TextPipelineWorkerPoolRunItem {
	return (
		isRecord(value) &&
		isTextPipelineWorkerRunItem(value) &&
		isNonNegativeInteger(value.workerSlot)
	);
}

export function isTextPipelineBatchRunReportV1(
	value: unknown,
): value is TextPipelineBatchRunReport {
	if (
		!isRecord(value) ||
		value.schemaVersion !== textPipelineBatchRunReportSchemaVersion
	) {
		return false;
	}
	if (
		!isNonNegativeInteger(value.documentCount) ||
		!isNonNegativeInteger(value.completeCount) ||
		!isNonNegativeInteger(value.partialCount) ||
		!isStringArray(value.executionModes) ||
		!isStringArray(value.cachePolicies) ||
		!isStringArray(value.contextFingerprints) ||
		!hasUniqueStrings(value.executionModes) ||
		!hasUniqueStrings(value.cachePolicies) ||
		!hasUniqueStrings(value.contextFingerprints) ||
		!Array.isArray(value.items) ||
		!value.items.every((item) => isTextPipelineBatchRunItem(item))
	) {
		return false;
	}

	const items = value.items;
	const inputIndexes = items.map((item) => item.inputIndex);
	if (!inputIndexes.every((inputIndex, index) => inputIndex === index))
		return false;

	const completeCount = items.filter(
		(item) => item.runStatus === "complete",
	).length;
	const partialCount = items.filter(
		(item) => item.runStatus === "partial",
	).length;
	return (
		value.documentCount === items.length &&
		value.completeCount === completeCount &&
		value.partialCount === partialCount &&
		value.completeCount + value.partialCount === value.documentCount &&
		sameStringArray(
			value.executionModes,
			uniqueSortedStrings(items.map((item) => item.executionMode)),
		) &&
		sameStringArray(
			value.cachePolicies,
			uniqueSortedStrings(items.map((item) => item.cachePolicy)),
		) &&
		sameStringArray(
			value.contextFingerprints,
			uniqueSortedStrings(value.contextFingerprints),
		)
	);
}

export function isTextPipelineWorkerRunReportV1(
	value: unknown,
): value is TextPipelineWorkerRunReport {
	if (
		!isRecord(value) ||
		value.schemaVersion !== textPipelineWorkerRunReportSchemaVersion ||
		!isNonEmptyString(value.workerId) ||
		!isNonNegativeInteger(value.documentCount) ||
		!isNonNegativeInteger(value.completeCount) ||
		!isNonNegativeInteger(value.partialCount) ||
		!isStringArray(value.executionModes) ||
		!isStringArray(value.cachePolicies) ||
		!isStringArray(value.contextFingerprints) ||
		!hasUniqueStrings(value.executionModes) ||
		!hasUniqueStrings(value.cachePolicies) ||
		!hasUniqueStrings(value.contextFingerprints) ||
		!Array.isArray(value.items) ||
		!value.items.every((item) => isTextPipelineWorkerRunItem(item))
	) {
		return false;
	}

	const items = value.items;
	const inputIndexes = items.map((item) => item.inputIndex);
	if (!inputIndexes.every((inputIndex, index) => inputIndex === index))
		return false;
	if (!items.every((item) => item.workerId === value.workerId)) return false;

	const completeCount = items.filter(
		(item) => item.runStatus === "complete",
	).length;
	const partialCount = items.filter(
		(item) => item.runStatus === "partial",
	).length;
	return (
		value.documentCount === items.length &&
		value.completeCount === completeCount &&
		value.partialCount === partialCount &&
		value.completeCount + value.partialCount === value.documentCount &&
		sameStringArray(
			value.executionModes,
			uniqueSortedStrings(items.map((item) => item.executionMode)),
		) &&
		sameStringArray(
			value.cachePolicies,
			uniqueSortedStrings(items.map((item) => item.cachePolicy)),
		) &&
		sameStringArray(
			value.contextFingerprints,
			uniqueSortedStrings(value.contextFingerprints),
		)
	);
}

export function isTextPipelineWorkerPoolRunReportV1(
	value: unknown,
): value is TextPipelineWorkerPoolRunReport {
	if (
		!isRecord(value) ||
		value.schemaVersion !== textPipelineWorkerPoolRunReportSchemaVersion ||
		!isNonEmptyString(value.poolId) ||
		!isTextPipelineWorkerPoolStrategy(value.strategy) ||
		!isStringArray(value.workerIds) ||
		!hasUniqueStrings(value.workerIds) ||
		value.workerIds.length === 0 ||
		!isNonNegativeInteger(value.documentCount) ||
		!isNonNegativeInteger(value.completeCount) ||
		!isNonNegativeInteger(value.partialCount) ||
		!isStringArray(value.executionModes) ||
		!isStringArray(value.cachePolicies) ||
		!isStringArray(value.contextFingerprints) ||
		!hasUniqueStrings(value.executionModes) ||
		!hasUniqueStrings(value.cachePolicies) ||
		!hasUniqueStrings(value.contextFingerprints) ||
		!Array.isArray(value.items) ||
		!value.items.every((item) => isTextPipelineWorkerPoolRunItem(item))
	) {
		return false;
	}

	const items = value.items;
	const workerIds = value.workerIds as readonly string[];
	const inputIndexes = items.map((item) => item.inputIndex);
	if (!inputIndexes.every((inputIndex, index) => inputIndex === index))
		return false;
	if (!items.every((item) => workerIds.includes(item.workerId))) return false;
	if (!items.every((item) => item.workerSlot < workerIds.length)) return false;
	if (!items.every((item) => workerIds[item.workerSlot] === item.workerId))
		return false;

	const completeCount = items.filter(
		(item) => item.runStatus === "complete",
	).length;
	const partialCount = items.filter(
		(item) => item.runStatus === "partial",
	).length;
	return (
		value.documentCount === items.length &&
		value.completeCount === completeCount &&
		value.partialCount === partialCount &&
		value.completeCount + value.partialCount === value.documentCount &&
		sameStringArray(
			value.executionModes,
			uniqueSortedStrings(items.map((item) => item.executionMode)),
		) &&
		sameStringArray(
			value.cachePolicies,
			uniqueSortedStrings(items.map((item) => item.cachePolicy)),
		) &&
		sameStringArray(
			value.contextFingerprints,
			uniqueSortedStrings(value.contextFingerprints),
		)
	);
}

function isTextPipelineDistributedScheduleStrategy(
	value: unknown,
): value is TextPipelineDistributedScheduleStrategy {
	return value === "capacity-round-robin";
}

function isTextPipelineDistributedScheduleNodeV1(
	value: unknown,
): value is TextPipelineDistributedScheduleNodeV1 {
	if (!isRecord(value)) return false;
	const workerIds = value.workerIds;
	const activeWorkerIds = value.activeWorkerIds;
	const maxConcurrentDocuments = value.maxConcurrentDocuments;
	const labels = value.labels;
	if (
		!isNonEmptyString(value.nodeId) ||
		!isNonNegativeInteger(value.nodeSlot) ||
		!isStringArray(workerIds) ||
		workerIds.length === 0 ||
		!hasUniqueStrings(workerIds) ||
		!isStringArray(activeWorkerIds) ||
		activeWorkerIds.length === 0 ||
		!hasUniqueStrings(activeWorkerIds) ||
		!isNonNegativeInteger(maxConcurrentDocuments) ||
		maxConcurrentDocuments < 1 ||
		maxConcurrentDocuments > workerIds.length ||
		activeWorkerIds.length !== maxConcurrentDocuments ||
		!activeWorkerIds.every((workerId) => workerIds.includes(workerId)) ||
		!sameStringArray(
			activeWorkerIds,
			workerIds.slice(0, maxConcurrentDocuments),
		) ||
		(labels !== undefined &&
			(!isStringArray(labels) || !hasUniqueStrings(labels)))
	) {
		return false;
	}
	return true;
}

function isTextPipelineDistributedScheduleItem(
	value: unknown,
): value is TextPipelineDistributedScheduleItem {
	return (
		isRecord(value) &&
		isNonNegativeInteger(value.inputIndex) &&
		isNonEmptyString(value.documentId) &&
		isNonEmptyString(value.nodeId) &&
		isNonNegativeInteger(value.nodeSlot) &&
		isNonEmptyString(value.workerId) &&
		isNonNegativeInteger(value.workerSlot) &&
		isNonNegativeInteger(value.globalWorkerSlot) &&
		isStringArray(value.processorOrder) &&
		isNonEmptyString(value.contextFingerprint)
	);
}

export function isTextPipelineDistributedSchedulePlanV1(
	value: unknown,
): value is TextPipelineDistributedSchedulePlanV1 {
	if (!isRecord(value)) return false;
	const processorOrder = value.processorOrder;
	const nonParallelSafeProcessorIds = value.nonParallelSafeProcessorIds;
	const nodeIds = value.nodeIds;
	const workerIds = value.workerIds;
	const nodes = value.nodes;
	const items = value.items;
	if (
		value.schemaVersion !== textPipelineDistributedScheduleSchemaVersion ||
		value.artifactType !== "textpipeline-distributed-schedule-plan-v1" ||
		!isNonEmptyString(value.scheduleId) ||
		!isTextPipelineDistributedScheduleStrategy(value.strategy) ||
		!isNonNegativeInteger(value.documentCount) ||
		!isNonNegativeInteger(value.nodeCount) ||
		!isNonNegativeInteger(value.workerCount) ||
		!isStringArray(processorOrder) ||
		!hasUniqueStrings(processorOrder) ||
		!isNonEmptyString(value.contextFingerprint) ||
		typeof value.parallelSafe !== "boolean" ||
		!isStringArray(nonParallelSafeProcessorIds) ||
		!hasUniqueStrings(nonParallelSafeProcessorIds) ||
		(value.cacheNamespace !== undefined &&
			!isNonEmptyString(value.cacheNamespace)) ||
		!isStringArray(nodeIds) ||
		!hasUniqueStrings(nodeIds) ||
		!isStringArray(workerIds) ||
		!hasUniqueStrings(workerIds) ||
		!Array.isArray(nodes) ||
		!nodes.every((node) => isTextPipelineDistributedScheduleNodeV1(node)) ||
		!Array.isArray(items) ||
		!items.every((item) => isTextPipelineDistributedScheduleItem(item))
	) {
		return false;
	}

	const activeWorkerIds = nodes.flatMap((node) => node.activeWorkerIds);
	return (
		value.documentCount === items.length &&
		value.nodeCount === nodes.length &&
		value.workerCount === activeWorkerIds.length &&
		sameStringArray(
			nodeIds,
			nodes.map((node) => node.nodeId),
		) &&
		sameStringArray(workerIds, activeWorkerIds) &&
		value.parallelSafe === (nonParallelSafeProcessorIds.length === 0) &&
		nonParallelSafeProcessorIds.every((processorId) =>
			processorOrder.includes(processorId),
		) &&
		nodes.every((node, nodeSlot) => node.nodeSlot === nodeSlot) &&
		items.every((item, inputIndex) => {
			const node = nodes[item.nodeSlot];
			if (node === undefined) return false;
			return (
				item.inputIndex === inputIndex &&
				item.nodeId === node.nodeId &&
				node.workerIds[item.workerSlot] === item.workerId &&
				workerIds[item.globalWorkerSlot] === item.workerId &&
				sameStringArray(item.processorOrder, processorOrder) &&
				item.contextFingerprint === value.contextFingerprint
			);
		})
	);
}

function isTextPipelineRecoverySourceKind(
	value: unknown,
): value is TextPipelineRecoverySourceKind {
	return (
		value === "batch-run-report" ||
		value === "worker-run-report" ||
		value === "worker-pool-run-report"
	);
}

function isTextPipelineRecoveryAction(
	value: unknown,
): value is TextPipelineRecoveryAction {
	return value === "retain" || value === "retry";
}

function isTextPipelineRecoveryReason(
	value: unknown,
): value is TextPipelineRecoveryReason {
	return value === "complete-run" || value === "partial-run";
}

function isTextPipelineRecoveryPlanItem(
	value: unknown,
): value is TextPipelineRecoveryPlanItem {
	return (
		isRecord(value) &&
		isNonNegativeInteger(value.inputIndex) &&
		isNonEmptyString(value.documentId) &&
		isNonEmptyString(value.finalRevision) &&
		isTextPipelineRecoveryAction(value.recoveryAction) &&
		isTextPipelineRecoveryReason(value.reason) &&
		isNonNegativeInteger(value.nextAttempt) &&
		isNonNegativeInteger(value.maxAttempts) &&
		value.maxAttempts >= 1 &&
		isStringArray(value.processorOrder) &&
		hasUniqueStrings(value.processorOrder) &&
		isNonNegativeInteger(value.traceEntryCount) &&
		(value.cachePolicy === "none" || value.cachePolicy === "read-through") &&
		isStringArray(value.failedProcessorIds) &&
		hasUniqueStrings(value.failedProcessorIds) &&
		isStringArray(value.skippedProcessorIds) &&
		hasUniqueStrings(value.skippedProcessorIds) &&
		(value.workerId === undefined || isNonEmptyString(value.workerId)) &&
		(value.workerSlot === undefined ||
			isNonNegativeInteger(value.workerSlot)) &&
		(value.recoveryAction === "retry"
			? value.reason === "partial-run" && value.nextAttempt >= 1
			: value.reason === "complete-run" && value.nextAttempt === 0)
	);
}

export function isTextPipelineRecoveryPlanV1(
	value: unknown,
): value is TextPipelineRecoveryPlanV1 {
	if (
		!isRecord(value) ||
		value.schemaVersion !== textPipelineRecoveryPlanSchemaVersion ||
		value.artifactType !== "textpipeline-recovery-plan-v1" ||
		!isNonEmptyString(value.planId) ||
		!isTextPipelineRecoverySourceKind(value.sourceKind) ||
		!isNonNegativeInteger(value.documentCount) ||
		!isNonNegativeInteger(value.completeCount) ||
		!isNonNegativeInteger(value.partialCount) ||
		!isNonNegativeInteger(value.retryCount) ||
		!isNonNegativeInteger(value.maxRetryAttempts) ||
		value.maxRetryAttempts < 1 ||
		!Array.isArray(value.retryInputIndexes) ||
		!value.retryInputIndexes.every((entry) => isNonNegativeInteger(entry)) ||
		!Array.isArray(value.items) ||
		!value.items.every((item) => isTextPipelineRecoveryPlanItem(item))
	) {
		return false;
	}
	const documentCount = value.documentCount as number;
	const completeCount = value.completeCount as number;
	const partialCount = value.partialCount as number;
	const retryCount = value.retryCount as number;
	const maxRetryAttempts = value.maxRetryAttempts as number;
	const retryItems = value.items.filter(
		(item) => item.recoveryAction === "retry",
	);
	return (
		completeCount + partialCount === documentCount &&
		retryCount === retryItems.length &&
		sameNumberArray(
			value.retryInputIndexes,
			retryItems.map((item) => item.inputIndex),
		) &&
		value.items.every(
			(item) =>
				item.inputIndex < documentCount &&
				item.maxAttempts === maxRetryAttempts,
		)
	);
}

function isTextPipelineRecoveryExecutionStatus(
	value: unknown,
): value is TextPipelineRecoveryExecutionStatus {
	return (
		value === "retained" ||
		value === "retry-complete" ||
		value === "retry-exhausted"
	);
}

function isTextPipelineRecoveryExecutionAttempt(
	value: unknown,
): value is TextPipelineRecoveryExecutionAttempt {
	return (
		isRecord(value) &&
		isNonNegativeInteger(value.attempt) &&
		value.attempt >= 1 &&
		(value.runStatus === "complete" || value.runStatus === "partial") &&
		isNonEmptyString(value.finalRevision) &&
		isNonNegativeInteger(value.traceEntryCount) &&
		isStringArray(value.failedProcessorIds) &&
		hasUniqueStrings(value.failedProcessorIds) &&
		isStringArray(value.skippedProcessorIds) &&
		hasUniqueStrings(value.skippedProcessorIds)
	);
}

function isTextPipelineRecoveryExecutionReportItem(
	value: unknown,
): value is TextPipelineRecoveryExecutionReportItem {
	if (
		!isRecord(value) ||
		!isNonNegativeInteger(value.inputIndex) ||
		!isNonEmptyString(value.documentId) ||
		!isTextPipelineRecoveryAction(value.recoveryAction) ||
		!isTextPipelineRecoveryExecutionStatus(value.executionStatus) ||
		!isNonNegativeInteger(value.startAttempt) ||
		!isNonNegativeInteger(value.maxAttempts) ||
		value.maxAttempts < 1 ||
		!isNonNegativeInteger(value.attemptedAttempts) ||
		!isNonNegativeInteger(value.finalAttempt) ||
		!isNonEmptyString(value.finalRevision) ||
		!isNonNegativeInteger(value.traceEntryCount) ||
		!isStringArray(value.failedProcessorIds) ||
		!hasUniqueStrings(value.failedProcessorIds) ||
		!isStringArray(value.skippedProcessorIds) ||
		!hasUniqueStrings(value.skippedProcessorIds) ||
		!Array.isArray(value.attempts) ||
		!value.attempts.every((attempt) =>
			isTextPipelineRecoveryExecutionAttempt(attempt),
		) ||
		(value.workerId !== undefined && !isNonEmptyString(value.workerId)) ||
		(value.workerSlot !== undefined && !isNonNegativeInteger(value.workerSlot))
	) {
		return false;
	}

	if (value.recoveryAction === "retain") {
		return (
			value.executionStatus === "retained" &&
			value.startAttempt === 0 &&
			value.attemptedAttempts === 0 &&
			value.finalAttempt === 0 &&
			value.attempts.length === 0
		);
	}

	const startAttempt = value.startAttempt as number;
	const maxAttempts = value.maxAttempts as number;
	const finalAttempt = value.finalAttempt as number;
	const attempts = value.attempts;
	const firstAttempt = attempts[0];
	const lastAttempt = attempts[attempts.length - 1];
	if (firstAttempt === undefined || lastAttempt === undefined) return false;
	return (
		value.executionStatus !== "retained" &&
		startAttempt >= 1 &&
		value.attemptedAttempts === attempts.length &&
		firstAttempt.attempt === startAttempt &&
		attempts.every(
			(attempt, index) => attempt.attempt === startAttempt + index,
		) &&
		finalAttempt === lastAttempt.attempt &&
		finalAttempt <= maxAttempts &&
		value.finalRevision === lastAttempt.finalRevision &&
		value.traceEntryCount === lastAttempt.traceEntryCount &&
		sameStringArray(value.failedProcessorIds, lastAttempt.failedProcessorIds) &&
		sameStringArray(
			value.skippedProcessorIds,
			lastAttempt.skippedProcessorIds,
		) &&
		(value.executionStatus === "retry-complete"
			? lastAttempt.runStatus === "complete"
			: lastAttempt.runStatus === "partial" && finalAttempt === maxAttempts)
	);
}

export function isTextPipelineRecoveryExecutionReportV1(
	value: unknown,
): value is TextPipelineRecoveryExecutionReportV1 {
	if (
		!isRecord(value) ||
		value.schemaVersion !== textPipelineRecoveryExecutionReportSchemaVersion ||
		value.artifactType !== "textpipeline-recovery-execution-report-v1" ||
		!isNonEmptyString(value.planId) ||
		!isTextPipelineRecoverySourceKind(value.sourceKind) ||
		!isNonNegativeInteger(value.documentCount) ||
		!isNonNegativeInteger(value.retainedCount) ||
		!isNonNegativeInteger(value.retryCount) ||
		!isNonNegativeInteger(value.attemptedRetryCount) ||
		!isNonNegativeInteger(value.completeRetryCount) ||
		!isNonNegativeInteger(value.exhaustedRetryCount) ||
		!isNonNegativeInteger(value.attemptCount) ||
		!Array.isArray(value.retryInputIndexes) ||
		!value.retryInputIndexes.every((entry) => isNonNegativeInteger(entry)) ||
		!Array.isArray(value.items) ||
		!value.items.every((item) =>
			isTextPipelineRecoveryExecutionReportItem(item),
		)
	) {
		return false;
	}
	const documentCount = value.documentCount as number;
	const items = value.items;
	const retainedItems = items.filter(
		(item) => item.executionStatus === "retained",
	);
	const retryItems = items.filter((item) => item.recoveryAction === "retry");
	const attemptedRetryItems = retryItems.filter(
		(item) => item.attemptedAttempts > 0,
	);
	const completeRetryItems = retryItems.filter(
		(item) => item.executionStatus === "retry-complete",
	);
	const exhaustedRetryItems = retryItems.filter(
		(item) => item.executionStatus === "retry-exhausted",
	);
	return (
		items.every((item) => item.inputIndex < documentCount) &&
		value.retainedCount === retainedItems.length &&
		value.retryCount === retryItems.length &&
		value.attemptedRetryCount === attemptedRetryItems.length &&
		value.completeRetryCount === completeRetryItems.length &&
		value.exhaustedRetryCount === exhaustedRetryItems.length &&
		value.attemptCount ===
			items.reduce((sum, item) => sum + item.attemptedAttempts, 0) &&
		sameNumberArray(
			value.retryInputIndexes,
			retryItems.map((item) => item.inputIndex),
		)
	);
}

function assertNotAborted(signal: AbortSignal | undefined): void {
	if (signal?.aborted === true) {
		throw new Error("textpipeline run aborted");
	}
}

export function createTextPipelineCacheKey(
	processor: TextPipelineExecutableProcessor,
	document: TextDocument,
	context: TextPipelineContext = {},
	options: TextPipelineCacheKeyOptions = {},
): string {
	if (!isTextPipelineProcessorDescriptor(processor.descriptor)) {
		throw new TypeError("processor descriptor is invalid");
	}
	if (!isTextDocument(document)) {
		throw new TypeError("cache-key document must satisfy TextDocument");
	}
	if (!isTextPipelineContext(context)) {
		throw new TypeError("pipeline context is invalid");
	}
	return stableJson({
		schema: "textpipeline-cache-key-v1",
		namespace: options.cacheNamespace ?? "default",
		processor: {
			id: processor.descriptor.id,
			version: processor.descriptor.version,
			dependsOn: uniqueSortedStrings(processor.descriptor.dependsOn ?? []),
			emits: processor.descriptor.emits ?? {},
			parallelSafe: processor.descriptor.parallelSafe,
			purity: processor.descriptor.purity,
			requires: processor.descriptor.requires ?? {},
		},
		document: {
			documentId: document.id,
			revision: textDocumentRevision(document),
			content: canonicalDocumentForCache(document),
		},
		context: canonicalContext(context),
	});
}

function cacheKeyOptions(
	options: TextPipelineRunOptions,
): TextPipelineCacheKeyOptions {
	return options.cacheNamespace === undefined
		? {}
		: { cacheNamespace: options.cacheNamespace };
}

function processorErrorDiagnostic(
	processorId: string,
	error: unknown,
): TextPipelineDiagnostic {
	return {
		code: "textpipeline.processor-error",
		severity: "error",
		message:
			error instanceof Error
				? `${processorId}: ${error.message}`
				: `${processorId}: processor failed`,
	};
}

function blockedDependencyDiagnostics(
	processor: TextPipelineExecutableProcessor,
	completedProcessorIds: ReadonlySet<string>,
): readonly TextPipelineDiagnostic[] {
	const blocked = (processor.descriptor.dependsOn ?? []).filter(
		(dependencyId) => !completedProcessorIds.has(dependencyId),
	);
	if (blocked.length === 0) return [];
	return [
		diagnostic(
			"textpipeline.blocked-dependency",
			"warning",
			`blocked by incomplete dependencies: ${blocked.join(", ")}`,
		),
	];
}

function traceRunStatus(
	entries: readonly TextPipelineTraceEntry[],
): TextPipelineRunStatus {
	return entries.every(
		(entry) => entry.status === "applied" || entry.status === "cached",
	)
		? "complete"
		: "partial";
}

function buildTrace(
	document: TextDocument,
	entries: readonly TextPipelineTraceEntry[],
	plan: TextPipelineExecutionPlan,
	context: TextPipelineContext,
	mode: TextPipelineExecutionMode,
	cachePolicy: TextPipelineCachePolicy,
): TextPipelineTraceV1 {
	return {
		schemaVersion: textPipelineTraceSchemaVersion,
		documentId: document.id,
		finalRevision: textDocumentRevision(document),
		executionMode: mode,
		runStatus: traceRunStatus(entries),
		processorOrder: plan.processorOrder,
		contextFingerprint: createTextPipelineContextFingerprint(context),
		cachePolicy,
		entries,
	};
}

function runProcessorSync(
	processor: TextPipelineProcessor,
	currentDocument: TextDocument,
	context: TextPipelineContext,
	inputRevision: string,
): {
	readonly document: TextDocument;
	readonly entry: TextPipelineTraceEntry;
} {
	const previousViews = currentDocument.views;
	const previousLayers = currentDocument.layers;
	const result = processor.run(currentDocument, context);
	assertValidProcessorResult(processor, currentDocument, result);

	const diagnostics = assertValidTraceDiagnostics(
		processor.descriptor.id,
		result.diagnostics,
	);
	const emittedViews = collectEmittedIds(previousViews, result.document.views);
	const emittedLayers = collectEmittedIds(
		previousLayers,
		result.document.layers,
	);

	assertEmitsSubset(processor, emittedViews, emittedLayers);

	return {
		document: result.document,
		entry: {
			processorId: processor.descriptor.id,
			version: processor.descriptor.version,
			status: "applied",
			emittedViews,
			emittedLayers,
			...(diagnostics.length > 0 ? { diagnostics } : {}),
			inputRevision,
			outputRevision: textDocumentRevision(result.document),
		},
	};
}

export function runTextPipeline(
	document: TextDocument,
	processors: readonly TextPipelineProcessor[],
	context: TextPipelineContext = {},
): TextPipelineRunResult {
	if (!isTextDocument(document)) {
		throw new TypeError("pipeline input must satisfy TextDocument");
	}
	if (!isTextPipelineContext(context)) {
		throw new TypeError("pipeline context is invalid");
	}

	const { byId, plan } = buildProcessorMap(processors);
	let currentDocument = document;
	const traceEntries: TextPipelineTraceEntry[] = [];
	const completedProcessorIds = new Set<string>();

	for (const processorId of plan.processorOrder) {
		const processor = byId.get(processorId);
		if (processor === undefined)
			throw new Error(
				`processor dependency graph lost processor ${processorId}`,
			);

		const inputRevision = textDocumentRevision(currentDocument);
		const blockedDiagnostics = blockedDependencyDiagnostics(
			processor,
			completedProcessorIds,
		);
		if (blockedDiagnostics.length > 0) {
			traceEntries.push({
				processorId: processor.descriptor.id,
				version: processor.descriptor.version,
				status: "skipped",
				emittedViews: [],
				emittedLayers: [],
				diagnostics: blockedDiagnostics,
				inputRevision,
				outputRevision: textDocumentRevision(currentDocument),
			});
			continue;
		}

		const requirementDiagnostics = getRequirementDiagnostics(
			processor.descriptor,
			currentDocument,
			context,
		);

		if (requirementDiagnostics.length > 0) {
			traceEntries.push({
				processorId: processor.descriptor.id,
				version: processor.descriptor.version,
				status: "skipped",
				emittedViews: [],
				emittedLayers: [],
				diagnostics: requirementDiagnostics,
				inputRevision,
				outputRevision: textDocumentRevision(currentDocument),
			});
			continue;
		}

		const result = runProcessorSync(
			processor,
			currentDocument,
			context,
			inputRevision,
		);
		currentDocument = result.document;
		completedProcessorIds.add(processor.descriptor.id);
		traceEntries.push(result.entry);
	}

	return {
		document: currentDocument,
		trace: buildTrace(
			currentDocument,
			traceEntries,
			plan,
			context,
			"sync",
			"none",
		),
	};
}

async function runProcessorAsync(
	processor: TextPipelineAsyncProcessor,
	currentDocument: TextDocument,
	context: TextPipelineContext,
	inputRevision: string,
	options: TextPipelineRunOptions,
): Promise<{
	readonly document: TextDocument;
	readonly entry: TextPipelineTraceEntry;
}> {
	const previousViews = currentDocument.views;
	const previousLayers = currentDocument.layers;
	const cacheKey =
		options.cache === undefined
			? undefined
			: createTextPipelineCacheKey(
					processor,
					currentDocument,
					context,
					cacheKeyOptions(options),
				);

	assertNotAborted(options.signal);
	const cachedDocument =
		cacheKey === undefined ? undefined : await options.cache?.get(cacheKey);
	assertNotAborted(options.signal);

	if (cachedDocument !== undefined) {
		if (cacheKey === undefined) {
			throw new Error(
				`processor ${processor.descriptor.id} cache returned without a cache key`,
			);
		}
		if (!isTextDocument(cachedDocument)) {
			throw new TypeError(
				`processor ${processor.descriptor.id} cache returned an invalid document`,
			);
		}
		if (cachedDocument.id !== currentDocument.id) {
			throw new Error(
				`processor ${processor.descriptor.id} cache changed document id`,
			);
		}

		const emittedViews = collectEmittedIds(previousViews, cachedDocument.views);
		const emittedLayers = collectEmittedIds(
			previousLayers,
			cachedDocument.layers,
		);
		assertEmitsSubset(processor, emittedViews, emittedLayers);
		return {
			document: cachedDocument,
			entry: {
				processorId: processor.descriptor.id,
				version: processor.descriptor.version,
				status: "cached",
				emittedViews,
				emittedLayers,
				inputRevision,
				outputRevision: textDocumentRevision(cachedDocument),
				cacheKey,
			},
		};
	}

	const result = await processor.run(currentDocument, context);
	assertNotAborted(options.signal);
	assertValidProcessorResult(processor, currentDocument, result);

	const diagnostics = assertValidTraceDiagnostics(
		processor.descriptor.id,
		result.diagnostics,
	);
	const emittedViews = collectEmittedIds(previousViews, result.document.views);
	const emittedLayers = collectEmittedIds(
		previousLayers,
		result.document.layers,
	);

	assertEmitsSubset(processor, emittedViews, emittedLayers);
	if (cacheKey !== undefined)
		await options.cache?.set?.(cacheKey, result.document);
	assertNotAborted(options.signal);

	return {
		document: result.document,
		entry: {
			processorId: processor.descriptor.id,
			version: processor.descriptor.version,
			status: "applied",
			emittedViews,
			emittedLayers,
			...(diagnostics.length > 0 ? { diagnostics } : {}),
			inputRevision,
			outputRevision: textDocumentRevision(result.document),
			...(cacheKey !== undefined ? { cacheKey } : {}),
		},
	};
}

export async function runTextPipelineAsync(
	document: TextDocument,
	processors: readonly TextPipelineAsyncProcessor[],
	context: TextPipelineContext = {},
	options: TextPipelineRunOptions = {},
): Promise<TextPipelineRunResult> {
	if (!isTextDocument(document)) {
		throw new TypeError("pipeline input must satisfy TextDocument");
	}
	if (!isTextPipelineContext(context)) {
		throw new TypeError("pipeline context is invalid");
	}

	const { byId, plan } = buildProcessorMap(processors);
	let currentDocument = document;
	const traceEntries: TextPipelineTraceEntry[] = [];
	const completedProcessorIds = new Set<string>();

	for (const processorId of plan.processorOrder) {
		assertNotAborted(options.signal);
		const processor = byId.get(processorId);
		if (processor === undefined)
			throw new Error(
				`processor dependency graph lost processor ${processorId}`,
			);

		const inputRevision = textDocumentRevision(currentDocument);
		const blockedDiagnostics = blockedDependencyDiagnostics(
			processor,
			completedProcessorIds,
		);
		if (blockedDiagnostics.length > 0) {
			traceEntries.push({
				processorId: processor.descriptor.id,
				version: processor.descriptor.version,
				status: "skipped",
				emittedViews: [],
				emittedLayers: [],
				diagnostics: blockedDiagnostics,
				inputRevision,
				outputRevision: textDocumentRevision(currentDocument),
			});
			continue;
		}

		const requirementDiagnostics = getRequirementDiagnostics(
			processor.descriptor,
			currentDocument,
			context,
		);

		if (requirementDiagnostics.length > 0) {
			traceEntries.push({
				processorId: processor.descriptor.id,
				version: processor.descriptor.version,
				status: "skipped",
				emittedViews: [],
				emittedLayers: [],
				diagnostics: requirementDiagnostics,
				inputRevision,
				outputRevision: textDocumentRevision(currentDocument),
			});
			continue;
		}

		try {
			const result = await runProcessorAsync(
				processor,
				currentDocument,
				context,
				inputRevision,
				options,
			);
			currentDocument = result.document;
			completedProcessorIds.add(processor.descriptor.id);
			traceEntries.push(result.entry);
		} catch (error) {
			if (options.errorPolicy !== "continue") throw error;
			traceEntries.push({
				processorId: processor.descriptor.id,
				version: processor.descriptor.version,
				status: "failed",
				emittedViews: [],
				emittedLayers: [],
				diagnostics: [processorErrorDiagnostic(processor.descriptor.id, error)],
				inputRevision,
				outputRevision: textDocumentRevision(currentDocument),
				...(options.cache === undefined
					? {}
					: {
							cacheKey: createTextPipelineCacheKey(
								processor,
								currentDocument,
								context,
								cacheKeyOptions(options),
							),
						}),
			});
		}
	}

	return {
		document: currentDocument,
		trace: buildTrace(
			currentDocument,
			traceEntries,
			plan,
			context,
			"async",
			options.cache === undefined ? "none" : "read-through",
		),
	};
}

export function runTextPipelineBatch(
	documents: readonly TextDocument[],
	processors: readonly TextPipelineProcessor[],
	context: TextPipelineContext = {},
): readonly TextPipelineRunResult[] {
	return documents.map((document) =>
		runTextPipeline(document, processors, context),
	);
}

export function createTextPipelineBatchRunReport(
	runs: readonly TextPipelineRunResult[],
): TextPipelineBatchRunReport {
	const items = runs.map((run, inputIndex) => {
		if (!isTextPipelineTraceV1(run.trace)) {
			throw new TypeError(
				`batch run ${inputIndex} trace must satisfy TextPipelineTraceV1`,
			);
		}
		if (run.document.id !== run.trace.documentId) {
			throw new Error(
				`batch run ${inputIndex} documentId does not match its trace`,
			);
		}
		return {
			inputIndex,
			documentId: run.trace.documentId,
			finalRevision: run.trace.finalRevision,
			runStatus: run.trace.runStatus,
			executionMode: run.trace.executionMode,
			cachePolicy: run.trace.cachePolicy,
			processorOrder: run.trace.processorOrder,
			traceEntryCount: run.trace.entries.length,
		} satisfies TextPipelineBatchRunItem;
	});

	return {
		schemaVersion: 1,
		documentCount: items.length,
		completeCount: items.filter((item) => item.runStatus === "complete").length,
		partialCount: items.filter((item) => item.runStatus === "partial").length,
		executionModes: uniqueSortedStrings(
			items.map((item) => item.executionMode),
		) as readonly TextPipelineExecutionMode[],
		cachePolicies: uniqueSortedStrings(
			items.map((item) => item.cachePolicy),
		) as readonly TextPipelineCachePolicy[],
		contextFingerprints: uniqueSortedStrings(
			runs.map((run) => run.trace.contextFingerprint),
		),
		items,
	};
}

export function createTextPipelineWorkerRunReport(
	workerId: string,
	runs: readonly TextPipelineRunResult[],
): TextPipelineWorkerRunReport {
	if (!isNonEmptyString(workerId)) {
		throw new TypeError("textpipeline worker id must be a non-empty string");
	}
	const batchReport = createTextPipelineBatchRunReport(runs);
	const items = batchReport.items.map((item) => ({
		...item,
		workerId,
	})) satisfies readonly TextPipelineWorkerRunItem[];
	const report = {
		schemaVersion: textPipelineWorkerRunReportSchemaVersion,
		workerId,
		documentCount: batchReport.documentCount,
		completeCount: batchReport.completeCount,
		partialCount: batchReport.partialCount,
		executionModes: batchReport.executionModes,
		cachePolicies: batchReport.cachePolicies,
		contextFingerprints: batchReport.contextFingerprints,
		items,
	} satisfies TextPipelineWorkerRunReport;
	if (!isTextPipelineWorkerRunReportV1(report)) {
		throw new TypeError("textpipeline worker run report is invalid");
	}
	return report;
}

function isTextPipelineWorkerPoolAssignment(
	value: unknown,
): value is TextPipelineWorkerPoolAssignment {
	return (
		isRecord(value) &&
		isNonEmptyString(value.workerId) &&
		isNonNegativeInteger(value.workerSlot)
	);
}

export function createTextPipelineWorkerPoolRunReport(
	poolId: string,
	strategy: TextPipelineWorkerPoolStrategy,
	workerIds: readonly string[],
	assignments: readonly TextPipelineWorkerPoolAssignment[],
	runs: readonly TextPipelineRunResult[],
): TextPipelineWorkerPoolRunReport {
	if (!isNonEmptyString(poolId)) {
		throw new TypeError(
			"textpipeline worker pool id must be a non-empty string",
		);
	}
	if (!isTextPipelineWorkerPoolStrategy(strategy)) {
		throw new TypeError("textpipeline worker pool strategy is invalid");
	}
	if (
		!isStringArray(workerIds) ||
		workerIds.length === 0 ||
		!hasUniqueStrings(workerIds)
	) {
		throw new TypeError(
			"textpipeline worker pool worker ids must be unique non-empty strings",
		);
	}
	if (
		!Array.isArray(assignments) ||
		assignments.length !== runs.length ||
		!assignments.every((assignment) =>
			isTextPipelineWorkerPoolAssignment(assignment),
		) ||
		!assignments.every(
			(assignment) => assignment.workerSlot < workerIds.length,
		) ||
		!assignments.every(
			(assignment) => workerIds[assignment.workerSlot] === assignment.workerId,
		)
	) {
		throw new TypeError("textpipeline worker pool assignments are invalid");
	}
	const batchReport = createTextPipelineBatchRunReport(runs);
	const items = batchReport.items.map((item, index) => {
		const assignment = assignments[index];
		if (assignment === undefined) {
			throw new Error(
				`textpipeline worker pool missing assignment for input ${index}`,
			);
		}
		return {
			...item,
			workerId: assignment.workerId,
			workerSlot: assignment.workerSlot,
		};
	}) satisfies readonly TextPipelineWorkerPoolRunItem[];
	const report = {
		schemaVersion: textPipelineWorkerPoolRunReportSchemaVersion,
		poolId,
		strategy,
		workerIds,
		documentCount: batchReport.documentCount,
		completeCount: batchReport.completeCount,
		partialCount: batchReport.partialCount,
		executionModes: batchReport.executionModes,
		cachePolicies: batchReport.cachePolicies,
		contextFingerprints: batchReport.contextFingerprints,
		items,
	} satisfies TextPipelineWorkerPoolRunReport;
	if (!isTextPipelineWorkerPoolRunReportV1(report)) {
		throw new TypeError("textpipeline worker pool run report is invalid");
	}
	return report;
}

interface NormalizedTextPipelineDistributedNode {
	readonly nodeId: string;
	readonly workerIds: readonly string[];
	readonly activeWorkerIds: readonly string[];
	readonly maxConcurrentDocuments: number;
	readonly labels?: readonly string[];
}

function normalizeTextPipelineDistributedNodes(
	nodes: readonly TextPipelineDistributedNodeSpec[],
): readonly NormalizedTextPipelineDistributedNode[] {
	if (!Array.isArray(nodes) || nodes.length === 0) {
		throw new TypeError(
			"textpipeline distributed schedule nodes must be a non-empty array",
		);
	}
	const seenNodeIds = new Set<string>();
	const seenWorkerIds = new Set<string>();
	const normalized = nodes.map(
		(node): NormalizedTextPipelineDistributedNode => {
			const nodeValue = node as unknown;
			if (!isRecord(nodeValue) || !isNonEmptyString(nodeValue.nodeId)) {
				throw new TypeError(
					"textpipeline distributed schedule node id must be a non-empty string",
				);
			}
			const nodeId = nodeValue.nodeId;
			const rawWorkerIds = nodeValue.workerIds;
			const rawMaxConcurrentDocuments = nodeValue.maxConcurrentDocuments;
			const rawLabels = nodeValue.labels;
			if (seenNodeIds.has(nodeId)) {
				throw new Error(
					`duplicate textpipeline distributed schedule node id: ${nodeId}`,
				);
			}
			seenNodeIds.add(nodeId);
			if (!isStringArray(rawWorkerIds) || rawWorkerIds.length === 0) {
				throw new TypeError(
					`textpipeline distributed schedule node ${nodeId} worker ids must be non-empty strings`,
				);
			}
			const workerIds = uniqueSortedStrings(rawWorkerIds);
			if (workerIds.length !== rawWorkerIds.length) {
				throw new Error(
					`duplicate textpipeline distributed schedule worker id in node: ${nodeId}`,
				);
			}
			for (const workerId of workerIds) {
				if (seenWorkerIds.has(workerId)) {
					throw new Error(
						`duplicate textpipeline distributed schedule worker id: ${workerId}`,
					);
				}
				seenWorkerIds.add(workerId);
			}
			if (
				rawMaxConcurrentDocuments !== undefined &&
				(typeof rawMaxConcurrentDocuments !== "number" ||
					!Number.isInteger(rawMaxConcurrentDocuments))
			) {
				throw new RangeError(
					`textpipeline distributed schedule node ${nodeId} maxConcurrentDocuments must be between 1 and its worker count`,
				);
			}
			const maxConcurrentDocuments =
				rawMaxConcurrentDocuments === undefined
					? workerIds.length
					: rawMaxConcurrentDocuments;
			if (
				maxConcurrentDocuments < 1 ||
				maxConcurrentDocuments > workerIds.length
			) {
				throw new RangeError(
					`textpipeline distributed schedule node ${nodeId} maxConcurrentDocuments must be between 1 and its worker count`,
				);
			}
			let labels: readonly string[] | undefined;
			if (rawLabels !== undefined) {
				if (!isStringArray(rawLabels)) {
					throw new TypeError(
						`textpipeline distributed schedule node ${nodeId} labels must be unique non-empty strings`,
					);
				}
				labels = uniqueSortedStrings(rawLabels);
				if (labels.length !== rawLabels.length) {
					throw new TypeError(
						`textpipeline distributed schedule node ${nodeId} labels must be unique non-empty strings`,
					);
				}
			}
			return {
				nodeId,
				workerIds,
				activeWorkerIds: workerIds.slice(0, maxConcurrentDocuments),
				maxConcurrentDocuments,
				...(labels === undefined ? {} : { labels }),
			};
		},
	);
	return normalized.sort((left, right) =>
		left.nodeId.localeCompare(right.nodeId),
	);
}

export function createTextPipelineDistributedSchedulePlan(
	documents: readonly TextDocument[],
	processors: readonly TextPipelineExecutableProcessor[],
	nodes: readonly TextPipelineDistributedNodeSpec[],
	context: TextPipelineContext = {},
	options: TextPipelineDistributedScheduleOptions = {},
): TextPipelineDistributedSchedulePlanV1 {
	if (
		!Array.isArray(documents) ||
		!documents.every((document) => isTextDocument(document))
	) {
		throw new TypeError(
			"textpipeline distributed schedule documents must satisfy TextDocument",
		);
	}
	if (!isTextPipelineContext(context)) {
		throw new TypeError("pipeline context is invalid");
	}
	if (!isRecord(options)) {
		throw new TypeError(
			"textpipeline distributed schedule options must be a record",
		);
	}
	const strategy = options.strategy ?? "capacity-round-robin";
	if (!isTextPipelineDistributedScheduleStrategy(strategy)) {
		throw new TypeError(
			"textpipeline distributed schedule strategy is invalid",
		);
	}
	const cacheNamespace = options.cacheNamespace;
	if (cacheNamespace !== undefined && !isNonEmptyString(cacheNamespace)) {
		throw new TypeError(
			"textpipeline distributed schedule cache namespace must be a non-empty string",
		);
	}
	const plan = createTextPipelineExecutionPlan(processors);
	const nonParallelSafeProcessorIds = processors
		.filter((processor) => !processor.descriptor.parallelSafe)
		.map((processor) => processor.descriptor.id)
		.sort((left, right) => left.localeCompare(right));
	if (
		(options.requireParallelSafeProcessors ?? true) &&
		nonParallelSafeProcessorIds.length > 0
	) {
		throw new Error(
			`textpipeline distributed scheduling requires parallel-safe processors: ${nonParallelSafeProcessorIds.join(", ")}`,
		);
	}
	const normalizedNodes = normalizeTextPipelineDistributedNodes(nodes);
	const scheduleNodes = normalizedNodes.map(
		(node, nodeSlot): TextPipelineDistributedScheduleNodeV1 => ({
			nodeId: node.nodeId,
			nodeSlot,
			workerIds: node.workerIds,
			activeWorkerIds: node.activeWorkerIds,
			maxConcurrentDocuments: node.maxConcurrentDocuments,
			...(node.labels === undefined ? {} : { labels: node.labels }),
		}),
	);
	const activeSlots = scheduleNodes
		.flatMap((node) =>
			node.activeWorkerIds.map((workerId) => {
				const workerSlot = node.workerIds.indexOf(workerId);
				if (workerSlot < 0)
					throw new Error(
						`textpipeline distributed schedule lost worker ${workerId}`,
					);
				return {
					nodeId: node.nodeId,
					nodeSlot: node.nodeSlot,
					workerId,
					workerSlot,
				};
			}),
		)
		.map((slot, globalWorkerSlot) => ({ ...slot, globalWorkerSlot }));
	if (activeSlots.length === 0) {
		throw new TypeError(
			"textpipeline distributed schedule must include at least one active worker",
		);
	}
	const contextFingerprint = createTextPipelineContextFingerprint(context);
	const scheduleId =
		options.scheduleId ??
		`textpipeline.distributed-schedule:${contextFingerprint}`;
	if (!isNonEmptyString(scheduleId)) {
		throw new TypeError(
			"textpipeline distributed schedule id must be a non-empty string",
		);
	}
	const items = documents.map(
		(document, inputIndex): TextPipelineDistributedScheduleItem => {
			const slot = activeSlots[inputIndex % activeSlots.length];
			if (slot === undefined)
				throw new Error(
					`textpipeline distributed schedule lost active slot for input ${inputIndex}`,
				);
			return {
				inputIndex,
				documentId: document.id,
				nodeId: slot.nodeId,
				nodeSlot: slot.nodeSlot,
				workerId: slot.workerId,
				workerSlot: slot.workerSlot,
				globalWorkerSlot: slot.globalWorkerSlot,
				processorOrder: plan.processorOrder,
				contextFingerprint,
			};
		},
	);
	const report = {
		schemaVersion: textPipelineDistributedScheduleSchemaVersion,
		artifactType: "textpipeline-distributed-schedule-plan-v1",
		scheduleId,
		strategy,
		documentCount: documents.length,
		nodeCount: scheduleNodes.length,
		workerCount: activeSlots.length,
		processorOrder: plan.processorOrder,
		contextFingerprint,
		parallelSafe: nonParallelSafeProcessorIds.length === 0,
		nonParallelSafeProcessorIds,
		...(cacheNamespace === undefined ? {} : { cacheNamespace }),
		nodeIds: scheduleNodes.map((node) => node.nodeId),
		workerIds: activeSlots.map((slot) => slot.workerId),
		nodes: scheduleNodes,
		items,
	} satisfies TextPipelineDistributedSchedulePlanV1;
	if (!isTextPipelineDistributedSchedulePlanV1(report)) {
		throw new TypeError("textpipeline distributed schedule plan is invalid");
	}
	return report;
}

function textPipelineRecoverySourceKind(
	report: TextPipelineRecoverySourceReport,
): TextPipelineRecoverySourceKind {
	if (isTextPipelineWorkerPoolRunReportV1(report))
		return "worker-pool-run-report";
	if (isTextPipelineWorkerRunReportV1(report)) return "worker-run-report";
	if (isTextPipelineBatchRunReportV1(report)) return "batch-run-report";
	throw new TypeError("textpipeline recovery source report is invalid");
}

function uniqueStringsInOrder(values: readonly string[]): readonly string[] {
	const seen = new Set<string>();
	const result: string[] = [];
	for (const value of values) {
		if (seen.has(value)) continue;
		seen.add(value);
		result.push(value);
	}
	return result;
}

function traceProcessorIdsByStatus(
	run: TextPipelineRunResult | undefined,
	status: TextPipelineTraceStatus,
): readonly string[] {
	return uniqueStringsInOrder(
		(run?.trace.entries ?? [])
			.filter((entry) => entry.status === status)
			.map((entry) => entry.processorId),
	);
}

function assertRecoveryRunsMatchReport(
	report: TextPipelineRecoverySourceReport,
	runs: readonly TextPipelineRunResult[] | undefined,
): void {
	if (runs === undefined) return;
	if (!Array.isArray(runs) || runs.length !== report.documentCount) {
		throw new TypeError(
			"textpipeline recovery runs must match source report document count",
		);
	}
	for (const item of report.items) {
		const run = runs[item.inputIndex];
		if (run === undefined || !isTextPipelineTraceV1(run.trace)) {
			throw new TypeError(
				`textpipeline recovery run ${item.inputIndex} trace is invalid`,
			);
		}
		if (run.trace.documentId !== item.documentId) {
			throw new Error(
				`textpipeline recovery run ${item.inputIndex} documentId does not match source report`,
			);
		}
		if (run.trace.finalRevision !== item.finalRevision) {
			throw new Error(
				`textpipeline recovery run ${item.inputIndex} final revision does not match source report`,
			);
		}
		if (run.trace.entries.length !== item.traceEntryCount) {
			throw new Error(
				`textpipeline recovery run ${item.inputIndex} trace size does not match source report`,
			);
		}
	}
}

function recoveryWorkerFields(item: unknown): {
	readonly workerId?: string;
	readonly workerSlot?: number;
} {
	const record = item as unknown as Record<string, unknown>;
	return {
		...(isNonEmptyString(record.workerId) ? { workerId: record.workerId } : {}),
		...(isNonNegativeInteger(record.workerSlot)
			? { workerSlot: record.workerSlot }
			: {}),
	};
}

export function createTextPipelineRecoveryPlan(
	report: TextPipelineRecoverySourceReport,
	runsOrOptions?:
		| readonly TextPipelineRunResult[]
		| TextPipelineRecoveryPlanOptions,
	options: TextPipelineRecoveryPlanOptions = {},
): TextPipelineRecoveryPlanV1 {
	const sourceKind = textPipelineRecoverySourceKind(report);
	const hasRuns = Array.isArray(runsOrOptions);
	const runs = hasRuns
		? (runsOrOptions as readonly TextPipelineRunResult[])
		: undefined;
	const planOptions: TextPipelineRecoveryPlanOptions = hasRuns
		? options
		: ((runsOrOptions as TextPipelineRecoveryPlanOptions | undefined) ??
			options);
	assertRecoveryRunsMatchReport(report, runs);
	const maxRetryAttempts = planOptions.maxRetryAttempts ?? 1;
	if (!Number.isInteger(maxRetryAttempts) || maxRetryAttempts < 1) {
		throw new RangeError(
			"textpipeline recovery maxRetryAttempts must be a positive integer",
		);
	}
	const includeCompleteItems = planOptions.includeCompleteItems ?? true;
	const planId =
		planOptions.planId ??
		`textpipeline.recovery-plan:${sourceKind}:partial-${report.partialCount}`;
	if (!isNonEmptyString(planId)) {
		throw new TypeError(
			"textpipeline recovery plan id must be a non-empty string",
		);
	}

	const items = report.items.flatMap(
		(item): readonly TextPipelineRecoveryPlanItem[] => {
			const retry = item.runStatus === "partial";
			if (!retry && !includeCompleteItems) return [];
			const run = runs?.[item.inputIndex];
			return [
				{
					inputIndex: item.inputIndex,
					documentId: item.documentId,
					finalRevision: item.finalRevision,
					recoveryAction: retry ? "retry" : "retain",
					reason: retry ? "partial-run" : "complete-run",
					nextAttempt: retry ? 1 : 0,
					maxAttempts: maxRetryAttempts,
					processorOrder: item.processorOrder,
					traceEntryCount: item.traceEntryCount,
					cachePolicy: item.cachePolicy,
					failedProcessorIds: traceProcessorIdsByStatus(run, "failed"),
					skippedProcessorIds: traceProcessorIdsByStatus(run, "skipped"),
					...recoveryWorkerFields(item),
				},
			];
		},
	);
	const retryItems = items.filter((item) => item.recoveryAction === "retry");
	const plan = {
		schemaVersion: textPipelineRecoveryPlanSchemaVersion,
		artifactType: "textpipeline-recovery-plan-v1",
		planId,
		sourceKind,
		documentCount: report.documentCount,
		completeCount: report.completeCount,
		partialCount: report.partialCount,
		retryCount: retryItems.length,
		maxRetryAttempts,
		retryInputIndexes: retryItems.map((item) => item.inputIndex),
		items,
	} satisfies TextPipelineRecoveryPlanV1;
	if (!isTextPipelineRecoveryPlanV1(plan)) {
		throw new TypeError("textpipeline recovery plan is invalid");
	}
	return plan;
}

function textPipelineRecoveryExecutionRunOptions(
	options: TextPipelineRecoveryExecutionOptions,
): TextPipelineRunOptions {
	return {
		...(options.signal === undefined ? {} : { signal: options.signal }),
		...(options.errorPolicy === undefined
			? {}
			: { errorPolicy: options.errorPolicy }),
		...(options.cache === undefined ? {} : { cache: options.cache }),
		...(options.cacheNamespace === undefined
			? {}
			: { cacheNamespace: options.cacheNamespace }),
	};
}

function assertRecoveryExecutionInputs(
	plan: TextPipelineRecoveryPlanV1,
	documents: readonly TextDocument[],
	processors: readonly TextPipelineAsyncProcessor[],
	context: TextPipelineContext,
): TextPipelineExecutionPlan {
	if (!isTextPipelineRecoveryPlanV1(plan)) {
		throw new TypeError(
			"textpipeline recovery execution plan must satisfy TextPipelineRecoveryPlanV1",
		);
	}
	if (!Array.isArray(documents) || documents.length !== plan.documentCount) {
		throw new TypeError(
			"textpipeline recovery execution documents must match plan document count",
		);
	}
	if (!documents.every((document) => isTextDocument(document))) {
		throw new TypeError(
			"textpipeline recovery execution documents must satisfy TextDocument",
		);
	}
	if (!isTextPipelineContext(context)) {
		throw new TypeError("pipeline context is invalid");
	}
	const executionPlan = createTextPipelineExecutionPlan(processors);
	for (const item of plan.items) {
		const document = documents[item.inputIndex];
		if (document === undefined) {
			throw new Error(
				`textpipeline recovery execution missing document at input ${item.inputIndex}`,
			);
		}
		if (document.id !== item.documentId) {
			throw new Error(
				`textpipeline recovery execution document ${item.inputIndex} does not match plan documentId`,
			);
		}
		if (item.recoveryAction === "retry") {
			if (item.nextAttempt > item.maxAttempts) {
				throw new RangeError(
					`textpipeline recovery execution input ${item.inputIndex} has no remaining attempts`,
				);
			}
			if (!sameStringArray(executionPlan.processorOrder, item.processorOrder)) {
				throw new Error(
					`textpipeline recovery execution processors do not match plan item ${item.inputIndex}`,
				);
			}
		}
	}
	return executionPlan;
}

function assertRecoveryExecutor(executor: TextPipelineRecoveryExecutor): void {
	if (!isRecord(executor) || typeof executor.run !== "function") {
		throw new TypeError(
			"textpipeline recovery executor must expose a run function",
		);
	}
}

function assertRecoveryExecutionRun(
	item: TextPipelineRecoveryPlanItem,
	inputDocument: TextDocument,
	result: TextPipelineRunResult,
): void {
	if (
		!isRecord(result) ||
		!isTextDocument(result.document) ||
		!isTextPipelineTraceV1(result.trace)
	) {
		throw new TypeError(
			`textpipeline recovery execution input ${item.inputIndex} returned an invalid run result`,
		);
	}
	if (
		result.document.id !== inputDocument.id ||
		result.trace.documentId !== inputDocument.id
	) {
		throw new Error(
			`textpipeline recovery execution input ${item.inputIndex} returned an unexpected document`,
		);
	}
	if (!sameStringArray(result.trace.processorOrder, item.processorOrder)) {
		throw new Error(
			`textpipeline recovery execution input ${item.inputIndex} returned an unexpected processor order`,
		);
	}
}

function recoveryExecutionAttempt(
	attempt: number,
	run: TextPipelineRunResult,
): TextPipelineRecoveryExecutionAttempt {
	return {
		attempt,
		runStatus: run.trace.runStatus,
		finalRevision: run.trace.finalRevision,
		traceEntryCount: run.trace.entries.length,
		failedProcessorIds: traceProcessorIdsByStatus(run, "failed"),
		skippedProcessorIds: traceProcessorIdsByStatus(run, "skipped"),
	};
}

function retainedRecoveryExecutionReportItem(
	item: TextPipelineRecoveryPlanItem,
): TextPipelineRecoveryExecutionReportItem {
	return {
		inputIndex: item.inputIndex,
		documentId: item.documentId,
		recoveryAction: item.recoveryAction,
		executionStatus: "retained",
		startAttempt: 0,
		maxAttempts: item.maxAttempts,
		attemptedAttempts: 0,
		finalAttempt: 0,
		finalRevision: item.finalRevision,
		traceEntryCount: item.traceEntryCount,
		failedProcessorIds: item.failedProcessorIds,
		skippedProcessorIds: item.skippedProcessorIds,
		attempts: [],
		...recoveryWorkerFields(item),
	};
}

async function executeTextPipelineRecoveryPlanItem(
	item: TextPipelineRecoveryPlanItem,
	document: TextDocument,
	processors: readonly TextPipelineAsyncProcessor[],
	context: TextPipelineContext,
	runOptions: TextPipelineRunOptions,
	executor: TextPipelineRecoveryExecutor,
): Promise<{
	readonly run: TextPipelineRunResult;
	readonly reportItem: TextPipelineRecoveryExecutionReportItem;
}> {
	const attempts: TextPipelineRecoveryExecutionAttempt[] = [];
	let lastRun: TextPipelineRunResult | undefined;
	for (
		let attempt = item.nextAttempt;
		attempt <= item.maxAttempts;
		attempt += 1
	) {
		assertNotAborted(runOptions.signal);
		const run = await executor.run({
			inputIndex: item.inputIndex,
			document,
			planItem: item,
			attempt,
			processors,
			context,
			options: runOptions,
		});
		assertRecoveryExecutionRun(item, document, run);
		lastRun = run;
		attempts.push(recoveryExecutionAttempt(attempt, run));
		assertNotAborted(runOptions.signal);
		if (run.trace.runStatus === "complete") break;
	}
	if (lastRun === undefined) {
		throw new Error(
			`textpipeline recovery execution input ${item.inputIndex} did not produce a retry run`,
		);
	}
	const lastAttempt = attempts[attempts.length - 1];
	if (lastAttempt === undefined) {
		throw new Error(
			`textpipeline recovery execution input ${item.inputIndex} did not record a retry attempt`,
		);
	}
	return {
		run: lastRun,
		reportItem: {
			inputIndex: item.inputIndex,
			documentId: item.documentId,
			recoveryAction: item.recoveryAction,
			executionStatus:
				lastAttempt.runStatus === "complete"
					? "retry-complete"
					: "retry-exhausted",
			startAttempt: item.nextAttempt,
			maxAttempts: item.maxAttempts,
			attemptedAttempts: attempts.length,
			finalAttempt: lastAttempt.attempt,
			finalRevision: lastAttempt.finalRevision,
			traceEntryCount: lastAttempt.traceEntryCount,
			failedProcessorIds: lastAttempt.failedProcessorIds,
			skippedProcessorIds: lastAttempt.skippedProcessorIds,
			attempts,
			...recoveryWorkerFields(item),
		},
	};
}

export async function executeTextPipelineRecoveryPlan(
	plan: TextPipelineRecoveryPlanV1,
	documents: readonly TextDocument[],
	processors: readonly TextPipelineAsyncProcessor[],
	context: TextPipelineContext = {},
	options: TextPipelineRecoveryExecutionOptions = {},
): Promise<TextPipelineRecoveryExecutionResult> {
	assertRecoveryExecutionInputs(plan, documents, processors, context);
	const runOptions = textPipelineRecoveryExecutionRunOptions(options);
	const executor = options.executor ?? {
		run(input: TextPipelineRecoveryExecutionInput) {
			return runTextPipelineAsync(
				input.document,
				input.processors,
				input.context,
				input.options,
			);
		},
	};
	assertRecoveryExecutor(executor);

	const reportItems: TextPipelineRecoveryExecutionReportItem[] = [];
	const runs: TextPipelineRunResult[] = [];
	for (const item of plan.items) {
		if (item.recoveryAction === "retain") {
			reportItems.push(retainedRecoveryExecutionReportItem(item));
			continue;
		}
		const document = documents[item.inputIndex];
		if (document === undefined) {
			throw new Error(
				`textpipeline recovery execution missing document at input ${item.inputIndex}`,
			);
		}
		const retry = await executeTextPipelineRecoveryPlanItem(
			item,
			document,
			processors,
			context,
			runOptions,
			executor,
		);
		runs.push(retry.run);
		reportItems.push(retry.reportItem);
	}

	const completeRetryCount = reportItems.filter(
		(item) => item.executionStatus === "retry-complete",
	).length;
	const exhaustedRetryCount = reportItems.filter(
		(item) => item.executionStatus === "retry-exhausted",
	).length;
	const report = {
		schemaVersion: textPipelineRecoveryExecutionReportSchemaVersion,
		artifactType: "textpipeline-recovery-execution-report-v1",
		planId: plan.planId,
		sourceKind: plan.sourceKind,
		documentCount: plan.documentCount,
		retainedCount: reportItems.filter(
			(item) => item.executionStatus === "retained",
		).length,
		retryCount: plan.retryCount,
		attemptedRetryCount: reportItems.filter(
			(item) => item.recoveryAction === "retry" && item.attemptedAttempts > 0,
		).length,
		completeRetryCount,
		exhaustedRetryCount,
		attemptCount: reportItems.reduce(
			(sum, item) => sum + item.attemptedAttempts,
			0,
		),
		retryInputIndexes: plan.retryInputIndexes,
		items: reportItems,
	} satisfies TextPipelineRecoveryExecutionReportV1;
	if (!isTextPipelineRecoveryExecutionReportV1(report)) {
		throw new TypeError("textpipeline recovery execution report is invalid");
	}
	return {
		runs,
		report,
	};
}

function assertTextPipelineWorker(worker: TextPipelineWorker): void {
	if (
		!isRecord(worker) ||
		!isNonEmptyString(worker.workerId) ||
		typeof worker.run !== "function"
	) {
		throw new TypeError(
			"textpipeline worker must expose a workerId and run function",
		);
	}
}

function assertTextPipelineWorkerResult(
	worker: TextPipelineWorker,
	inputIndex: number,
	inputDocument: TextDocument,
	plan: TextPipelineExecutionPlan,
	result: TextPipelineRunResult,
): void {
	if (
		!isRecord(result) ||
		!isTextDocument(result.document) ||
		!isTextPipelineTraceV1(result.trace)
	) {
		throw new TypeError(
			`textpipeline worker ${worker.workerId} returned an invalid run result`,
		);
	}
	if (
		result.document.id !== inputDocument.id ||
		result.trace.documentId !== inputDocument.id
	) {
		throw new Error(
			`textpipeline worker ${worker.workerId} returned result for unexpected document at input ${inputIndex}`,
		);
	}
	if (!sameStringArray(result.trace.processorOrder, plan.processorOrder)) {
		throw new Error(
			`textpipeline worker ${worker.workerId} returned an unexpected processor order at input ${inputIndex}`,
		);
	}
}

export function createTextPipelineLocalWorker(
	workerId = "local",
): TextPipelineWorker {
	if (!isNonEmptyString(workerId)) {
		throw new TypeError("textpipeline worker id must be a non-empty string");
	}
	return {
		workerId,
		run(input) {
			return runTextPipelineAsync(
				input.document,
				input.processors,
				input.context,
				input.options,
			);
		},
	};
}

export async function runTextPipelineBatchWithWorker(
	documents: readonly TextDocument[],
	processors: readonly TextPipelineExecutableProcessor[],
	worker: TextPipelineWorker,
	context: TextPipelineContext = {},
	options: TextPipelineRunOptions = {},
): Promise<TextPipelineWorkerBatchRunResult> {
	assertTextPipelineWorker(worker);
	if (
		!Array.isArray(documents) ||
		!documents.every((document) => isTextDocument(document))
	) {
		throw new TypeError(
			"pipeline worker batch documents must satisfy TextDocument",
		);
	}
	if (!isTextPipelineContext(context)) {
		throw new TypeError("pipeline context is invalid");
	}
	const plan = createTextPipelineExecutionPlan(processors);
	const runs: TextPipelineRunResult[] = [];
	for (let inputIndex = 0; inputIndex < documents.length; inputIndex += 1) {
		assertNotAborted(options.signal);
		const document = documents[inputIndex];
		if (document === undefined)
			throw new Error(`textpipeline worker batch lost input ${inputIndex}`);
		try {
			const result = await worker.run({
				inputIndex,
				document,
				processors,
				context,
				options,
			});
			assertTextPipelineWorkerResult(
				worker,
				inputIndex,
				document,
				plan,
				result,
			);
			runs.push(result);
		} catch (error) {
			if (options.errorPolicy !== "continue") throw error;
			throw new Error(
				`textpipeline worker ${worker.workerId} failed for input ${inputIndex}: ${error instanceof Error ? error.message : "worker failed"}`,
			);
		}
		assertNotAborted(options.signal);
	}
	return {
		runs,
		report: createTextPipelineWorkerRunReport(worker.workerId, runs),
	};
}

function textPipelineWorkerPoolRunOptions(
	options: TextPipelineWorkerPoolRunOptions,
): TextPipelineRunOptions {
	return {
		...(options.signal === undefined ? {} : { signal: options.signal }),
		...(options.errorPolicy === undefined
			? {}
			: { errorPolicy: options.errorPolicy }),
		...(options.cache === undefined ? {} : { cache: options.cache }),
		...(options.cacheNamespace === undefined
			? {}
			: { cacheNamespace: options.cacheNamespace }),
	};
}

function activeTextPipelineWorkerPool(
	workers: readonly TextPipelineWorker[],
	options: TextPipelineWorkerPoolRunOptions,
): readonly TextPipelineWorker[] {
	if (!Array.isArray(workers) || workers.length === 0) {
		throw new TypeError(
			"textpipeline worker pool must contain at least one worker",
		);
	}
	for (const worker of workers) assertTextPipelineWorker(worker);
	const workerIds = workers.map((worker) => worker.workerId);
	if (!hasUniqueStrings(workerIds)) {
		throw new TypeError("textpipeline worker pool worker ids must be unique");
	}
	const maxConcurrency = options.maxConcurrency ?? workers.length;
	if (
		!Number.isInteger(maxConcurrency) ||
		maxConcurrency < 1 ||
		maxConcurrency > workers.length
	) {
		throw new RangeError(
			"textpipeline worker pool maxConcurrency must be between 1 and the worker count",
		);
	}
	const strategy = options.strategy ?? "round-robin";
	if (!isTextPipelineWorkerPoolStrategy(strategy)) {
		throw new TypeError("textpipeline worker pool strategy is invalid");
	}
	return workers.slice(0, maxConcurrency);
}

export async function runTextPipelineBatchWithWorkerPool(
	documents: readonly TextDocument[],
	processors: readonly TextPipelineExecutableProcessor[],
	workers: readonly TextPipelineWorker[],
	context: TextPipelineContext = {},
	options: TextPipelineWorkerPoolRunOptions = {},
): Promise<TextPipelineWorkerPoolBatchRunResult> {
	const activeWorkers = activeTextPipelineWorkerPool(workers, options);
	if (
		!Array.isArray(documents) ||
		!documents.every((document) => isTextDocument(document))
	) {
		throw new TypeError(
			"pipeline worker pool documents must satisfy TextDocument",
		);
	}
	if (!isTextPipelineContext(context)) {
		throw new TypeError("pipeline context is invalid");
	}
	const plan = createTextPipelineExecutionPlan(processors);
	const strategy = options.strategy ?? "round-robin";
	const poolId = options.poolId ?? "worker-pool";
	if (!isNonEmptyString(poolId)) {
		throw new TypeError(
			"textpipeline worker pool id must be a non-empty string",
		);
	}
	const runOptions = textPipelineWorkerPoolRunOptions(options);
	const runs: Array<TextPipelineRunResult | undefined> = Array.from({
		length: documents.length,
	});
	const assignments: TextPipelineWorkerPoolAssignment[] = documents.map(
		(_, inputIndex) => {
			const workerSlot = inputIndex % activeWorkers.length;
			const worker = activeWorkers[workerSlot];
			if (worker === undefined)
				throw new Error(
					`textpipeline worker pool lost worker slot ${workerSlot}`,
				);
			return {
				workerId: worker.workerId,
				workerSlot,
			};
		},
	);

	await Promise.all(
		activeWorkers.map(async (worker, workerSlot) => {
			for (
				let inputIndex = workerSlot;
				inputIndex < documents.length;
				inputIndex += activeWorkers.length
			) {
				assertNotAborted(options.signal);
				const document = documents[inputIndex];
				if (document === undefined)
					throw new Error(`textpipeline worker pool lost input ${inputIndex}`);
				try {
					const result = await worker.run({
						inputIndex,
						document,
						processors,
						context,
						options: runOptions,
					});
					assertTextPipelineWorkerResult(
						worker,
						inputIndex,
						document,
						plan,
						result,
					);
					runs[inputIndex] = result;
				} catch (error) {
					if (options.errorPolicy !== "continue") throw error;
					throw new Error(
						`textpipeline worker pool ${poolId} worker ${worker.workerId} failed for input ${inputIndex}: ${
							error instanceof Error ? error.message : "worker failed"
						}`,
					);
				}
				assertNotAborted(options.signal);
			}
		}),
	);

	const orderedRuns = runs.map((run, inputIndex) => {
		if (run === undefined)
			throw new Error(
				`textpipeline worker pool missing result for input ${inputIndex}`,
			);
		return run;
	});
	return {
		runs: orderedRuns,
		report: createTextPipelineWorkerPoolRunReport(
			poolId,
			strategy,
			activeWorkers.map((worker) => worker.workerId),
			assignments,
			orderedRuns,
		),
	};
}

export function runTextPipelineBatchWithReport(
	documents: readonly TextDocument[],
	processors: readonly TextPipelineProcessor[],
	context: TextPipelineContext = {},
): TextPipelineBatchRunResult {
	const runs = runTextPipelineBatch(documents, processors, context);
	return {
		runs,
		report: createTextPipelineBatchRunReport(runs),
	};
}

export async function runTextPipelineBatchAsync(
	documents: readonly TextDocument[],
	processors: readonly TextPipelineAsyncProcessor[],
	context: TextPipelineContext = {},
	options: TextPipelineRunOptions = {},
): Promise<readonly TextPipelineRunResult[]> {
	const results: TextPipelineRunResult[] = [];
	for (const document of documents) {
		assertNotAborted(options.signal);
		results.push(
			await runTextPipelineAsync(document, processors, context, options),
		);
	}
	return results;
}

export async function runTextPipelineBatchAsyncWithReport(
	documents: readonly TextDocument[],
	processors: readonly TextPipelineAsyncProcessor[],
	context: TextPipelineContext = {},
	options: TextPipelineRunOptions = {},
): Promise<TextPipelineBatchRunResult> {
	const runs = await runTextPipelineBatchAsync(
		documents,
		processors,
		context,
		options,
	);
	return {
		runs,
		report: createTextPipelineBatchRunReport(runs),
	};
}

export async function* runTextPipelineStream(
	documents: AsyncIterable<TextDocument> | Iterable<TextDocument>,
	processors: readonly TextPipelineAsyncProcessor[],
	context: TextPipelineContext = {},
	options: TextPipelineRunOptions = {},
): AsyncIterable<TextPipelineRunResult> {
	for await (const document of documents) {
		assertNotAborted(options.signal);
		const run = await runTextPipelineAsync(
			document,
			processors,
			context,
			options,
		);
		assertNotAborted(options.signal);
		yield run;
	}
}
