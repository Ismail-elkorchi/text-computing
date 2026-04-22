import { isTextDocDocumentV1, type TextDocDocumentV1 } from "@ismail-elkorchi/textdoc";
import {
  isTextProtocolDiagnostic,
  type TextProtocolDiagnostic,
  type TextProtocolResultEnvelopeV1,
} from "@ismail-elkorchi/textprotocol";

export const packageName = "@ismail-elkorchi/textpipeline" as const;
export const textPipelineTraceSchemaVersion = 1 as const;
export const textPipelineTracePayloadKind = "textpipeline-trace" as const;

export type PackageName = typeof packageName;
export type TextPipelineTraceSchemaVersion = typeof textPipelineTraceSchemaVersion;
export type TextPipelineTracePayloadKind = typeof textPipelineTracePayloadKind;
export type TextPipelinePurity = "pure" | "stateful";
export type TextPipelineTraceStatus = "applied" | "skipped";

export interface TextPipelineRequirementSet {
  readonly views?: readonly string[];
  readonly layers?: readonly string[];
  readonly packs?: readonly string[];
  readonly profiles?: readonly string[];
}

export interface TextPipelineProcessorDescriptor {
  readonly id: string;
  readonly version: string;
  readonly dependsOn?: readonly string[];
  readonly requires?: TextPipelineRequirementSet;
  readonly emits?: TextPipelineRequirementSet;
  readonly purity: TextPipelinePurity;
  readonly parallelSafe: boolean;
}

export interface TextPipelineContext {
  readonly packs?: readonly string[];
  readonly profiles?: readonly string[];
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

export interface TextPipelineTraceEntry {
  readonly processorId: string;
  readonly version: string;
  readonly status: TextPipelineTraceStatus;
  readonly emittedViews: readonly string[];
  readonly emittedLayers: readonly string[];
  readonly diagnostics?: readonly TextProtocolDiagnostic[];
  readonly inputRevision: string;
  readonly outputRevision: string;
}

export interface TextPipelineTraceV1 {
  readonly schemaVersion: TextPipelineTraceSchemaVersion;
  readonly documentId: string;
  readonly finalRevision: string;
  readonly entries: readonly TextPipelineTraceEntry[];
}

export interface TextPipelineRunResult {
  readonly document: TextDocDocumentV1;
  readonly trace: TextPipelineTraceV1;
}

export type TextPipelineTraceEnvelopeV1 = TextProtocolResultEnvelopeV1<
  TextPipelineTraceV1,
  TextPipelineTracePayloadKind
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

function hasUniqueStrings(values: readonly string[]): boolean {
  return new Set(values).size === values.length;
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

function normalizeIdSet(values: readonly string[] | undefined): ReadonlySet<string> {
  return new Set(values ?? []);
}

function compareProcessorIds(left: TextPipelineProcessor, right: TextPipelineProcessor): number {
  return left.descriptor.id.localeCompare(right.descriptor.id);
}

function formatMissingRequirementMessage(kind: string, values: readonly string[]): string {
  return `missing required ${kind}: ${values.join(", ")}`;
}

function getRequirementDiagnostics(
  descriptor: TextPipelineProcessorDescriptor,
  document: TextDocDocumentV1,
  context: TextPipelineContext,
): readonly TextProtocolDiagnostic[] {
  const viewIds = new Set(document.views.map((view) => view.id));
  const layerIds = new Set(document.layers.map((layer) => layer.id));
  const packIds = normalizeIdSet(context.packs);
  const profileIds = normalizeIdSet(context.profiles);

  const missingViews = listMissingValues(descriptor.requires?.views, viewIds);
  const missingLayers = listMissingValues(descriptor.requires?.layers, layerIds);
  const missingPacks = listMissingValues(descriptor.requires?.packs, packIds);
  const missingProfiles = listMissingValues(descriptor.requires?.profiles, profileIds);

  const diagnostics: TextProtocolDiagnostic[] = [];

  if (missingViews.length > 0) {
    diagnostics.push({
      code: "textpipeline.missing-view",
      severity: "warning",
      message: formatMissingRequirementMessage("views", missingViews),
    });
  }

  if (missingLayers.length > 0) {
    diagnostics.push({
      code: "textpipeline.missing-layer",
      severity: "warning",
      message: formatMissingRequirementMessage("layers", missingLayers),
    });
  }

  if (missingPacks.length > 0) {
    diagnostics.push({
      code: "textpipeline.missing-pack",
      severity: "warning",
      message: formatMissingRequirementMessage("packs", missingPacks),
    });
  }

  if (missingProfiles.length > 0) {
    diagnostics.push({
      code: "textpipeline.missing-profile",
      severity: "warning",
      message: formatMissingRequirementMessage("profiles", missingProfiles),
    });
  }

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
  processor: TextPipelineProcessor,
  emittedViews: readonly string[],
  emittedLayers: readonly string[],
): void {
  const declaredViews = normalizeIdSet(processor.descriptor.emits?.views);
  const declaredLayers = normalizeIdSet(processor.descriptor.emits?.layers);

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

function buildProcessorMap(
  processors: readonly TextPipelineProcessor[],
): ReadonlyMap<string, TextPipelineProcessor> {
  const byId = new Map<string, TextPipelineProcessor>();

  for (const processor of processors) {
    if (!isTextPipelineProcessorDescriptor(processor.descriptor)) {
      throw new TypeError("processor descriptor is invalid");
    }
    if (typeof processor.run !== "function") {
      throw new TypeError(`processor ${processor.descriptor.id} must expose a run function`);
    }
    if (byId.has(processor.descriptor.id)) {
      throw new Error(`duplicate processor id: ${processor.descriptor.id}`);
    }
    byId.set(processor.descriptor.id, processor);
  }

  return byId;
}

function collectDependencyGraph(
  processors: ReadonlyMap<string, TextPipelineProcessor>,
): {
  readonly pendingCounts: Map<string, number>;
  readonly dependents: Map<string, string[]>;
} {
  const pendingCounts = new Map<string, number>();
  const dependents = new Map<string, string[]>();

  for (const [processorId, processor] of processors) {
    const dependencies = processor.descriptor.dependsOn ?? [];
    pendingCounts.set(processorId, dependencies.length);

    for (const dependencyId of dependencies) {
      if (dependencyId === processorId) {
        throw new Error(`processor ${processorId} cannot depend on itself`);
      }
      if (!processors.has(dependencyId)) {
        throw new Error(`processor ${processorId} depends on missing processor ${dependencyId}`);
      }
      const downstream = dependents.get(dependencyId) ?? [];
      downstream.push(processorId);
      dependents.set(dependencyId, downstream);
    }
  }

  return { pendingCounts, dependents };
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
    (value.packs === undefined ||
      (isStringArray(value.packs) && hasUniqueStrings(value.packs))) &&
    (value.profiles === undefined ||
      (isStringArray(value.profiles) && hasUniqueStrings(value.profiles)))
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
    (value.emits === undefined || isTextPipelineRequirementSet(value.emits)) &&
    (value.purity === "pure" || value.purity === "stateful") &&
    typeof value.parallelSafe === "boolean"
  );
}

export function isTextPipelineContext(value: unknown): value is TextPipelineContext {
  return (
    isRecord(value) &&
    (value.packs === undefined ||
      (isStringArray(value.packs) && hasUniqueStrings(value.packs))) &&
    (value.profiles === undefined ||
      (isStringArray(value.profiles) && hasUniqueStrings(value.profiles)))
  );
}

export function isTextPipelineTraceEntry(value: unknown): value is TextPipelineTraceEntry {
  return (
    isRecord(value) &&
    isNonEmptyString(value.processorId) &&
    isNonEmptyString(value.version) &&
    (value.status === "applied" || value.status === "skipped") &&
    isStringArray(value.emittedViews) &&
    isStringArray(value.emittedLayers) &&
    isNonEmptyString(value.inputRevision) &&
    isNonEmptyString(value.outputRevision) &&
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
    Array.isArray(value.entries) &&
    value.entries.every((entry) => isTextPipelineTraceEntry(entry))
  );
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

  const processorMap = buildProcessorMap(processors);
  const { pendingCounts, dependents } = collectDependencyGraph(processorMap);
  const ready: TextPipelineProcessor[] = [...processorMap.values()]
    .filter((processor) => (pendingCounts.get(processor.descriptor.id) ?? 0) === 0)
    .sort(compareProcessorIds);

  let currentDocument = document;
  const traceEntries: TextPipelineTraceEntry[] = [];
  let processedCount = 0;

  while (ready.length > 0) {
    const processor = ready.shift();
    if (processor === undefined) break;

    processedCount += 1;
    const inputRevision = currentDocument.revision;
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
    } else {
      const previousViews = currentDocument.views;
      const previousLayers = currentDocument.layers;
      const result = processor.run(currentDocument, context);

      if (!isTextDocDocumentV1(result.document)) {
        throw new TypeError(`processor ${processor.descriptor.id} returned an invalid document`);
      }
      if (result.document.documentId !== currentDocument.documentId) {
        throw new Error(`processor ${processor.descriptor.id} changed documentId`);
      }

      const diagnostics = assertValidTraceDiagnostics(
        processor.descriptor.id,
        result.diagnostics,
      );
      const emittedViews = collectEmittedIds(previousViews, result.document.views);
      const emittedLayers = collectEmittedIds(previousLayers, result.document.layers);

      assertEmitsSubset(processor, emittedViews, emittedLayers);

      currentDocument = result.document;
      traceEntries.push({
        processorId: processor.descriptor.id,
        version: processor.descriptor.version,
        status: "applied",
        emittedViews,
        emittedLayers,
        ...(diagnostics.length > 0 ? { diagnostics } : {}),
        inputRevision,
        outputRevision: currentDocument.revision,
      });
    }

    for (const dependentId of dependents.get(processor.descriptor.id) ?? []) {
      const remaining = (pendingCounts.get(dependentId) ?? 0) - 1;
      pendingCounts.set(dependentId, remaining);
      if (remaining === 0) {
        const nextProcessor = processorMap.get(dependentId);
        if (nextProcessor === undefined) {
          throw new Error(`processor dependency graph lost processor ${dependentId}`);
        }
        ready.push(nextProcessor);
        ready.sort(compareProcessorIds);
      }
    }
  }

  if (processedCount !== processorMap.size) {
    throw new Error("processor dependency graph contains a cycle");
  }

  return {
    document: currentDocument,
    trace: {
      schemaVersion: textPipelineTraceSchemaVersion,
      documentId: currentDocument.documentId,
      finalRevision: currentDocument.revision,
      entries: traceEntries,
    },
  };
}
