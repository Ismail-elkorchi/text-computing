export const packageName = "@ismail-elkorchi/textprotocol" as const;
export const resultEnvelopeSchemaId =
  "urn:ismail-elkorchi:textprotocol:result-envelope:v1" as const;
export const resultEnvelopeSchemaVersion = 1 as const;
export const textProtocolResultEnvelopeJsonMediaType =
  "application/vnd.ismail-elkorchi.textprotocol.result-envelope.v1+json" as const;
export const textProtocolSchemaFamilyEnvelopeJsonMediaType =
  "application/vnd.ismail-elkorchi.textprotocol.schema-family-envelope.v1+json" as const;
export const textProtocolPayloadKindTextdocDocumentV1 = "textdoc-document-v1" as const;
export const textProtocolPayloadKindTextpipelineTraceV1 = "textpipeline-trace-v1" as const;
export const textProtocolPayloadKindTextpipelineBatchRunReportV1 =
  "textpipeline-batch-run-report-v1" as const;
export const textProtocolPayloadKindTextconformanceReportV1 =
  "textconformance-report-v1" as const;
export const textProtocolPayloadKindVerticalSliceResultV1 =
  "public-vertical-slice-0.1-result-v1" as const;
export const textProtocolPackManifestSchemaId =
  "https://github.com/Ismail-elkorchi/text-computing/schemas/textpack-manifest-v1.schema.json" as const;
export const textProtocolDocumentBundleSchemaId =
  "urn:ismail-elkorchi:textprotocol:document-bundle:v1" as const;
export const textProtocolAnnotationBundleSchemaId =
  "urn:ismail-elkorchi:textprotocol:annotation-bundle:v1" as const;
export const textProtocolEvidenceBundleSchemaId =
  "urn:ismail-elkorchi:textprotocol:evidence-bundle:v1" as const;
export const textProtocolProcessorTraceSchemaId =
  "urn:ismail-elkorchi:textprotocol:processor-trace:v1" as const;
export const textProtocolCorpusMetricEnvelopeSchemaId =
  "urn:ismail-elkorchi:textprotocol:corpus-metric-envelope:v1" as const;
export const textProtocolMappingLossReportSchemaId =
  "urn:ismail-elkorchi:textprotocol:mapping-loss-report:v1" as const;
export const textProtocolProtocolErrorSchemaId =
  "urn:ismail-elkorchi:textprotocol:protocol-error:v1" as const;
export const textProtocolSchemaVersion = 1 as const;

export type PackageName = typeof packageName;
export type TextProtocolResultEnvelopeSchemaId = typeof resultEnvelopeSchemaId;
export type TextProtocolResultEnvelopeSchemaVersion = typeof resultEnvelopeSchemaVersion;
export type TextProtocolResultEnvelopeJsonMediaType =
  typeof textProtocolResultEnvelopeJsonMediaType;
export type TextProtocolSchemaFamilyEnvelopeJsonMediaType =
  typeof textProtocolSchemaFamilyEnvelopeJsonMediaType;
export type TextProtocolPayloadKind =
  | typeof textProtocolPayloadKindTextdocDocumentV1
  | typeof textProtocolPayloadKindTextpipelineTraceV1
  | typeof textProtocolPayloadKindTextpipelineBatchRunReportV1
  | typeof textProtocolPayloadKindTextconformanceReportV1
  | typeof textProtocolPayloadKindVerticalSliceResultV1;
export type TextProtocolSchemaVersion = typeof textProtocolSchemaVersion;
export type TextProtocolSchemaId =
  | TextProtocolResultEnvelopeSchemaId
  | typeof textProtocolPackManifestSchemaId
  | typeof textProtocolDocumentBundleSchemaId
  | typeof textProtocolAnnotationBundleSchemaId
  | typeof textProtocolEvidenceBundleSchemaId
  | typeof textProtocolProcessorTraceSchemaId
  | typeof textProtocolCorpusMetricEnvelopeSchemaId
  | typeof textProtocolMappingLossReportSchemaId
  | typeof textProtocolProtocolErrorSchemaId;
export type TextProtocolSchemaFamily =
  | "pack-manifest"
  | "document-bundle"
  | "annotation-bundle"
  | "evidence-bundle"
  | "result-envelope"
  | "processor-trace"
  | "corpus-metric-envelope"
  | "mapping-loss-report"
  | "protocol-error";

export type TextProtocolDiagnosticSeverity = "info" | "warning" | "error";
export type TextProtocolExactnessClass = "E0" | "E1" | "E2" | "E3";
export type TextProtocolValidationStatus = "pass" | "fail";
export type TextProtocolMappingLossSeverity = "info" | "warning" | "error";

export interface TextProtocolProducerRef {
  readonly package: string;
  readonly version: string;
}

export interface TextProtocolReferenceRef {
  readonly kind: string;
  readonly id: string;
}

export interface TextProtocolSourceProvenance {
  readonly id: string;
  readonly sha256?: string;
}

export interface TextProtocolProvenance {
  readonly source?: TextProtocolSourceProvenance;
  readonly references?: readonly TextProtocolReferenceRef[];
}

export interface TextProtocolDiagnostic {
  readonly code: string;
  readonly severity: TextProtocolDiagnosticSeverity;
  readonly message?: string;
}

export interface TextProtocolPayloadKindDescriptor {
  readonly payloadKind: TextProtocolPayloadKind;
  readonly ownerPackage: string;
  readonly schemaId?: string;
  readonly schemaVersion?: string | number;
  readonly description: string;
}

export interface TextProtocolSchemaFamilyDescriptor {
  readonly family: TextProtocolSchemaFamily;
  readonly schemaId: TextProtocolSchemaId;
  readonly schemaVersion: TextProtocolSchemaVersion;
  readonly ownerPackage: string;
  readonly schemaPath: string;
  readonly description: string;
}

export interface TextProtocolEnvelopeCompatibilityOptions {
  readonly expectedPayloadKind?: TextProtocolPayloadKind;
  readonly expectedProducerPackage?: string;
  readonly requireProvenance?: boolean;
  readonly requireScopeBoundary?: boolean;
  readonly requireLimitations?: boolean;
}

export interface TextProtocolEnvelopeCompatibilityResult {
  readonly ok: boolean;
  readonly diagnostics: readonly TextProtocolDiagnostic[];
}

export interface TextProtocolVersionNegotiationResult {
  readonly ok: boolean;
  readonly schemaId: TextProtocolResultEnvelopeSchemaId;
  readonly requestedVersions: readonly number[];
  readonly supportedVersions: readonly TextProtocolResultEnvelopeSchemaVersion[];
  readonly selectedVersion?: TextProtocolResultEnvelopeSchemaVersion;
  readonly diagnostics: readonly TextProtocolDiagnostic[];
}

export interface TextProtocolSchemaFamilyValidationOptions {
  readonly expectedFamily?: TextProtocolSchemaFamily;
  readonly expectedProducerPackage?: string;
  readonly requireProvenance?: boolean;
  readonly requireLimitations?: boolean;
  readonly externallyValidatedFamilies?: readonly TextProtocolSchemaFamily[];
}

export interface TextProtocolSchemaFamilyValidationResult {
  readonly ok: boolean;
  readonly family?: TextProtocolSchemaFamily;
  readonly diagnostics: readonly TextProtocolDiagnostic[];
}

export interface TextProtocolResultEnvelopeJsonTransportV1 {
  readonly mediaType: TextProtocolResultEnvelopeJsonMediaType;
  readonly schemaId: TextProtocolResultEnvelopeSchemaId;
  readonly schemaVersion: TextProtocolResultEnvelopeSchemaVersion;
  readonly body: string;
}

export interface TextProtocolSchemaFamilyEnvelopeJsonTransportV1 {
  readonly mediaType: TextProtocolSchemaFamilyEnvelopeJsonMediaType;
  readonly schemaId: TextProtocolSchemaId;
  readonly schemaVersion: TextProtocolSchemaVersion;
  readonly family: TextProtocolSchemaFamily;
  readonly body: string;
}

export interface TextProtocolResultEnvelopeV1<
  TPayload = unknown,
  TPayloadKind extends string = string,
> {
  readonly schemaId: TextProtocolResultEnvelopeSchemaId;
  readonly schemaVersion: TextProtocolResultEnvelopeSchemaVersion;
  readonly producer: TextProtocolProducerRef;
  readonly payloadKind: TPayloadKind;
  readonly payload: TPayload;
  readonly provenance?: TextProtocolProvenance;
  readonly diagnostics?: readonly TextProtocolDiagnostic[];
  readonly scopeBoundary?: string;
  readonly limitations?: readonly string[];
}

export interface TextProtocolFamilyEnvelopeV1<TPayload = unknown, TSchemaId extends string = string> {
  readonly schemaId: TSchemaId;
  readonly schemaVersion: TextProtocolSchemaVersion;
  readonly producer: TextProtocolProducerRef;
  readonly payload: TPayload;
  readonly provenance?: TextProtocolProvenance;
  readonly diagnostics?: readonly TextProtocolDiagnostic[];
  readonly limitations?: readonly string[];
  readonly extensions?: Readonly<Record<string, unknown>>;
}

export type TextProtocolSchemaFamilyEnvelopeV1 =
  | TextProtocolFamilyEnvelopeV1
  | TextProtocolResultEnvelopeV1;

export interface TextProtocolDocumentBundleDocumentV1 {
  readonly documentId: string;
  readonly revision: string;
  readonly document: Readonly<Record<string, unknown>>;
}

export interface TextProtocolDocumentBundlePayloadV1 {
  readonly documents: readonly TextProtocolDocumentBundleDocumentV1[];
}

export type TextProtocolDocumentBundleV1 = TextProtocolFamilyEnvelopeV1<
  TextProtocolDocumentBundlePayloadV1,
  typeof textProtocolDocumentBundleSchemaId
>;

export interface TextProtocolAnnotationBundleTargetV1 {
  readonly kind: string;
  readonly documentId?: string;
  readonly viewId?: string;
  readonly annotationId?: string;
  readonly externalDocumentId?: string;
  readonly startCU?: number;
  readonly endCU?: number;
}

export interface TextProtocolAnnotationBundleAnnotationV1 {
  readonly annotationId: string;
  readonly layerId: string;
  readonly kind: string;
  readonly target: TextProtocolAnnotationBundleTargetV1;
  readonly annotation: Readonly<Record<string, unknown>>;
}

export interface TextProtocolAnnotationBundlePayloadV1 {
  readonly documentId: string;
  readonly documentRevision: string;
  readonly annotations: readonly TextProtocolAnnotationBundleAnnotationV1[];
}

export type TextProtocolAnnotationBundleV1 = TextProtocolFamilyEnvelopeV1<
  TextProtocolAnnotationBundlePayloadV1,
  typeof textProtocolAnnotationBundleSchemaId
>;

export interface TextProtocolEvidenceBundleTargetV1 {
  readonly kind: string;
  readonly id: string;
}

export interface TextProtocolEvidenceBundleRecordV1 {
  readonly id: string;
  readonly kind: string;
  readonly exactness: TextProtocolExactnessClass;
  readonly targets: readonly TextProtocolEvidenceBundleTargetV1[];
  readonly payload: Readonly<Record<string, unknown>>;
  readonly provenance: Readonly<Record<string, unknown>>;
  readonly uncertainty?: Readonly<Record<string, unknown>>;
  readonly support?: readonly TextProtocolReferenceRef[];
  readonly loss?: readonly TextProtocolMappingLossEntryV1[];
}

export interface TextProtocolEvidenceBundlePayloadV1 {
  readonly records: readonly TextProtocolEvidenceBundleRecordV1[];
}

export type TextProtocolEvidenceBundleV1 = TextProtocolFamilyEnvelopeV1<
  TextProtocolEvidenceBundlePayloadV1,
  typeof textProtocolEvidenceBundleSchemaId
>;

export interface TextProtocolProcessorTraceEntryV1 {
  readonly processorId: string;
  readonly version: string;
  readonly status: "applied" | "skipped" | "cached" | "failed";
  readonly inputRevision: string;
  readonly outputRevision: string;
  readonly emittedViews: readonly string[];
  readonly emittedLayers: readonly string[];
  readonly cacheKey?: string;
  readonly diagnostics?: readonly TextProtocolDiagnostic[];
  readonly resources?: readonly TextProtocolReferenceRef[];
  readonly parentTraceRefs?: readonly string[];
}

export interface TextProtocolProcessorTracePayloadV1 {
  readonly schemaVersion?: TextProtocolSchemaVersion;
  readonly documentId: string;
  readonly finalRevision: string;
  readonly executionMode?: "sync" | "async";
  readonly runStatus?: "complete" | "partial";
  readonly processorOrder?: readonly string[];
  readonly contextFingerprint?: string;
  readonly cachePolicy?: "none" | "read-through";
  readonly entries: readonly TextProtocolProcessorTraceEntryV1[];
}

export type TextProtocolProcessorTraceV1 = TextProtocolFamilyEnvelopeV1<
  TextProtocolProcessorTracePayloadV1,
  typeof textProtocolProcessorTraceSchemaId
>;

export interface TextProtocolCorpusMetricV1 {
  readonly metricId: string;
  readonly kind: string;
  readonly value: number | string;
  readonly unit?: string;
  readonly parameters?: Readonly<Record<string, string | number | boolean>>;
}

export interface TextProtocolCorpusMetricEnvelopePayloadV1 {
  readonly corpusId: string;
  readonly metricSetId: string;
  readonly metrics: readonly TextProtocolCorpusMetricV1[];
}

export type TextProtocolCorpusMetricEnvelopeV1 = TextProtocolFamilyEnvelopeV1<
  TextProtocolCorpusMetricEnvelopePayloadV1,
  typeof textProtocolCorpusMetricEnvelopeSchemaId
>;

export interface TextProtocolMappingLossArtifactRefV1 {
  readonly kind: string;
  readonly id: string;
  readonly schemaId?: string;
}

export interface TextProtocolMappingLossEntryV1 {
  readonly code: string;
  readonly severity: TextProtocolMappingLossSeverity;
  readonly class:
    | "offset-loss"
    | "view-loss"
    | "feature-loss"
    | "type-loss"
    | "ordering-loss"
    | "unknown-loss";
  readonly reason: string;
  readonly sourcePath?: string;
  readonly targetPath?: string;
  readonly affectedTargets?: readonly TextProtocolReferenceRef[];
}

export interface TextProtocolMappingLossReportPayloadV1 {
  readonly mappingId: string;
  readonly source: TextProtocolMappingLossArtifactRefV1;
  readonly target: TextProtocolMappingLossArtifactRefV1;
  readonly losses: readonly TextProtocolMappingLossEntryV1[];
}

export type TextProtocolMappingLossReportV1 = TextProtocolFamilyEnvelopeV1<
  TextProtocolMappingLossReportPayloadV1,
  typeof textProtocolMappingLossReportSchemaId
>;

export interface TextProtocolProtocolErrorPayloadV1 {
  readonly code: string;
  readonly severity: TextProtocolDiagnosticSeverity;
  readonly message: string;
  readonly schemaId?: string;
  readonly path?: string;
  readonly remediation?: string;
  readonly causes?: readonly TextProtocolProtocolErrorPayloadV1[];
}

export type TextProtocolProtocolErrorV1 = TextProtocolFamilyEnvelopeV1<
  TextProtocolProtocolErrorPayloadV1,
  typeof textProtocolProtocolErrorSchemaId
>;

export interface TextProtocolProtocolErrorEnvelopeOptions {
  readonly producerPackage: string;
  readonly producerVersion: string;
  readonly provenance?: TextProtocolProvenance;
  readonly diagnostics?: readonly TextProtocolDiagnostic[];
  readonly limitations?: readonly string[];
  readonly extensions?: Readonly<Record<string, unknown>>;
}

export interface TextProtocolProtocolErrorFromDiagnosticsOptions
  extends TextProtocolProtocolErrorEnvelopeOptions {
  readonly code?: string;
  readonly severity?: TextProtocolDiagnosticSeverity;
  readonly message?: string;
  readonly schemaId?: string;
  readonly path?: string;
  readonly remediation?: string;
}

export const textProtocolPayloadKindRegistry: readonly TextProtocolPayloadKindDescriptor[] = [
  {
    payloadKind: textProtocolPayloadKindTextdocDocumentV1,
    ownerPackage: "@ismail-elkorchi/textdoc",
    schemaId: "https://github.com/Ismail-elkorchi/text-computing/schemas/textdoc-document-v1.schema.json",
    schemaVersion: 1,
    description: "textdoc document annotation model v1 payload.",
  },
  {
    payloadKind: textProtocolPayloadKindTextpipelineTraceV1,
    ownerPackage: "@ismail-elkorchi/textpipeline",
    schemaId:
      "https://github.com/Ismail-elkorchi/text-computing/schemas/textpipeline-trace-v1.schema.json",
    schemaVersion: 1,
    description: "textpipeline deterministic processor trace v1 payload.",
  },
  {
    payloadKind: textProtocolPayloadKindTextpipelineBatchRunReportV1,
    ownerPackage: "@ismail-elkorchi/textpipeline",
    schemaId:
      "https://github.com/Ismail-elkorchi/text-computing/schemas/textpipeline-batch-run-report-v1.schema.json",
    schemaVersion: 1,
    description: "textpipeline deterministic batch run report v1 payload.",
  },
  {
    payloadKind: textProtocolPayloadKindTextconformanceReportV1,
    ownerPackage: "@ismail-elkorchi/textconformance",
    schemaId:
      "https://github.com/Ismail-elkorchi/text-computing/schemas/textconformance-report-v1.schema.json",
    schemaVersion: 1,
    description: "textconformance report v1 payload.",
  },
  {
    payloadKind: textProtocolPayloadKindVerticalSliceResultV1,
    ownerPackage: "text-computing",
    description: "Public Vertical Slice 0.1 result payload.",
  },
] as const;

export const textProtocolSchemaFamilyRegistry: readonly TextProtocolSchemaFamilyDescriptor[] = [
  {
    family: "pack-manifest",
    schemaId: textProtocolPackManifestSchemaId,
    schemaVersion: textProtocolSchemaVersion,
    ownerPackage: "@ismail-elkorchi/textpack",
    schemaPath: "schemas/textpack-manifest-v1.schema.json",
    description: "textpack manifest schema owned by the textpack package.",
  },
  {
    family: "document-bundle",
    schemaId: textProtocolDocumentBundleSchemaId,
    schemaVersion: textProtocolSchemaVersion,
    ownerPackage: packageName,
    schemaPath: "schemas/textprotocol-document-bundle-v1.schema.json",
    description: "Protocol envelope for exchanging one or more textdoc document revisions.",
  },
  {
    family: "annotation-bundle",
    schemaId: textProtocolAnnotationBundleSchemaId,
    schemaVersion: textProtocolSchemaVersion,
    ownerPackage: packageName,
    schemaPath: "schemas/textprotocol-annotation-bundle-v1.schema.json",
    description: "Protocol envelope for exchanging grounded annotation records.",
  },
  {
    family: "evidence-bundle",
    schemaId: textProtocolEvidenceBundleSchemaId,
    schemaVersion: textProtocolSchemaVersion,
    ownerPackage: packageName,
    schemaPath: "schemas/textprotocol-evidence-bundle-v1.schema.json",
    description: "Protocol envelope for exchanging traceable evidence records.",
  },
  {
    family: "result-envelope",
    schemaId: resultEnvelopeSchemaId,
    schemaVersion: textProtocolSchemaVersion,
    ownerPackage: packageName,
    schemaPath: "schemas/textprotocol-result-envelope-v1.schema.json",
    description: "Protocol result envelope for package outputs.",
  },
  {
    family: "processor-trace",
    schemaId: textProtocolProcessorTraceSchemaId,
    schemaVersion: textProtocolSchemaVersion,
    ownerPackage: packageName,
    schemaPath: "schemas/textprotocol-processor-trace-v1.schema.json",
    description: "Protocol envelope for pipeline processor trace lineage.",
  },
  {
    family: "corpus-metric-envelope",
    schemaId: textProtocolCorpusMetricEnvelopeSchemaId,
    schemaVersion: textProtocolSchemaVersion,
    ownerPackage: packageName,
    schemaPath: "schemas/textprotocol-corpus-metric-envelope-v1.schema.json",
    description: "Protocol envelope for corpus and retrieval metrics.",
  },
  {
    family: "mapping-loss-report",
    schemaId: textProtocolMappingLossReportSchemaId,
    schemaVersion: textProtocolSchemaVersion,
    ownerPackage: packageName,
    schemaPath: "schemas/textprotocol-mapping-loss-report-v1.schema.json",
    description: "Protocol envelope for structural mapping loss reports.",
  },
  {
    family: "protocol-error",
    schemaId: textProtocolProtocolErrorSchemaId,
    schemaVersion: textProtocolSchemaVersion,
    ownerPackage: packageName,
    schemaPath: "schemas/textprotocol-protocol-error-v1.schema.json",
    description: "Protocol envelope for machine-readable interchange errors.",
  },
] as const;

export const textProtocolSupportedResultEnvelopeSchemaVersions: readonly TextProtocolResultEnvelopeSchemaVersion[] =
  [resultEnvelopeSchemaVersion] as const;

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

function isNonEmptyStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((entry) => isNonEmptyString(entry));
}

function isStringNumberBooleanRecord(
  value: unknown,
): value is Readonly<Record<string, string | number | boolean>> {
  return (
    isRecord(value) &&
    Object.values(value).every(
      (entry) =>
        typeof entry === "string" ||
        (typeof entry === "number" && Number.isFinite(entry)) ||
        typeof entry === "boolean",
    )
  );
}

export function isTextProtocolPayloadKind(value: unknown): value is TextProtocolPayloadKind {
  return textProtocolPayloadKindRegistry.some((entry) => entry.payloadKind === value);
}

export function getTextProtocolPayloadKindDescriptor(
  payloadKind: string,
): TextProtocolPayloadKindDescriptor | undefined {
  return textProtocolPayloadKindRegistry.find((entry) => entry.payloadKind === payloadKind);
}

export function isTextProtocolSchemaFamily(value: unknown): value is TextProtocolSchemaFamily {
  return (
    typeof value === "string" &&
    textProtocolSchemaFamilyRegistry.some((entry) => entry.family === value)
  );
}

export function isTextProtocolSchemaId(value: unknown): value is TextProtocolSchemaId {
  return (
    typeof value === "string" &&
    textProtocolSchemaFamilyRegistry.some((entry) => entry.schemaId === value)
  );
}

export function getTextProtocolSchemaFamilyDescriptor(
  family: TextProtocolSchemaFamily,
): TextProtocolSchemaFamilyDescriptor;
export function getTextProtocolSchemaFamilyDescriptor(
  family: string,
): TextProtocolSchemaFamilyDescriptor | undefined;
export function getTextProtocolSchemaFamilyDescriptor(
  family: string,
): TextProtocolSchemaFamilyDescriptor | undefined {
  return textProtocolSchemaFamilyRegistry.find((entry) => entry.family === family);
}

export function getTextProtocolSchemaFamilyDescriptorBySchemaId(
  schemaId: string,
): TextProtocolSchemaFamilyDescriptor | undefined {
  return textProtocolSchemaFamilyRegistry.find((entry) => entry.schemaId === schemaId);
}

export function isTextProtocolProducerRef(value: unknown): value is TextProtocolProducerRef {
  return (
    isRecord(value) &&
    isNonEmptyString(value.package) &&
    isNonEmptyString(value.version)
  );
}

export function isTextProtocolReferenceRef(value: unknown): value is TextProtocolReferenceRef {
  return isRecord(value) && isNonEmptyString(value.kind) && isNonEmptyString(value.id);
}

export function isTextProtocolSourceProvenance(
  value: unknown,
): value is TextProtocolSourceProvenance {
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    (value.sha256 === undefined || isNonEmptyString(value.sha256))
  );
}

export function isTextProtocolProvenance(value: unknown): value is TextProtocolProvenance {
  return (
    isRecord(value) &&
    (value.source === undefined || isTextProtocolSourceProvenance(value.source)) &&
    (value.references === undefined ||
      (Array.isArray(value.references) &&
        value.references.every((entry) => isTextProtocolReferenceRef(entry))))
  );
}

export function isTextProtocolDiagnostic(value: unknown): value is TextProtocolDiagnostic {
  return (
    isRecord(value) &&
    isNonEmptyString(value.code) &&
    (value.severity === "info" || value.severity === "warning" || value.severity === "error") &&
    (value.message === undefined || isNonEmptyString(value.message))
  );
}

function isTextProtocolCommonFamilyEnvelope(
  value: unknown,
  schemaId: TextProtocolSchemaId,
): value is TextProtocolFamilyEnvelopeV1 {
  return (
    isRecord(value) &&
    value.schemaId === schemaId &&
    value.schemaVersion === textProtocolSchemaVersion &&
    isTextProtocolProducerRef(value.producer) &&
    "payload" in value &&
    (value.provenance === undefined || isTextProtocolProvenance(value.provenance)) &&
    (value.diagnostics === undefined ||
      (Array.isArray(value.diagnostics) &&
        value.diagnostics.every((entry) => isTextProtocolDiagnostic(entry)))) &&
    (value.limitations === undefined || isStringArray(value.limitations)) &&
    (value.extensions === undefined || isRecord(value.extensions))
  );
}

function isDocumentBundleDocument(
  value: unknown,
): value is TextProtocolDocumentBundleDocumentV1 {
  return (
    isRecord(value) &&
    isNonEmptyString(value.documentId) &&
    isNonEmptyString(value.revision) &&
    isRecord(value.document)
  );
}

function isAnnotationBundleTarget(
  value: unknown,
): value is TextProtocolAnnotationBundleTargetV1 {
  return (
    isRecord(value) &&
    isNonEmptyString(value.kind) &&
    (value.documentId === undefined || isNonEmptyString(value.documentId)) &&
    (value.viewId === undefined || isNonEmptyString(value.viewId)) &&
    (value.annotationId === undefined || isNonEmptyString(value.annotationId)) &&
    (value.externalDocumentId === undefined || isNonEmptyString(value.externalDocumentId)) &&
    (value.startCU === undefined || isNonNegativeInteger(value.startCU)) &&
    (value.endCU === undefined || isNonNegativeInteger(value.endCU)) &&
    (value.startCU === undefined ||
      value.endCU === undefined ||
      (typeof value.startCU === "number" &&
        typeof value.endCU === "number" &&
        value.startCU <= value.endCU))
  );
}

function isAnnotationBundleAnnotation(
  value: unknown,
): value is TextProtocolAnnotationBundleAnnotationV1 {
  return (
    isRecord(value) &&
    isNonEmptyString(value.annotationId) &&
    isNonEmptyString(value.layerId) &&
    isNonEmptyString(value.kind) &&
    isAnnotationBundleTarget(value.target) &&
    isRecord(value.annotation)
  );
}

function isEvidenceBundleTarget(value: unknown): value is TextProtocolEvidenceBundleTargetV1 {
  return isRecord(value) && isNonEmptyString(value.kind) && isNonEmptyString(value.id);
}

function isExactnessClass(value: unknown): value is TextProtocolExactnessClass {
  return value === "E0" || value === "E1" || value === "E2" || value === "E3";
}

function isMappingLossClass(value: unknown): value is TextProtocolMappingLossEntryV1["class"] {
  return (
    value === "offset-loss" ||
    value === "view-loss" ||
    value === "feature-loss" ||
    value === "type-loss" ||
    value === "ordering-loss" ||
    value === "unknown-loss"
  );
}

function isMappingLossSeverity(value: unknown): value is TextProtocolMappingLossSeverity {
  return value === "info" || value === "warning" || value === "error";
}

function isMappingLossArtifactRef(value: unknown): value is TextProtocolMappingLossArtifactRefV1 {
  return (
    isRecord(value) &&
    isNonEmptyString(value.kind) &&
    isNonEmptyString(value.id) &&
    (value.schemaId === undefined || isNonEmptyString(value.schemaId))
  );
}

function isMappingLossEntry(value: unknown): value is TextProtocolMappingLossEntryV1 {
  return (
    isRecord(value) &&
    isNonEmptyString(value.code) &&
    isMappingLossSeverity(value.severity) &&
    isMappingLossClass(value.class) &&
    isNonEmptyString(value.reason) &&
    (value.sourcePath === undefined || isNonEmptyString(value.sourcePath)) &&
    (value.targetPath === undefined || isNonEmptyString(value.targetPath)) &&
    (value.affectedTargets === undefined ||
      (Array.isArray(value.affectedTargets) &&
        value.affectedTargets.every((entry) => isTextProtocolReferenceRef(entry))))
  );
}

function isEvidenceBundleRecord(value: unknown): value is TextProtocolEvidenceBundleRecordV1 {
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.kind) &&
    isExactnessClass(value.exactness) &&
    Array.isArray(value.targets) &&
    value.targets.every((entry) => isEvidenceBundleTarget(entry)) &&
    isRecord(value.payload) &&
    isRecord(value.provenance) &&
    (value.uncertainty === undefined || isRecord(value.uncertainty)) &&
    (value.support === undefined ||
      (Array.isArray(value.support) &&
        value.support.every((entry) => isTextProtocolReferenceRef(entry)))) &&
    (value.loss === undefined ||
      (Array.isArray(value.loss) && value.loss.every((entry) => isMappingLossEntry(entry))))
  );
}

function isProcessorTraceEntry(value: unknown): value is TextProtocolProcessorTraceEntryV1 {
  return (
    isRecord(value) &&
    isNonEmptyString(value.processorId) &&
    isNonEmptyString(value.version) &&
    (value.status === "applied" ||
      value.status === "skipped" ||
      value.status === "cached" ||
      value.status === "failed") &&
    isNonEmptyString(value.inputRevision) &&
    isNonEmptyString(value.outputRevision) &&
    isNonEmptyStringArray(value.emittedViews) &&
    isNonEmptyStringArray(value.emittedLayers) &&
    (value.cacheKey === undefined || isNonEmptyString(value.cacheKey)) &&
    (value.diagnostics === undefined ||
      (Array.isArray(value.diagnostics) &&
        value.diagnostics.every((entry) => isTextProtocolDiagnostic(entry)))) &&
    (value.resources === undefined ||
      (Array.isArray(value.resources) &&
        value.resources.every((entry) => isTextProtocolReferenceRef(entry)))) &&
    (value.parentTraceRefs === undefined || isNonEmptyStringArray(value.parentTraceRefs))
  );
}

function isCorpusMetric(value: unknown): value is TextProtocolCorpusMetricV1 {
  return (
    isRecord(value) &&
    isNonEmptyString(value.metricId) &&
    isNonEmptyString(value.kind) &&
    ((typeof value.value === "number" && Number.isFinite(value.value)) ||
      typeof value.value === "string") &&
    (value.unit === undefined || isNonEmptyString(value.unit)) &&
    (value.parameters === undefined || isStringNumberBooleanRecord(value.parameters))
  );
}

function isProtocolErrorPayload(value: unknown): value is TextProtocolProtocolErrorPayloadV1 {
  return (
    isRecord(value) &&
    isNonEmptyString(value.code) &&
    (value.severity === "info" || value.severity === "warning" || value.severity === "error") &&
    isNonEmptyString(value.message) &&
    (value.schemaId === undefined || isNonEmptyString(value.schemaId)) &&
    (value.path === undefined || isNonEmptyString(value.path)) &&
    (value.remediation === undefined || isNonEmptyString(value.remediation)) &&
    (value.causes === undefined ||
      (Array.isArray(value.causes) && value.causes.every((entry) => isProtocolErrorPayload(entry))))
  );
}

export function isTextProtocolDocumentBundleV1(
  value: unknown,
): value is TextProtocolDocumentBundleV1 {
  return (
    isTextProtocolCommonFamilyEnvelope(value, textProtocolDocumentBundleSchemaId) &&
    isRecord(value.payload) &&
    Array.isArray(value.payload.documents) &&
    value.payload.documents.length > 0 &&
    value.payload.documents.every((entry) => isDocumentBundleDocument(entry))
  );
}

export function isTextProtocolAnnotationBundleV1(
  value: unknown,
): value is TextProtocolAnnotationBundleV1 {
  return (
    isTextProtocolCommonFamilyEnvelope(value, textProtocolAnnotationBundleSchemaId) &&
    isRecord(value.payload) &&
    isNonEmptyString(value.payload.documentId) &&
    isNonEmptyString(value.payload.documentRevision) &&
    Array.isArray(value.payload.annotations) &&
    value.payload.annotations.every((entry) => isAnnotationBundleAnnotation(entry))
  );
}

export function isTextProtocolEvidenceBundleV1(
  value: unknown,
): value is TextProtocolEvidenceBundleV1 {
  return (
    isTextProtocolCommonFamilyEnvelope(value, textProtocolEvidenceBundleSchemaId) &&
    isRecord(value.payload) &&
    Array.isArray(value.payload.records) &&
    value.payload.records.every((entry) => isEvidenceBundleRecord(entry))
  );
}

export function isTextProtocolProcessorTraceV1(
  value: unknown,
): value is TextProtocolProcessorTraceV1 {
  return (
    isTextProtocolCommonFamilyEnvelope(value, textProtocolProcessorTraceSchemaId) &&
    isRecord(value.payload) &&
    (value.payload.schemaVersion === undefined ||
      value.payload.schemaVersion === textProtocolSchemaVersion) &&
    isNonEmptyString(value.payload.documentId) &&
    isNonEmptyString(value.payload.finalRevision) &&
    (value.payload.executionMode === undefined ||
      value.payload.executionMode === "sync" ||
      value.payload.executionMode === "async") &&
    (value.payload.runStatus === undefined ||
      value.payload.runStatus === "complete" ||
      value.payload.runStatus === "partial") &&
    (value.payload.processorOrder === undefined ||
      isNonEmptyStringArray(value.payload.processorOrder)) &&
    (value.payload.contextFingerprint === undefined ||
      isNonEmptyString(value.payload.contextFingerprint)) &&
    (value.payload.cachePolicy === undefined ||
      value.payload.cachePolicy === "none" ||
      value.payload.cachePolicy === "read-through") &&
    Array.isArray(value.payload.entries) &&
    value.payload.entries.every((entry) => isProcessorTraceEntry(entry))
  );
}

export function isTextProtocolCorpusMetricEnvelopeV1(
  value: unknown,
): value is TextProtocolCorpusMetricEnvelopeV1 {
  return (
    isTextProtocolCommonFamilyEnvelope(value, textProtocolCorpusMetricEnvelopeSchemaId) &&
    isRecord(value.payload) &&
    isNonEmptyString(value.payload.corpusId) &&
    isNonEmptyString(value.payload.metricSetId) &&
    Array.isArray(value.payload.metrics) &&
    value.payload.metrics.every((entry) => isCorpusMetric(entry))
  );
}

export function isTextProtocolMappingLossReportV1(
  value: unknown,
): value is TextProtocolMappingLossReportV1 {
  return (
    isTextProtocolCommonFamilyEnvelope(value, textProtocolMappingLossReportSchemaId) &&
    isRecord(value.payload) &&
    isNonEmptyString(value.payload.mappingId) &&
    isMappingLossArtifactRef(value.payload.source) &&
    isMappingLossArtifactRef(value.payload.target) &&
    Array.isArray(value.payload.losses) &&
    value.payload.losses.every((entry) => isMappingLossEntry(entry))
  );
}

export function isTextProtocolProtocolErrorV1(
  value: unknown,
): value is TextProtocolProtocolErrorV1 {
  return (
    isTextProtocolCommonFamilyEnvelope(value, textProtocolProtocolErrorSchemaId) &&
    isProtocolErrorPayload(value.payload)
  );
}

function textProtocolDiagnosticSeverityRank(severity: TextProtocolDiagnosticSeverity): number {
  if (severity === "error") return 3;
  if (severity === "warning") return 2;
  return 1;
}

function textProtocolWorstDiagnosticSeverity(
  diagnostics: readonly TextProtocolDiagnostic[],
): TextProtocolDiagnosticSeverity {
  return diagnostics.reduce<TextProtocolDiagnosticSeverity>(
    (selected, diagnostic) =>
      textProtocolDiagnosticSeverityRank(diagnostic.severity) > textProtocolDiagnosticSeverityRank(selected)
        ? diagnostic.severity
        : selected,
    "info",
  );
}

function textProtocolDiagnosticMessage(diagnostic: TextProtocolDiagnostic): string {
  return diagnostic.message ?? diagnostic.code;
}

function textProtocolProtocolErrorPayloadFromDiagnostic(
  diagnostic: TextProtocolDiagnostic,
  options: Pick<TextProtocolProtocolErrorFromDiagnosticsOptions, "schemaId" | "path" | "remediation"> = {},
): TextProtocolProtocolErrorPayloadV1 {
  return {
    code: diagnostic.code,
    severity: diagnostic.severity,
    message: textProtocolDiagnosticMessage(diagnostic),
    ...(options.schemaId === undefined ? {} : { schemaId: options.schemaId }),
    ...(options.path === undefined ? {} : { path: options.path }),
    ...(options.remediation === undefined ? {} : { remediation: options.remediation }),
  };
}

export function createTextProtocolProtocolErrorPayloadFromDiagnostics(
  diagnostics: readonly TextProtocolDiagnostic[],
  options: Pick<
    TextProtocolProtocolErrorFromDiagnosticsOptions,
    "code" | "severity" | "message" | "schemaId" | "path" | "remediation"
  > = {},
): TextProtocolProtocolErrorPayloadV1 {
  if (!Array.isArray(diagnostics) || diagnostics.length === 0) {
    throw new TypeError("textprotocol protocol-error payload requires at least one diagnostic");
  }
  if (!diagnostics.every((entry) => isTextProtocolDiagnostic(entry))) {
    throw new TypeError("textprotocol protocol-error payload diagnostics are invalid");
  }
  const firstDiagnostic = diagnostics[0];
  if (firstDiagnostic === undefined) {
    throw new TypeError("textprotocol protocol-error payload requires at least one diagnostic");
  }
  const causeOptions = {
    ...(options.schemaId === undefined ? {} : { schemaId: options.schemaId }),
    ...(options.path === undefined ? {} : { path: options.path }),
    ...(options.remediation === undefined ? {} : { remediation: options.remediation }),
  };
  const payload = {
    code: options.code ?? firstDiagnostic.code,
    severity: options.severity ?? textProtocolWorstDiagnosticSeverity(diagnostics),
    message: options.message ?? textProtocolDiagnosticMessage(firstDiagnostic),
    ...(options.schemaId === undefined ? {} : { schemaId: options.schemaId }),
    ...(options.path === undefined ? {} : { path: options.path }),
    ...(options.remediation === undefined ? {} : { remediation: options.remediation }),
    causes: diagnostics.map((diagnostic) =>
      textProtocolProtocolErrorPayloadFromDiagnostic(diagnostic, causeOptions),
    ),
  };
  if (!isProtocolErrorPayload(payload)) {
    throw new TypeError("textprotocol protocol-error payload could not be produced");
  }
  return payload;
}

export function createTextProtocolProtocolErrorEnvelopeV1(
  payload: TextProtocolProtocolErrorPayloadV1,
  options: TextProtocolProtocolErrorEnvelopeOptions,
): TextProtocolProtocolErrorV1 {
  const envelope = {
    schemaId: textProtocolProtocolErrorSchemaId,
    schemaVersion: textProtocolSchemaVersion,
    producer: {
      package: options.producerPackage,
      version: options.producerVersion,
    },
    payload,
    ...(options.provenance === undefined ? {} : { provenance: options.provenance }),
    ...(options.diagnostics === undefined ? {} : { diagnostics: options.diagnostics }),
    ...(options.limitations === undefined ? {} : { limitations: options.limitations }),
    ...(options.extensions === undefined ? {} : { extensions: options.extensions }),
  };
  if (!isTextProtocolProtocolErrorV1(envelope)) {
    throw new TypeError("textprotocol protocol-error envelope could not be produced");
  }
  return envelope;
}

export function createTextProtocolProtocolErrorEnvelopeFromDiagnostics(
  diagnostics: readonly TextProtocolDiagnostic[],
  options: TextProtocolProtocolErrorFromDiagnosticsOptions,
): TextProtocolProtocolErrorV1 {
  return createTextProtocolProtocolErrorEnvelopeV1(
    createTextProtocolProtocolErrorPayloadFromDiagnostics(diagnostics, options),
    options,
  );
}

function compatibilityError(code: string, message: string): TextProtocolDiagnostic {
  return { code, severity: "error", message };
}

function hasErrorDiagnostics(diagnostics: readonly TextProtocolDiagnostic[]): boolean {
  return diagnostics.some((entry) => entry.severity === "error");
}

function familyGuardForDescriptor(
  descriptor: TextProtocolSchemaFamilyDescriptor,
): ((value: unknown) => boolean) | undefined {
  switch (descriptor.family) {
    case "document-bundle":
      return isTextProtocolDocumentBundleV1;
    case "annotation-bundle":
      return isTextProtocolAnnotationBundleV1;
    case "evidence-bundle":
      return isTextProtocolEvidenceBundleV1;
    case "result-envelope":
      return isTextProtocolResultEnvelopeV1;
    case "processor-trace":
      return isTextProtocolProcessorTraceV1;
    case "corpus-metric-envelope":
      return isTextProtocolCorpusMetricEnvelopeV1;
    case "mapping-loss-report":
      return isTextProtocolMappingLossReportV1;
    case "protocol-error":
      return isTextProtocolProtocolErrorV1;
    case "pack-manifest":
      return undefined;
  }
}

function isExternallyValidatedFamily(
  descriptor: TextProtocolSchemaFamilyDescriptor,
  options: TextProtocolSchemaFamilyValidationOptions,
): boolean {
  return options.externallyValidatedFamilies?.includes(descriptor.family) === true;
}

function uniqueSortedNumbers(values: readonly number[]): readonly number[] {
  return [...new Set(values)].sort((left, right) => right - left);
}

function compareStableJsonKeys(left: string, right: string): number {
  return left.localeCompare(right);
}

function stableJsonStringifyValue(value: unknown, seen: WeakSet<object>): string {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new TypeError("textprotocol JSON transport cannot serialize non-finite numbers");
    }
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableJsonStringifyValue(entry, seen)).join(",")}]`;
  }
  if (typeof value === "object") {
    if (seen.has(value)) {
      throw new TypeError("textprotocol JSON transport cannot serialize cyclic values");
    }
    seen.add(value);
    const objectEntries = Object.entries(value);
    for (const [key, entry] of objectEntries) {
      if (entry === undefined) {
        throw new TypeError(
          `textprotocol JSON transport cannot serialize undefined object property ${key}`,
        );
      }
    }
    const entries = objectEntries
      .sort(([left], [right]) => compareStableJsonKeys(left, right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableJsonStringifyValue(entry, seen)}`);
    seen.delete(value);
    return `{${entries.join(",")}}`;
  }
  throw new TypeError(`textprotocol JSON transport cannot serialize ${typeof value}`);
}

export function canonicalizeTextProtocolJson(value: unknown): string {
  return stableJsonStringifyValue(value, new WeakSet());
}

export function checkTextProtocolSchemaFamilyEnvelope(
  value: unknown,
  options: TextProtocolSchemaFamilyValidationOptions = {},
): TextProtocolSchemaFamilyValidationResult {
  const diagnostics: TextProtocolDiagnostic[] = [];

  if (!isRecord(value)) {
    return {
      ok: false,
      diagnostics: [
        compatibilityError("textprotocol.schema-family-not-object", "Protocol value must be an object."),
      ],
    };
  }

  if (!isNonEmptyString(value.schemaId)) {
    diagnostics.push(
      compatibilityError("textprotocol.schema-family-schema-id", "Protocol schemaId is required."),
    );
  }

  const descriptor =
    typeof value.schemaId === "string"
      ? getTextProtocolSchemaFamilyDescriptorBySchemaId(value.schemaId)
      : undefined;
  if (descriptor === undefined) {
    diagnostics.push(
      compatibilityError(
        "textprotocol.schema-family-unregistered",
        "Protocol schemaId is not registered.",
      ),
    );
  }

  if (
    options.expectedFamily !== undefined &&
    descriptor !== undefined &&
    descriptor.family !== options.expectedFamily
  ) {
    diagnostics.push(
      compatibilityError(
        "textprotocol.schema-family-expected",
        `Protocol schema family must be ${options.expectedFamily}.`,
      ),
    );
  }

  if (value.schemaVersion !== textProtocolSchemaVersion) {
    diagnostics.push(
      compatibilityError(
        "textprotocol.schema-family-version",
        `Protocol schemaVersion must be ${textProtocolSchemaVersion}.`,
      ),
    );
  }

  if (!isTextProtocolProducerRef(value.producer)) {
    diagnostics.push(
      compatibilityError(
        "textprotocol.schema-family-producer",
        "Protocol producer must declare non-empty package and version.",
      ),
    );
  } else if (
    options.expectedProducerPackage !== undefined &&
    value.producer.package !== options.expectedProducerPackage
  ) {
    diagnostics.push(
      compatibilityError(
        "textprotocol.schema-family-producer-package",
        `Protocol producer package must be ${options.expectedProducerPackage}.`,
      ),
    );
  }

  if (!("payload" in value)) {
    diagnostics.push(
      compatibilityError("textprotocol.schema-family-payload", "Protocol payload is required."),
    );
  }

  if (value.provenance === undefined) {
    if (options.requireProvenance === true) {
      diagnostics.push(
        compatibilityError(
          "textprotocol.schema-family-provenance-missing",
          "Protocol provenance is required.",
        ),
      );
    }
  } else if (!isTextProtocolProvenance(value.provenance)) {
    diagnostics.push(
      compatibilityError(
        "textprotocol.schema-family-provenance",
        "Protocol provenance is invalid.",
      ),
    );
  }

  if (
    value.diagnostics !== undefined &&
    (!Array.isArray(value.diagnostics) ||
      !value.diagnostics.every((entry: unknown) => isTextProtocolDiagnostic(entry)))
  ) {
    diagnostics.push(
      compatibilityError(
        "textprotocol.schema-family-diagnostics",
        "Protocol diagnostics are invalid.",
      ),
    );
  }

  if (value.limitations === undefined) {
    if (options.requireLimitations === true) {
      diagnostics.push(
        compatibilityError(
          "textprotocol.schema-family-limitations-missing",
          "Protocol limitations are required.",
        ),
      );
    }
  } else if (!isStringArray(value.limitations)) {
    diagnostics.push(
      compatibilityError(
        "textprotocol.schema-family-limitations",
        "Protocol limitations are invalid.",
      ),
    );
  }

  if (value.extensions !== undefined && !isRecord(value.extensions)) {
    diagnostics.push(
      compatibilityError(
        "textprotocol.schema-family-extensions",
        "Protocol extensions must be an object.",
      ),
    );
  }

  if (descriptor !== undefined) {
    const guard = familyGuardForDescriptor(descriptor);
    if (guard === undefined) {
      if (isExternallyValidatedFamily(descriptor, options)) {
        diagnostics.push({
          code: "textprotocol.schema-family-external-validation",
          severity: "info",
          message: `Schema family ${descriptor.family} is owned by ${descriptor.ownerPackage} and was asserted as externally validated by the caller.`,
        });
      } else {
        diagnostics.push(
          compatibilityError(
            "textprotocol.schema-family-external-validation",
            `Schema family ${descriptor.family} is owned by ${descriptor.ownerPackage} and is validated by its JSON Schema.`,
          ),
        );
      }
    } else if (!guard(value)) {
      diagnostics.push(
        compatibilityError(
          "textprotocol.schema-family-payload-shape",
          `Protocol value does not match ${descriptor.family} payload requirements.`,
        ),
      );
    }
  }

  return {
    ok: !hasErrorDiagnostics(diagnostics),
    ...(descriptor === undefined ? {} : { family: descriptor.family }),
    diagnostics,
  };
}

export function isTextProtocolResultEnvelopeV1(
  value: unknown,
): value is TextProtocolResultEnvelopeV1 {
  return (
    isRecord(value) &&
    value.schemaId === resultEnvelopeSchemaId &&
    value.schemaVersion === resultEnvelopeSchemaVersion &&
    isTextProtocolProducerRef(value.producer) &&
    isNonEmptyString(value.payloadKind) &&
    "payload" in value &&
    (value.provenance === undefined || isTextProtocolProvenance(value.provenance)) &&
    (value.diagnostics === undefined ||
      (Array.isArray(value.diagnostics) &&
        value.diagnostics.every((entry) => isTextProtocolDiagnostic(entry)))) &&
    (value.scopeBoundary === undefined || isNonEmptyString(value.scopeBoundary)) &&
    (value.limitations === undefined || isStringArray(value.limitations))
  );
}

export function isTextProtocolResultEnvelopeForPayloadKind<
  TPayloadKind extends TextProtocolPayloadKind,
>(
  value: unknown,
  payloadKind: TPayloadKind,
): value is TextProtocolResultEnvelopeV1<unknown, TPayloadKind> {
  return isTextProtocolResultEnvelopeV1(value) && value.payloadKind === payloadKind;
}

export function negotiateTextProtocolResultEnvelopeVersion(
  requestedVersions: readonly number[],
): TextProtocolVersionNegotiationResult {
  const diagnostics: TextProtocolDiagnostic[] = [];
  const requested = uniqueSortedNumbers(requestedVersions);
  if (requested.length === 0) {
    diagnostics.push(
      compatibilityError(
        "textprotocol.version-request-empty",
        "At least one requested result-envelope schema version is required.",
      ),
    );
  }
  for (const version of requested) {
    if (!Number.isInteger(version) || version <= 0) {
      diagnostics.push(
        compatibilityError(
          "textprotocol.version-request-invalid",
          "Requested result-envelope schema versions must be positive integers.",
        ),
      );
    }
  }
  const selectedVersion = requested.find((version) =>
    textProtocolSupportedResultEnvelopeSchemaVersions.includes(
      version as TextProtocolResultEnvelopeSchemaVersion,
    ),
  ) as TextProtocolResultEnvelopeSchemaVersion | undefined;
  if (selectedVersion === undefined && diagnostics.length === 0) {
    diagnostics.push(
      compatibilityError(
        "textprotocol.version-unsupported",
        `No requested result-envelope schema version is supported. Supported versions: ${textProtocolSupportedResultEnvelopeSchemaVersions.join(", ")}.`,
      ),
    );
  }
  return {
    ok: selectedVersion !== undefined && !hasErrorDiagnostics(diagnostics),
    schemaId: resultEnvelopeSchemaId,
    requestedVersions: requested,
    supportedVersions: textProtocolSupportedResultEnvelopeSchemaVersions,
    ...(selectedVersion === undefined ? {} : { selectedVersion }),
    diagnostics,
  };
}

export function isTextProtocolResultEnvelopeJsonTransportV1(
  value: unknown,
): value is TextProtocolResultEnvelopeJsonTransportV1 {
  return (
    isRecord(value) &&
    value.mediaType === textProtocolResultEnvelopeJsonMediaType &&
    value.schemaId === resultEnvelopeSchemaId &&
    value.schemaVersion === resultEnvelopeSchemaVersion &&
    typeof value.body === "string"
  );
}

export function isTextProtocolSchemaFamilyEnvelopeJsonTransportV1(
  value: unknown,
): value is TextProtocolSchemaFamilyEnvelopeJsonTransportV1 {
  if (
    !isRecord(value) ||
    value.mediaType !== textProtocolSchemaFamilyEnvelopeJsonMediaType ||
    !isTextProtocolSchemaId(value.schemaId) ||
    value.schemaVersion !== textProtocolSchemaVersion ||
    !isTextProtocolSchemaFamily(value.family) ||
    !isNonEmptyString(value.body)
  ) {
    return false;
  }
  const descriptor = getTextProtocolSchemaFamilyDescriptorBySchemaId(value.schemaId);
  return descriptor !== undefined && descriptor.family === value.family;
}

export function checkTextProtocolResultEnvelopeCompatibility(
  value: unknown,
  options: TextProtocolEnvelopeCompatibilityOptions = {},
): TextProtocolEnvelopeCompatibilityResult {
  const diagnostics: TextProtocolDiagnostic[] = [];

  if (!isRecord(value)) {
    return {
      ok: false,
      diagnostics: [
        compatibilityError("textprotocol.envelope-not-object", "Result envelope must be an object."),
      ],
    };
  }

  if (value.schemaId !== resultEnvelopeSchemaId) {
    diagnostics.push(
      compatibilityError(
        "textprotocol.schema-id",
        `Result envelope schemaId must be ${resultEnvelopeSchemaId}.`,
      ),
    );
  }

  if (value.schemaVersion !== resultEnvelopeSchemaVersion) {
    diagnostics.push(
      compatibilityError(
        "textprotocol.schema-version",
        `Result envelope schemaVersion must be ${resultEnvelopeSchemaVersion}.`,
      ),
    );
  }

  if (!isTextProtocolProducerRef(value.producer)) {
    diagnostics.push(
      compatibilityError(
        "textprotocol.producer",
        "Result envelope producer must declare non-empty package and version.",
      ),
    );
  } else if (
    options.expectedProducerPackage !== undefined &&
    value.producer.package !== options.expectedProducerPackage
  ) {
    diagnostics.push(
      compatibilityError(
        "textprotocol.producer-package",
        `Result envelope producer package must be ${options.expectedProducerPackage}.`,
      ),
    );
  }

  if (!isNonEmptyString(value.payloadKind)) {
    diagnostics.push(
      compatibilityError("textprotocol.payload-kind", "Result envelope payloadKind must be non-empty."),
    );
  } else {
    if (!isTextProtocolPayloadKind(value.payloadKind)) {
      diagnostics.push(
        compatibilityError(
          "textprotocol.payload-kind-unregistered",
          `Result envelope payloadKind ${value.payloadKind} is not registered.`,
        ),
      );
    }
    if (
      options.expectedPayloadKind !== undefined &&
      value.payloadKind !== options.expectedPayloadKind
    ) {
      diagnostics.push(
        compatibilityError(
          "textprotocol.payload-kind-expected",
          `Result envelope payloadKind must be ${options.expectedPayloadKind}.`,
        ),
      );
    }
  }

  if (!("payload" in value)) {
    diagnostics.push(
      compatibilityError("textprotocol.payload-missing", "Result envelope payload is required."),
    );
  }

  if (value.provenance === undefined) {
    if (options.requireProvenance === true) {
      diagnostics.push(
        compatibilityError("textprotocol.provenance-missing", "Result envelope provenance is required."),
      );
    }
  } else if (!isTextProtocolProvenance(value.provenance)) {
    diagnostics.push(
      compatibilityError("textprotocol.provenance", "Result envelope provenance is invalid."),
    );
  }

  if (
    value.diagnostics !== undefined &&
    (!Array.isArray(value.diagnostics) ||
      !value.diagnostics.every((entry: unknown) => isTextProtocolDiagnostic(entry)))
  ) {
    diagnostics.push(
      compatibilityError("textprotocol.diagnostics", "Result envelope diagnostics are invalid."),
    );
  }

  if (value.scopeBoundary === undefined) {
    if (options.requireScopeBoundary === true) {
      diagnostics.push(
        compatibilityError(
          "textprotocol.scope-boundary-missing",
          "Result envelope scopeBoundary is required.",
        ),
      );
    }
  } else if (!isNonEmptyString(value.scopeBoundary)) {
    diagnostics.push(
      compatibilityError("textprotocol.scope-boundary", "Result envelope scopeBoundary is invalid."),
    );
  }

  if (value.limitations === undefined) {
    if (options.requireLimitations === true) {
      diagnostics.push(
        compatibilityError("textprotocol.limitations-missing", "Result envelope limitations are required."),
      );
    }
  } else if (!isStringArray(value.limitations)) {
    diagnostics.push(
      compatibilityError("textprotocol.limitations", "Result envelope limitations are invalid."),
    );
  }

  return {
    ok: !hasErrorDiagnostics(diagnostics),
    diagnostics,
  };
}

export function serializeTextProtocolResultEnvelopeJson(
  value: TextProtocolResultEnvelopeV1,
  options: TextProtocolEnvelopeCompatibilityOptions = {},
): TextProtocolResultEnvelopeJsonTransportV1 {
  const compatibility = checkTextProtocolResultEnvelopeCompatibility(value, options);
  if (!compatibility.ok) {
    throw new TypeError(
      `Cannot serialize incompatible textprotocol result envelope: ${compatibility.diagnostics
        .map((entry) => entry.code)
        .join(", ")}`,
    );
  }
  return {
    mediaType: textProtocolResultEnvelopeJsonMediaType,
    schemaId: resultEnvelopeSchemaId,
    schemaVersion: resultEnvelopeSchemaVersion,
    body: canonicalizeTextProtocolJson(value),
  };
}

export function parseTextProtocolResultEnvelopeJson(
  transport: TextProtocolResultEnvelopeJsonTransportV1,
  options: TextProtocolEnvelopeCompatibilityOptions = {},
): TextProtocolResultEnvelopeV1 {
  if (!isTextProtocolResultEnvelopeJsonTransportV1(transport)) {
    throw new TypeError("textprotocol result-envelope JSON transport wrapper is invalid");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(transport.body);
  } catch (error) {
    throw new TypeError(`textprotocol result-envelope JSON body is invalid: ${String(error)}`);
  }
  const compatibility = checkTextProtocolResultEnvelopeCompatibility(parsed, options);
  if (!compatibility.ok || !isTextProtocolResultEnvelopeV1(parsed)) {
    throw new TypeError(
      `Parsed textprotocol result envelope is incompatible: ${compatibility.diagnostics
        .map((entry) => entry.code)
        .join(", ")}`,
    );
  }
  return parsed;
}

export function serializeTextProtocolSchemaFamilyEnvelopeJson(
  value: TextProtocolSchemaFamilyEnvelopeV1,
  options: TextProtocolSchemaFamilyValidationOptions = {},
): TextProtocolSchemaFamilyEnvelopeJsonTransportV1 {
  const compatibility = checkTextProtocolSchemaFamilyEnvelope(value, options);
  if (!compatibility.ok || compatibility.family === undefined || !isRecord(value)) {
    throw new TypeError(
      `Cannot serialize incompatible textprotocol schema-family envelope: ${compatibility.diagnostics
        .map((entry) => entry.code)
        .join(", ")}`,
    );
  }
  const schemaId = value.schemaId;
  if (!isTextProtocolSchemaId(schemaId)) {
    throw new TypeError("Cannot serialize textprotocol schema-family envelope with unregistered schemaId");
  }
  return {
    mediaType: textProtocolSchemaFamilyEnvelopeJsonMediaType,
    schemaId,
    schemaVersion: textProtocolSchemaVersion,
    family: compatibility.family,
    body: canonicalizeTextProtocolJson(value),
  };
}

export function parseTextProtocolSchemaFamilyEnvelopeJson(
  transport: TextProtocolSchemaFamilyEnvelopeJsonTransportV1,
  options: TextProtocolSchemaFamilyValidationOptions = {},
): TextProtocolSchemaFamilyEnvelopeV1 {
  if (!isTextProtocolSchemaFamilyEnvelopeJsonTransportV1(transport)) {
    throw new TypeError("textprotocol schema-family JSON transport wrapper is invalid");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(transport.body);
  } catch (error) {
    throw new TypeError(`textprotocol schema-family JSON body is invalid: ${String(error)}`);
  }
  if (!isRecord(parsed) || parsed.schemaId !== transport.schemaId) {
    throw new TypeError("Parsed textprotocol schema-family envelope does not match transport schemaId");
  }
  const compatibility = checkTextProtocolSchemaFamilyEnvelope(parsed, {
    ...options,
    expectedFamily: options.expectedFamily ?? transport.family,
  });
  if (!compatibility.ok) {
    throw new TypeError(
      `Parsed textprotocol schema-family envelope is incompatible: ${compatibility.diagnostics
        .map((entry) => entry.code)
        .join(", ")}`,
    );
  }
  return parsed as unknown as TextProtocolSchemaFamilyEnvelopeV1;
}
