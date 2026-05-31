import { isTextDocDocumentV1, type TextDocDocumentV1 } from "@ismail-elkorchi/textdoc";
import {
  checkTextProtocolResultEnvelopeCompatibility,
  isTextProtocolDiagnostic,
  isTextProtocolResultEnvelopeForPayloadKind,
  resultEnvelopeSchemaId,
  resultEnvelopeSchemaVersion,
  textProtocolPayloadKindTextpipelineBatchRunReportV1,
  textProtocolPayloadKindTextpipelineTraceV1,
  type TextProtocolDiagnostic,
  type TextProtocolProvenance,
  type TextProtocolResultEnvelopeV1,
} from "@ismail-elkorchi/textprotocol";

export const packageName = "@ismail-elkorchi/textpipeline" as const;
export const textPipelineTraceSchemaVersion = 1 as const;
export const textPipelineBatchRunReportSchemaVersion = 1 as const;
export const textPipelineTracePayloadKind = textProtocolPayloadKindTextpipelineTraceV1;
export const textPipelineBatchRunReportPayloadKind =
  textProtocolPayloadKindTextpipelineBatchRunReportV1;

export type PackageName = typeof packageName;
export type TextPipelineTraceSchemaVersion = typeof textPipelineTraceSchemaVersion;
export type TextPipelineBatchRunReportSchemaVersion =
  typeof textPipelineBatchRunReportSchemaVersion;
export type TextPipelineTracePayloadKind = typeof textPipelineTracePayloadKind;
export type TextPipelineBatchRunReportPayloadKind =
  typeof textPipelineBatchRunReportPayloadKind;
export type TextPipelinePurity = "pure" | "stateful";
export type TextPipelineTraceStatus = "applied" | "skipped" | "cached" | "failed";
export type TextPipelineRunStatus = "complete" | "partial";
export type TextPipelineExecutionMode = "sync" | "async";
export type TextPipelineErrorPolicy = "throw" | "continue";
export type TextPipelineCachePolicy = "none" | "read-through";

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
  readonly document: TextDocDocumentV1;
  readonly diagnostics?: readonly TextProtocolDiagnostic[];
}

export interface TextPipelineProcessor {
  readonly descriptor: TextPipelineProcessorDescriptor;
  run(
    document: TextDocDocumentV1,
    context: TextPipelineContext,
  ): TextPipelineProcessorRunResult;
}

export interface TextPipelineAsyncProcessor {
  readonly descriptor: TextPipelineProcessorDescriptor;
  run(
    document: TextDocDocumentV1,
    context: TextPipelineContext,
  ): TextPipelineProcessorRunResult | Promise<TextPipelineProcessorRunResult>;
}

export interface TextPipelineDocumentCache {
  get(key: string): TextDocDocumentV1 | undefined | Promise<TextDocDocumentV1 | undefined>;
  set?(key: string, document: TextDocDocumentV1): void | Promise<void>;
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
  readonly diagnostics: readonly TextProtocolDiagnostic[];
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
  readonly diagnostics?: readonly TextProtocolDiagnostic[];
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
  readonly document: TextDocDocumentV1;
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

export interface TextPipelineTraceEnvelopeMetadata {
  readonly provenance?: TextProtocolProvenance;
  readonly diagnostics?: readonly TextProtocolDiagnostic[];
  readonly scopeBoundary?: string;
  readonly limitations?: readonly string[];
}

type TextPipelineExecutableProcessor = TextPipelineProcessor | TextPipelineAsyncProcessor;

export type TextPipelineTraceEnvelopeV1 = TextProtocolResultEnvelopeV1<
  TextPipelineTraceV1,
  TextPipelineTracePayloadKind
>;

export type TextPipelineBatchRunReportEnvelopeV1 = TextProtocolResultEnvelopeV1<
  TextPipelineBatchRunReport,
  TextPipelineBatchRunReportPayloadKind
>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((entry) => isNonEmptyString(entry));
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function hasUniqueStrings(values: readonly string[]): boolean {
  return new Set(values).size === values.length;
}

function sameStringArray(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((entry, index) => entry === right[index]);
}

function isVersionRef(value: unknown): value is TextPipelineVersionRef {
  return isRecord(value) && isNonEmptyString(value.id) && isNonEmptyString(value.version);
}

function hasUniqueVersionRefIds(values: readonly TextPipelineVersionRef[]): boolean {
  return new Set(values.map((entry) => entry.id)).size === values.length;
}

function isVersionRefArray(value: unknown): value is readonly TextPipelineVersionRef[] {
  return Array.isArray(value) && value.every((entry) => isVersionRef(entry)) &&
    hasUniqueVersionRefIds(value);
}

function listMissingValues(
  expected: readonly string[] | undefined,
  actual: ReadonlySet<string>,
): readonly string[] {
  if (expected === undefined) return [];
  return expected.filter((entry) => !actual.has(entry));
}

function collectEmittedIds<T extends { readonly id: string }>(
  before: readonly T[],
  after: readonly T[],
): readonly string[] {
  const existingIds = new Set(before.map((entry) => entry.id));
  return after.filter((entry) => !existingIds.has(entry.id)).map((entry) => entry.id);
}

function uniqueSortedStrings(values: readonly string[]): readonly string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function normalizeIdSet(
  values: readonly string[] | undefined,
  versionRefs: readonly TextPipelineVersionRef[] | undefined,
): ReadonlySet<string> {
  return new Set([...(values ?? []), ...(versionRefs ?? []).map((entry) => entry.id)]);
}

function sortedVersionRefs(
  values: readonly TextPipelineVersionRef[] | undefined,
): readonly TextPipelineVersionRef[] {
  return [...(values ?? [])].sort((left, right) => left.id.localeCompare(right.id));
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
    return `{${Object.keys(value).sort((left, right) => left.localeCompare(right)).map((key) =>
      `${JSON.stringify(key)}:${stableJson(value[key])}`
    ).join(",")}}`;
  }
  return JSON.stringify(value);
}

function canonicalContext(context: TextPipelineContext): Readonly<Record<string, unknown>> {
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

export function createTextPipelineContextFingerprint(context: TextPipelineContext = {}): string {
  if (!isTextPipelineContext(context)) {
    throw new TypeError("pipeline context is invalid");
  }
  return stableJson(canonicalContext(context));
}

function diagnostic(
  code: string,
  severity: TextProtocolDiagnostic["severity"],
  message: string,
): TextProtocolDiagnostic {
  return { code, severity, message };
}

function formatMissingRequirementMessage(kind: string, values: readonly string[]): string {
  return `missing required ${kind}: ${values.join(", ")}`;
}

function pushMissingIdDiagnostic(
  diagnostics: TextProtocolDiagnostic[],
  code: string,
  kind: string,
  values: readonly string[],
): void {
  if (values.length === 0) return;
  diagnostics.push(diagnostic(code, "warning", formatMissingRequirementMessage(kind, values)));
}

function pushVersionDiagnostics(
  diagnostics: TextProtocolDiagnostic[],
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
  document: TextDocDocumentV1,
  context: TextPipelineContext,
): readonly TextProtocolDiagnostic[] {
  const viewIds = new Set(document.views.map((view) => view.id));
  const layerIds = new Set(document.layers.map((layer) => layer.id));
  const packageIds = normalizeIdSet(context.packages, context.packageVersions);
  const packIds = normalizeIdSet(context.packs, context.packVersions);
  const profileIds = normalizeIdSet(context.profiles, context.profileVersions);
  const packageVersions = getVersionMap(context.packageVersions);
  const packVersions = getVersionMap(context.packVersions);
  const profileVersions = getVersionMap(context.profileVersions);

  const diagnostics: TextProtocolDiagnostic[] = [];

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

  pushVersionDiagnostics(diagnostics, "package", descriptor.requires?.packageVersions, packageVersions);
  pushVersionDiagnostics(diagnostics, "pack", descriptor.requires?.packVersions, packVersions);
  pushVersionDiagnostics(diagnostics, "profile", descriptor.requires?.profileVersions, profileVersions);

  return diagnostics;
}

function assertValidTraceDiagnostics(
  processorId: string,
  diagnostics: readonly TextProtocolDiagnostic[] | undefined,
): readonly TextProtocolDiagnostic[] {
  if (diagnostics === undefined) return [];
  if (!Array.isArray(diagnostics) || !diagnostics.every((entry) => isTextProtocolDiagnostic(entry))) {
    throw new TypeError(`processor ${processorId} returned invalid diagnostics`);
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
    throw new Error(`processor ${processor.descriptor.id} emitted undeclared view ids`);
  }

  if (
    processor.descriptor.emits?.layers !== undefined &&
    emittedLayers.some((layerId) => !declaredLayers.has(layerId))
  ) {
    throw new Error(`processor ${processor.descriptor.id} emitted undeclared layer ids`);
  }
}

function assertValidProcessorResult(
  processor: TextPipelineExecutableProcessor,
  currentDocument: TextDocDocumentV1,
  result: TextPipelineProcessorRunResult,
): void {
  if (!isTextDocDocumentV1(result.document)) {
    throw new TypeError(`processor ${processor.descriptor.id} returned an invalid document`);
  }
  if (result.document.documentId !== currentDocument.documentId) {
    throw new Error(`processor ${processor.descriptor.id} changed documentId`);
  }
}

function invalidGraphResult(diagnostics: readonly TextProtocolDiagnostic[]): TextPipelineGraphValidationResult {
  return {
    ok: false,
    processorOrder: [],
    diagnostics,
  };
}

export function validateTextPipelineGraph(
  processors: readonly TextPipelineExecutableProcessor[],
): TextPipelineGraphValidationResult {
  const diagnostics: TextProtocolDiagnostic[] = [];
  const byId = new Map<string, TextPipelineExecutableProcessor>();
  const pendingCounts = new Map<string, number>();
  const dependents = new Map<string, string[]>();

  for (const processor of processors) {
    const descriptor = isRecord(processor) ? processor.descriptor : undefined;
    if (!isTextPipelineProcessorDescriptor(descriptor)) {
      diagnostics.push(
        diagnostic("textpipeline.invalid-processor-descriptor", "error", "processor descriptor is invalid"),
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
        diagnostic("textpipeline.duplicate-processor-id", "error", `duplicate processor id: ${descriptor.id}`),
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
    throw new Error(validation.diagnostics.map((entry) => entry.message ?? entry.code).join("; "));
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
    byId: new Map(processors.map((processor) => [processor.descriptor.id, processor])),
    plan,
  };
}

export function isTextPipelineVersionRef(value: unknown): value is TextPipelineVersionRef {
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
    (value.packageVersions === undefined || isVersionRefArray(value.packageVersions)) &&
    (value.packVersions === undefined || isVersionRefArray(value.packVersions)) &&
    (value.profileVersions === undefined || isVersionRefArray(value.profileVersions))
  );
}

export function isTextPipelineEmitSet(value: unknown): value is TextPipelineEmitSet {
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
    (value.requires === undefined || isTextPipelineRequirementSet(value.requires)) &&
    (value.emits === undefined || isTextPipelineEmitSet(value.emits)) &&
    (value.purity === "pure" || value.purity === "stateful") &&
    typeof value.parallelSafe === "boolean"
  );
}

export function isTextPipelineContext(value: unknown): value is TextPipelineContext {
  return (
    isRecord(value) &&
    (value.packages === undefined ||
      (isStringArray(value.packages) && hasUniqueStrings(value.packages))) &&
    (value.packs === undefined ||
      (isStringArray(value.packs) && hasUniqueStrings(value.packs))) &&
    (value.profiles === undefined ||
      (isStringArray(value.profiles) && hasUniqueStrings(value.profiles))) &&
    (value.packageVersions === undefined || isVersionRefArray(value.packageVersions)) &&
    (value.packVersions === undefined || isVersionRefArray(value.packVersions)) &&
    (value.profileVersions === undefined || isVersionRefArray(value.profileVersions))
  );
}

export function isTextPipelineTraceEntry(value: unknown): value is TextPipelineTraceEntry {
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
        value.diagnostics.every((entry) => isTextProtocolDiagnostic(entry))))
  );
}

export function isTextPipelineTraceV1(value: unknown): value is TextPipelineTraceV1 {
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

function isTextPipelineBatchRunItem(value: unknown): value is TextPipelineBatchRunItem {
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

export function isTextPipelineBatchRunReportV1(
  value: unknown,
): value is TextPipelineBatchRunReport {
  if (!isRecord(value) || value.schemaVersion !== textPipelineBatchRunReportSchemaVersion) {
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
  if (!inputIndexes.every((inputIndex, index) => inputIndex === index)) return false;

  const completeCount = items.filter((item) => item.runStatus === "complete").length;
  const partialCount = items.filter((item) => item.runStatus === "partial").length;
  return (
    value.documentCount === items.length &&
    value.completeCount === completeCount &&
    value.partialCount === partialCount &&
    value.completeCount + value.partialCount === value.documentCount &&
    sameStringArray(value.executionModes, uniqueSortedStrings(items.map((item) => item.executionMode))) &&
    sameStringArray(value.cachePolicies, uniqueSortedStrings(items.map((item) => item.cachePolicy))) &&
    sameStringArray(value.contextFingerprints, uniqueSortedStrings(value.contextFingerprints))
  );
}

function assertNotAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted === true) {
    throw new Error("textpipeline run aborted");
  }
}

export function createTextPipelineCacheKey(
  processor: TextPipelineExecutableProcessor,
  document: TextDocDocumentV1,
  context: TextPipelineContext = {},
  options: TextPipelineCacheKeyOptions = {},
): string {
  if (!isTextPipelineProcessorDescriptor(processor.descriptor)) {
    throw new TypeError("processor descriptor is invalid");
  }
  if (!isTextDocDocumentV1(document)) {
    throw new TypeError("cache-key document must satisfy TextDocDocumentV1");
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
      documentId: document.documentId,
      revision: document.revision,
    },
    context: canonicalContext(context),
  });
}

function cacheKeyOptions(options: TextPipelineRunOptions): TextPipelineCacheKeyOptions {
  return options.cacheNamespace === undefined ? {} : { cacheNamespace: options.cacheNamespace };
}

function processorErrorDiagnostic(processorId: string, error: unknown): TextProtocolDiagnostic {
  return {
    code: "textpipeline.processor-error",
    severity: "error",
    message: error instanceof Error ? `${processorId}: ${error.message}` : `${processorId}: processor failed`,
  };
}

function blockedDependencyDiagnostics(
  processor: TextPipelineExecutableProcessor,
  completedProcessorIds: ReadonlySet<string>,
): readonly TextProtocolDiagnostic[] {
  const blocked = (processor.descriptor.dependsOn ?? []).filter((dependencyId) =>
    !completedProcessorIds.has(dependencyId)
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

function traceRunStatus(entries: readonly TextPipelineTraceEntry[]): TextPipelineRunStatus {
  return entries.every((entry) => entry.status === "applied" || entry.status === "cached")
    ? "complete"
    : "partial";
}

function buildTrace(
  document: TextDocDocumentV1,
  entries: readonly TextPipelineTraceEntry[],
  plan: TextPipelineExecutionPlan,
  context: TextPipelineContext,
  mode: TextPipelineExecutionMode,
  cachePolicy: TextPipelineCachePolicy,
): TextPipelineTraceV1 {
  return {
    schemaVersion: textPipelineTraceSchemaVersion,
    documentId: document.documentId,
    finalRevision: document.revision,
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
  currentDocument: TextDocDocumentV1,
  context: TextPipelineContext,
  inputRevision: string,
): {
  readonly document: TextDocDocumentV1;
  readonly entry: TextPipelineTraceEntry;
} {
  const previousViews = currentDocument.views;
  const previousLayers = currentDocument.layers;
  const result = processor.run(currentDocument, context);
  assertValidProcessorResult(processor, currentDocument, result);

  const diagnostics = assertValidTraceDiagnostics(processor.descriptor.id, result.diagnostics);
  const emittedViews = collectEmittedIds(previousViews, result.document.views);
  const emittedLayers = collectEmittedIds(previousLayers, result.document.layers);

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
      outputRevision: result.document.revision,
    },
  };
}

export function runTextPipeline(
  document: TextDocDocumentV1,
  processors: readonly TextPipelineProcessor[],
  context: TextPipelineContext = {},
): TextPipelineRunResult {
  if (!isTextDocDocumentV1(document)) {
    throw new TypeError("pipeline input must satisfy TextDocDocumentV1");
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
    if (processor === undefined) throw new Error(`processor dependency graph lost processor ${processorId}`);

    const inputRevision = currentDocument.revision;
    const blockedDiagnostics = blockedDependencyDiagnostics(processor, completedProcessorIds);
    if (blockedDiagnostics.length > 0) {
      traceEntries.push({
        processorId: processor.descriptor.id,
        version: processor.descriptor.version,
        status: "skipped",
        emittedViews: [],
        emittedLayers: [],
        diagnostics: blockedDiagnostics,
        inputRevision,
        outputRevision: currentDocument.revision,
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
        outputRevision: currentDocument.revision,
      });
      continue;
    }

    const result = runProcessorSync(processor, currentDocument, context, inputRevision);
    currentDocument = result.document;
    completedProcessorIds.add(processor.descriptor.id);
    traceEntries.push(result.entry);
  }

  return {
    document: currentDocument,
    trace: buildTrace(currentDocument, traceEntries, plan, context, "sync", "none"),
  };
}

async function runProcessorAsync(
  processor: TextPipelineAsyncProcessor,
  currentDocument: TextDocDocumentV1,
  context: TextPipelineContext,
  inputRevision: string,
  options: TextPipelineRunOptions,
): Promise<{
  readonly document: TextDocDocumentV1;
  readonly entry: TextPipelineTraceEntry;
}> {
  const previousViews = currentDocument.views;
  const previousLayers = currentDocument.layers;
  const cacheKey = options.cache === undefined
    ? undefined
    : createTextPipelineCacheKey(processor, currentDocument, context, cacheKeyOptions(options));

  assertNotAborted(options.signal);
  const cachedDocument = cacheKey === undefined ? undefined : await options.cache?.get(cacheKey);
  assertNotAborted(options.signal);

  if (cachedDocument !== undefined) {
    if (cacheKey === undefined) {
      throw new Error(`processor ${processor.descriptor.id} cache returned without a cache key`);
    }
    if (!isTextDocDocumentV1(cachedDocument)) {
      throw new TypeError(`processor ${processor.descriptor.id} cache returned an invalid document`);
    }
    if (cachedDocument.documentId !== currentDocument.documentId) {
      throw new Error(`processor ${processor.descriptor.id} cache changed documentId`);
    }

    const emittedViews = collectEmittedIds(previousViews, cachedDocument.views);
    const emittedLayers = collectEmittedIds(previousLayers, cachedDocument.layers);
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
        outputRevision: cachedDocument.revision,
        cacheKey,
      },
    };
  }

  const result = await processor.run(currentDocument, context);
  assertNotAborted(options.signal);
  assertValidProcessorResult(processor, currentDocument, result);

  const diagnostics = assertValidTraceDiagnostics(processor.descriptor.id, result.diagnostics);
  const emittedViews = collectEmittedIds(previousViews, result.document.views);
  const emittedLayers = collectEmittedIds(previousLayers, result.document.layers);

  assertEmitsSubset(processor, emittedViews, emittedLayers);
  if (cacheKey !== undefined) await options.cache?.set?.(cacheKey, result.document);
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
      outputRevision: result.document.revision,
      ...(cacheKey !== undefined ? { cacheKey } : {}),
    },
  };
}

export async function runTextPipelineAsync(
  document: TextDocDocumentV1,
  processors: readonly TextPipelineAsyncProcessor[],
  context: TextPipelineContext = {},
  options: TextPipelineRunOptions = {},
): Promise<TextPipelineRunResult> {
  if (!isTextDocDocumentV1(document)) {
    throw new TypeError("pipeline input must satisfy TextDocDocumentV1");
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
    if (processor === undefined) throw new Error(`processor dependency graph lost processor ${processorId}`);

    const inputRevision = currentDocument.revision;
    const blockedDiagnostics = blockedDependencyDiagnostics(processor, completedProcessorIds);
    if (blockedDiagnostics.length > 0) {
      traceEntries.push({
        processorId: processor.descriptor.id,
        version: processor.descriptor.version,
        status: "skipped",
        emittedViews: [],
        emittedLayers: [],
        diagnostics: blockedDiagnostics,
        inputRevision,
        outputRevision: currentDocument.revision,
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
        outputRevision: currentDocument.revision,
      });
      continue;
    }

    try {
      const result = await runProcessorAsync(processor, currentDocument, context, inputRevision, options);
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
        outputRevision: currentDocument.revision,
        ...(options.cache === undefined
          ? {}
          : {
            cacheKey: createTextPipelineCacheKey(processor, currentDocument, context, cacheKeyOptions(options)),
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
  documents: readonly TextDocDocumentV1[],
  processors: readonly TextPipelineProcessor[],
  context: TextPipelineContext = {},
): readonly TextPipelineRunResult[] {
  return documents.map((document) => runTextPipeline(document, processors, context));
}

export function createTextPipelineBatchRunReport(
  runs: readonly TextPipelineRunResult[],
): TextPipelineBatchRunReport {
  const items = runs.map((run, inputIndex) => {
    if (!isTextPipelineTraceV1(run.trace)) {
      throw new TypeError(`batch run ${inputIndex} trace must satisfy TextPipelineTraceV1`);
    }
    if (run.document.documentId !== run.trace.documentId) {
      throw new Error(`batch run ${inputIndex} documentId does not match its trace`);
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
    executionModes: uniqueSortedStrings(items.map((item) => item.executionMode)) as readonly TextPipelineExecutionMode[],
    cachePolicies: uniqueSortedStrings(items.map((item) => item.cachePolicy)) as readonly TextPipelineCachePolicy[],
    contextFingerprints: uniqueSortedStrings(runs.map((run) => run.trace.contextFingerprint)),
    items,
  };
}

export function runTextPipelineBatchWithReport(
  documents: readonly TextDocDocumentV1[],
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
  documents: readonly TextDocDocumentV1[],
  processors: readonly TextPipelineAsyncProcessor[],
  context: TextPipelineContext = {},
  options: TextPipelineRunOptions = {},
): Promise<readonly TextPipelineRunResult[]> {
  const results: TextPipelineRunResult[] = [];
  for (const document of documents) {
    assertNotAborted(options.signal);
    results.push(await runTextPipelineAsync(document, processors, context, options));
  }
  return results;
}

export async function runTextPipelineBatchAsyncWithReport(
  documents: readonly TextDocDocumentV1[],
  processors: readonly TextPipelineAsyncProcessor[],
  context: TextPipelineContext = {},
  options: TextPipelineRunOptions = {},
): Promise<TextPipelineBatchRunResult> {
  const runs = await runTextPipelineBatchAsync(documents, processors, context, options);
  return {
    runs,
    report: createTextPipelineBatchRunReport(runs),
  };
}

export async function* runTextPipelineStream(
  documents: AsyncIterable<TextDocDocumentV1> | Iterable<TextDocDocumentV1>,
  processors: readonly TextPipelineAsyncProcessor[],
  context: TextPipelineContext = {},
  options: TextPipelineRunOptions = {},
): AsyncIterable<TextPipelineRunResult> {
  for await (const document of documents) {
    assertNotAborted(options.signal);
    const run = await runTextPipelineAsync(document, processors, context, options);
    assertNotAborted(options.signal);
    yield run;
  }
}

export function createTextPipelineTraceEnvelope(
  trace: TextPipelineTraceV1,
  producerVersion: string,
  metadata: TextPipelineTraceEnvelopeMetadata = {},
): TextPipelineTraceEnvelopeV1 {
  if (!isTextPipelineTraceV1(trace)) {
    throw new TypeError("trace must satisfy TextPipelineTraceV1");
  }
  if (!isNonEmptyString(producerVersion)) {
    throw new TypeError("producerVersion must be a non-empty string");
  }

  const envelope: TextPipelineTraceEnvelopeV1 = {
    schemaId: resultEnvelopeSchemaId,
    schemaVersion: resultEnvelopeSchemaVersion,
    producer: {
      package: packageName,
      version: producerVersion,
    },
    payloadKind: textPipelineTracePayloadKind,
    payload: trace,
    ...(metadata.provenance === undefined ? {} : { provenance: metadata.provenance }),
    ...(metadata.diagnostics === undefined ? {} : { diagnostics: metadata.diagnostics }),
    ...(metadata.scopeBoundary === undefined ? {} : { scopeBoundary: metadata.scopeBoundary }),
    ...(metadata.limitations === undefined ? {} : { limitations: metadata.limitations }),
  };
  const compatibility = checkTextProtocolResultEnvelopeCompatibility(envelope, {
    expectedPayloadKind: textPipelineTracePayloadKind,
    expectedProducerPackage: packageName,
  });
  if (!compatibility.ok) {
    throw new Error(compatibility.diagnostics.map((entry) => entry.message ?? entry.code).join("; "));
  }
  return envelope;
}

export function isTextPipelineTraceEnvelopeV1(value: unknown): value is TextPipelineTraceEnvelopeV1 {
  return (
    isTextProtocolResultEnvelopeForPayloadKind(value, textPipelineTracePayloadKind) &&
    isTextPipelineTraceV1(value.payload)
  );
}

export function createTextPipelineBatchRunReportEnvelope(
  report: TextPipelineBatchRunReport,
  producerVersion: string,
  metadata: TextPipelineTraceEnvelopeMetadata = {},
): TextPipelineBatchRunReportEnvelopeV1 {
  if (!isTextPipelineBatchRunReportV1(report)) {
    throw new TypeError("report must satisfy TextPipelineBatchRunReport");
  }
  if (!isNonEmptyString(producerVersion)) {
    throw new TypeError("producerVersion must be a non-empty string");
  }

  const envelope: TextPipelineBatchRunReportEnvelopeV1 = {
    schemaId: resultEnvelopeSchemaId,
    schemaVersion: resultEnvelopeSchemaVersion,
    producer: {
      package: packageName,
      version: producerVersion,
    },
    payloadKind: textPipelineBatchRunReportPayloadKind,
    payload: report,
    ...(metadata.provenance === undefined ? {} : { provenance: metadata.provenance }),
    ...(metadata.diagnostics === undefined ? {} : { diagnostics: metadata.diagnostics }),
    ...(metadata.scopeBoundary === undefined ? {} : { scopeBoundary: metadata.scopeBoundary }),
    ...(metadata.limitations === undefined ? {} : { limitations: metadata.limitations }),
  };
  const compatibility = checkTextProtocolResultEnvelopeCompatibility(envelope, {
    expectedPayloadKind: textPipelineBatchRunReportPayloadKind,
    expectedProducerPackage: packageName,
  });
  if (!compatibility.ok) {
    throw new Error(compatibility.diagnostics.map((entry) => entry.message ?? entry.code).join("; "));
  }
  return envelope;
}

export function isTextPipelineBatchRunReportEnvelopeV1(
  value: unknown,
): value is TextPipelineBatchRunReportEnvelopeV1 {
  return (
    isTextProtocolResultEnvelopeForPayloadKind(value, textPipelineBatchRunReportPayloadKind) &&
    isTextPipelineBatchRunReportV1(value.payload)
  );
}
