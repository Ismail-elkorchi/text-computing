import { scanLoneSurrogates, sha256Hex } from "@ismail-elkorchi/textfacts";
import { segmentSentencesUAX29, segmentWordsUAX29 } from "@ismail-elkorchi/textfacts/segment";

export const packageName = "@ismail-elkorchi/textdoc" as const;

export type PackageName = typeof packageName;

export const tokenSentenceAnnotationSchemaVersion = 1 as const;
export const documentSchemaVersion = 1 as const;
export const textDocTaskGraphProfileSchemaVersion = 1 as const;
export const textDocTaskGraphValidationReportSchemaVersion = 1 as const;
export const textDocDocumentPayloadKind = "textdoc-document-v1" as const;
export const textDocConlluRoundTripPayloadKind = "textdoc-conllu-roundtrip" as const;

export type TextDocTokenSentenceAnnotationSchemaVersion =
  typeof tokenSentenceAnnotationSchemaVersion;
export type TextDocDocumentSchemaVersion = typeof documentSchemaVersion;
export type TextDocTaskGraphProfileSchemaVersion =
  typeof textDocTaskGraphProfileSchemaVersion;
export type TextDocTaskGraphValidationReportSchemaVersion =
  typeof textDocTaskGraphValidationReportSchemaVersion;
export type TextDocDocumentPayloadKind = typeof textDocDocumentPayloadKind;
export type TextDocConlluRoundTripPayloadKind = typeof textDocConlluRoundTripPayloadKind;

export type TextDocOffsetUnit = "utf16-code-unit";
export type TextDocViewKind = "raw" | "normalized" | "tailored" | "task" | "imported" | "extension";
export type TextDocLayerKind =
  | "token"
  | "sentence"
  | "pos"
  | "lemma"
  | "morphology"
  | "entity"
  | "relation"
  | "coreference-mention"
  | "coreference-chain"
  | "entity-link"
  | "corpus-feature"
  | "dependency-node"
  | "dependency"
  | "extension";
export type TextDocAnnotationLifecycleState = "active" | "superseded" | "retracted";
export type TextDocSpanMapLifecycleState = "active" | "partial" | "invalidated" | "superseded";
export type TextDocDependencyNodeKind = "word" | "multiword-token" | "empty-node";
export type TextDocDocumentValidationSeverity = "error" | "warning";
export type TextDocConlluErrorCode =
  | "empty-input"
  | "field-count"
  | "head-format"
  | "dangling-head"
  | "deprel-missing"
  | "root-count"
  | "missing-dependency-layer"
  | "invalid-dependency-document";

export type TextDocTokenAnnotationKind = "uax29-word-boundary-token" | "lexical-token";
export type TextDocSentenceAnnotationKind = "uax29-sentence";
export type TextDocTokenSentenceAnnotationKind =
  | TextDocTokenAnnotationKind
  | TextDocSentenceAnnotationKind;

export interface TextDocSpanCU {
  readonly startCU: number;
  readonly endCU: number;
}

export interface TextDocSpanAnnotation extends TextDocSpanCU {
  readonly id: string;
  readonly kind: TextDocTokenSentenceAnnotationKind;
  readonly text?: string;
  readonly notes?: readonly string[];
}

export interface TextDocTokenAnnotation extends TextDocSpanAnnotation {
  readonly kind: TextDocTokenAnnotationKind;
}

export interface TextDocSentenceAnnotation extends TextDocSpanAnnotation {
  readonly kind: TextDocSentenceAnnotationKind;
}

export interface TextDocSourceRef {
  readonly id: string;
  readonly sha256?: string;
}

export interface TextDocReferenceRef {
  readonly kind: string;
  readonly id: string;
}

export interface TextDocProvenance {
  readonly source?: TextDocSourceRef;
  readonly references?: readonly TextDocReferenceRef[];
}

export interface TextDocUnits {
  readonly text: TextDocOffsetUnit;
}

export interface TextDocTokenSentenceAnnotationSet {
  readonly schemaVersion: TextDocTokenSentenceAnnotationSchemaVersion;
  readonly documentId: string;
  readonly source?: TextDocSourceRef;
  readonly unicodeVersion?: string;
  readonly units: TextDocUnits;
  readonly tokens: readonly TextDocTokenAnnotation[];
  readonly sentences: readonly TextDocSentenceAnnotation[];
  readonly notes?: readonly string[];
}

export interface TextDocView {
  readonly id: string;
  readonly kind: TextDocViewKind;
  readonly description?: string;
  readonly parentViewId?: string;
  readonly spanMapIds?: readonly string[];
  readonly loss?: readonly TextDocLossMarker[];
}

export interface TextDocLifecycle {
  readonly state: TextDocAnnotationLifecycleState;
  readonly supersedes?: readonly string[];
  readonly supersededBy?: string;
  readonly reason?: string;
}

export interface TextDocSpanTarget extends TextDocSpanCU {
  readonly kind: "span";
  readonly viewId: string;
}

export interface TextDocDocumentTarget {
  readonly kind: "document";
}

export interface TextDocAnnotationTarget {
  readonly kind: "annotation";
  readonly annotationId: string;
}

export type TextDocTarget =
  | TextDocSpanTarget
  | TextDocDocumentTarget
  | TextDocAnnotationTarget;

export interface TextDocStringAlternative {
  readonly id: string;
  readonly rank: number;
  readonly value: string;
  readonly notes?: readonly string[];
}

export interface TextDocFeature {
  readonly name: string;
  readonly value: string;
}

export interface TextDocMorphologyAlternative {
  readonly id: string;
  readonly rank: number;
  readonly features: readonly TextDocFeature[];
  readonly notes?: readonly string[];
}

export interface TextDocConfidence {
  readonly value: number;
  readonly method?: string;
}

export interface TextDocLossMarker {
  readonly kind:
    | "lossy-normalization"
    | "omitted-alternative"
    | "truncated-context"
    | "external-reference";
  readonly reason: string;
  readonly source?: string;
}

export interface TextDocAmbiguitySetRef {
  readonly id: string;
  readonly role: "candidate" | "selected" | "rejected";
  readonly rank?: number;
}

export interface TextDocExternalDocumentRef {
  readonly documentId: string;
  readonly role: string;
  readonly revision?: string;
  readonly sha256?: string;
}

export interface TextDocAnnotationBase {
  readonly id: string;
  readonly kind: TextDocLayerKind;
  readonly lifecycle: TextDocLifecycle;
  readonly targets: readonly TextDocTarget[];
  readonly notes?: readonly string[];
  readonly provenance?: TextDocProvenance;
  readonly confidence?: TextDocConfidence;
  readonly loss?: readonly TextDocLossMarker[];
  readonly ambiguitySet?: TextDocAmbiguitySetRef;
  readonly documentRefs?: readonly TextDocExternalDocumentRef[];
}

export interface TextDocDocumentTokenAnnotation extends TextDocAnnotationBase {
  readonly kind: "token";
  readonly tokenKind: TextDocTokenAnnotationKind;
  readonly text?: string;
}

export interface TextDocDocumentSentenceAnnotation extends TextDocAnnotationBase {
  readonly kind: "sentence";
  readonly sentenceKind: TextDocSentenceAnnotationKind;
  readonly text?: string;
  readonly sourceComments?: readonly string[];
}

export interface TextDocPosAnnotation extends TextDocAnnotationBase {
  readonly kind: "pos";
  readonly tagSet: string;
  readonly alternatives: readonly TextDocStringAlternative[];
}

export interface TextDocLemmaAnnotation extends TextDocAnnotationBase {
  readonly kind: "lemma";
  readonly alternatives: readonly TextDocStringAlternative[];
}

export interface TextDocMorphologyAnnotation extends TextDocAnnotationBase {
  readonly kind: "morphology";
  readonly alternatives: readonly TextDocMorphologyAlternative[];
}

export interface TextDocEntityAnnotation extends TextDocAnnotationBase {
  readonly kind: "entity";
  readonly label: string;
  readonly normalized?: string;
  readonly text?: string;
}

export interface TextDocRelationArgument {
  readonly role: string;
  readonly annotationId: string;
}

export interface TextDocRelationAnnotation extends TextDocAnnotationBase {
  readonly kind: "relation";
  readonly relationType: string;
  readonly arguments: readonly TextDocRelationArgument[];
}

export interface TextDocCoreferenceMentionAnnotation extends TextDocAnnotationBase {
  readonly kind: "coreference-mention";
  readonly mentionType: string;
  readonly text?: string;
}

export interface TextDocCoreferenceChainAnnotation extends TextDocAnnotationBase {
  readonly kind: "coreference-chain";
  readonly mentionIds: readonly string[];
  readonly representativeMentionId?: string;
}

export interface TextDocEntityLinkRef {
  readonly namespace: string;
  readonly id: string;
}

export interface TextDocEntityLinkNil {
  readonly reason: string;
}

export interface TextDocEntityLinkAnnotation extends TextDocAnnotationBase {
  readonly kind: "entity-link";
  readonly link?: TextDocEntityLinkRef;
  readonly nil?: TextDocEntityLinkNil;
}

export interface TextDocCorpusFeatureAnnotation extends TextDocAnnotationBase {
  readonly kind: "corpus-feature";
  readonly featureName: string;
  readonly formula?: string;
  readonly value?: string;
  readonly numericValue?: number;
}

export interface TextDocExtensionSchemaRef {
  readonly schemaId: string;
  readonly schemaVersion?: string;
}

export interface TextDocSpanMapSegment {
  readonly source: TextDocSpanCU;
  readonly target: TextDocSpanCU;
  readonly kind: "unchanged" | "normalized" | "inserted" | "deleted" | "reordered" | "unknown";
  readonly reversible?: boolean;
  readonly loss?: readonly TextDocLossMarker[];
}

export interface TextDocSpanMapLifecycle {
  readonly state: TextDocSpanMapLifecycleState;
  readonly supersededBy?: string;
  readonly reason?: string;
}

export interface TextDocSpanMapV1 {
  readonly id: string;
  readonly sourceViewId: string;
  readonly targetViewId: string;
  readonly lifecycle: TextDocSpanMapLifecycle;
  readonly segments: readonly TextDocSpanMapSegment[];
  readonly loss?: readonly TextDocLossMarker[];
  readonly provenance?: TextDocProvenance;
}

export interface TextDocExtensionAnnotation extends TextDocAnnotationBase {
  readonly kind: "extension";
  readonly extensionId: string;
  readonly extensionSchema?: TextDocExtensionSchemaRef;
  readonly data?: Readonly<Record<string, unknown>>;
}

export interface TextDocConlluFields {
  readonly id: string;
  readonly form: string;
  readonly lemma: string;
  readonly upos: string;
  readonly xpos: string;
  readonly feats: string;
  readonly head: string;
  readonly deprel: string;
  readonly deps: string;
  readonly misc: string;
}

export interface TextDocDependencyNodeAnnotation extends TextDocAnnotationBase {
  readonly kind: "dependency-node";
  readonly nodeKind: TextDocDependencyNodeKind;
  readonly sentenceId: string;
  readonly sourceOrder: number;
  readonly fields: TextDocConlluFields;
}

export interface TextDocDependencyAnnotation extends TextDocAnnotationBase {
  readonly kind: "dependency";
  readonly dependentNodeId: string;
  readonly headNodeId: string | null;
  readonly relation: string;
  readonly source: {
    readonly sentenceId: string;
    readonly conlluId: string;
    readonly conlluHead: string;
    readonly conlluDeprel: string;
    readonly conlluDeps: string;
  };
}

export type TextDocAnnotation =
  | TextDocDocumentTokenAnnotation
  | TextDocDocumentSentenceAnnotation
  | TextDocPosAnnotation
  | TextDocLemmaAnnotation
  | TextDocMorphologyAnnotation
  | TextDocEntityAnnotation
  | TextDocRelationAnnotation
  | TextDocCoreferenceMentionAnnotation
  | TextDocCoreferenceChainAnnotation
  | TextDocEntityLinkAnnotation
  | TextDocCorpusFeatureAnnotation
  | TextDocDependencyNodeAnnotation
  | TextDocDependencyAnnotation
  | TextDocExtensionAnnotation;

export interface TextDocLayer<TAnnotation extends TextDocAnnotation = TextDocAnnotation> {
  readonly id: string;
  readonly kind: TAnnotation["kind"];
  readonly viewId: string;
  readonly allowSpanOverlap?: boolean;
  readonly annotations: readonly TAnnotation[];
  readonly notes?: readonly string[];
}

export interface TextDocDocumentV1 {
  readonly schemaVersion: TextDocDocumentSchemaVersion;
  readonly documentId: string;
  readonly revision: string;
  readonly textLengthCU: number;
  readonly text?: string;
  readonly source?: TextDocSourceRef;
  readonly unicodeVersion?: string;
  readonly units: TextDocUnits;
  readonly views: readonly TextDocView[];
  readonly spanMaps?: readonly TextDocSpanMapV1[];
  readonly layers: readonly TextDocLayer[];
  readonly notes?: readonly string[];
}

export interface TextDocDocumentValidationDiagnostic {
  readonly code: string;
  readonly severity: TextDocDocumentValidationSeverity;
  readonly message: string;
  readonly viewId?: string;
  readonly layerId?: string;
  readonly annotationId?: string;
  readonly targetId?: string;
}

export interface TextDocDocumentValidationResult {
  readonly ok: boolean;
  readonly diagnostics: readonly TextDocDocumentValidationDiagnostic[];
}

export interface TextDocConlluImportOptions {
  readonly documentId?: string;
  readonly revision?: string;
  readonly sourceId?: string;
  readonly sourceSha256?: string;
  readonly unicodeVersion?: string;
}

export type TextDocRawTextDiagnosticCode =
  | "textdoc.raw-text.lone-surrogate"
  | "textdoc.raw-text.sha256-unavailable";

export interface TextDocRawTextDiagnostic {
  readonly code: TextDocRawTextDiagnosticCode;
  readonly severity: TextDocDocumentValidationSeverity;
  readonly message: string;
  readonly startCU?: number;
  readonly endCU?: number;
}

export interface TextDocRawTextDocumentOptions {
  readonly documentId: string;
  readonly revision?: string;
  readonly sourceId?: string;
  readonly sourceSha256?: string;
  readonly unicodeVersion?: string;
  readonly includeText?: boolean;
}

export interface TextDocRawTextDocumentInput extends TextDocRawTextDocumentOptions {
  readonly text: string;
}

export interface TextDocRawTextDocumentResult {
  readonly document: TextDocDocumentV1;
  readonly diagnostics: readonly TextDocRawTextDiagnostic[];
}

export type TextDocRevisionErrorCode =
  | "textdoc.revision.expected-mismatch"
  | "textdoc.revision.invalid-next";

export interface TextDocRevisionOptions {
  readonly expectedRevision?: string;
  readonly revision?: string;
}

export interface TextDocAnnotationQuery {
  readonly viewId?: string;
  readonly layerId?: string;
  readonly kind?: TextDocLayerKind;
  readonly lifecycleStates?: readonly TextDocAnnotationLifecycleState[];
  readonly targetKind?: TextDocTarget["kind"];
  readonly spanOverlap?: TextDocSpanCU & { readonly viewId: string };
  readonly spanContains?: TextDocSpanCU & { readonly viewId: string };
  readonly provenanceReference?: TextDocReferenceRef;
  readonly extensionId?: string;
}

export interface TextDocAnnotationQueryResult<TAnnotation extends TextDocAnnotation = TextDocAnnotation> {
  readonly viewId: string;
  readonly layerId: string;
  readonly annotation: TAnnotation;
}

export interface TextDocAnnotationBundleAnnotationV1 {
  readonly annotationId: string;
  readonly layerId: string;
  readonly kind: TextDocLayerKind;
  readonly target: TextDocTarget;
  readonly annotation: TextDocAnnotation;
}

export interface TextDocAnnotationBundlePayloadV1 {
  readonly documentId: string;
  readonly documentRevision: string;
  readonly annotations: readonly TextDocAnnotationBundleAnnotationV1[];
}

export interface TextDocDocumentBundleDocumentV1 {
  readonly documentId: string;
  readonly revision: string;
  readonly document: TextDocDocumentV1;
}

export interface TextDocDocumentBundlePayloadV1 {
  readonly documents: readonly TextDocDocumentBundleDocumentV1[];
}

export interface TextDocDocumentBundleImportResult {
  readonly ok: boolean;
  readonly documents?: readonly TextDocDocumentV1[];
  readonly diagnostics: readonly TextDocDocumentValidationDiagnostic[];
}

export type TextDocMappingLossReportSeverity = "info" | "warning" | "error";

export type TextDocMappingLossReportLossClass =
  | "offset-loss"
  | "view-loss"
  | "feature-loss"
  | "type-loss"
  | "ordering-loss"
  | "unknown-loss";

export interface TextDocMappingLossReportArtifactRefV1 {
  readonly kind: string;
  readonly id: string;
  readonly schemaId?: string;
}

export interface TextDocMappingLossReportEntryV1 {
  readonly code: string;
  readonly severity: TextDocMappingLossReportSeverity;
  readonly class: TextDocMappingLossReportLossClass;
  readonly reason: string;
  readonly sourcePath?: string;
  readonly targetPath?: string;
  readonly affectedTargets?: readonly TextDocReferenceRef[];
}

export interface TextDocMappingLossReportPayloadV1 {
  readonly mappingId: string;
  readonly source: TextDocMappingLossReportArtifactRefV1;
  readonly target: TextDocMappingLossReportArtifactRefV1;
  readonly losses: readonly TextDocMappingLossReportEntryV1[];
}

export interface TextDocMappingLossReportPayloadOptions {
  readonly mappingId?: string;
  readonly source?: TextDocMappingLossReportArtifactRefV1;
  readonly target?: TextDocMappingLossReportArtifactRefV1;
}

export type TextDocEvidenceBundleExactnessClass = "E0" | "E1" | "E2" | "E3";

export interface TextDocEvidenceBundleTargetV1 {
  readonly kind: string;
  readonly id: string;
}

export interface TextDocEvidenceBundleRecordV1 {
  readonly id: string;
  readonly kind: string;
  readonly exactness: TextDocEvidenceBundleExactnessClass;
  readonly targets: readonly TextDocEvidenceBundleTargetV1[];
  readonly payload: Readonly<Record<string, unknown>>;
  readonly provenance: Readonly<Record<string, unknown>>;
  readonly uncertainty?: Readonly<Record<string, unknown>>;
  readonly support?: readonly TextDocReferenceRef[];
  readonly loss?: readonly TextDocMappingLossReportEntryV1[];
}

export interface TextDocEvidenceBundlePayloadV1 {
  readonly records: readonly TextDocEvidenceBundleRecordV1[];
}

export interface TextDocEvidenceBundlePayloadOptions {
  readonly recordIdPrefix?: string;
  readonly exactnessByAnnotationId?: Readonly<Record<string, TextDocEvidenceBundleExactnessClass>>;
  readonly supportByAnnotationId?: Readonly<Record<string, readonly TextDocReferenceRef[]>>;
}

export interface TextDocAnnotationBundleApplyResult {
  readonly ok: boolean;
  readonly document?: TextDocDocumentV1;
  readonly diagnostics: readonly TextDocDocumentValidationDiagnostic[];
}

export interface TextDocTaskGraphRequiredViewV1 {
  readonly id: string;
  readonly kind?: TextDocViewKind;
}

export interface TextDocTaskGraphRequiredLayerV1 {
  readonly id: string;
  readonly kind: TextDocLayerKind;
  readonly viewId?: string;
  readonly lifecycleStates?: readonly TextDocAnnotationLifecycleState[];
  readonly minAnnotations?: number;
}

export interface TextDocTaskGraphAnnotationPatternV1 {
  readonly id: string;
  readonly annotationKind: TextDocLayerKind;
  readonly layerId?: string;
  readonly viewId?: string;
  readonly lifecycleStates?: readonly TextDocAnnotationLifecycleState[];
  readonly minAnnotations?: number;
  readonly requiredTargetKinds?: readonly TextDocTarget["kind"][];
  readonly requiredTargetAnnotationKinds?: readonly TextDocLayerKind[];
  readonly requiredProvenanceReferences?: readonly TextDocReferenceRef[];
}

export interface TextDocTaskGraphRelationArgumentRoleV1 {
  readonly role: string;
  readonly targetAnnotationKinds?: readonly TextDocLayerKind[];
  readonly minCount?: number;
}

export interface TextDocTaskGraphRelationArgumentRuleV1 {
  readonly id: string;
  readonly layerId?: string;
  readonly viewId?: string;
  readonly relationType?: string;
  readonly lifecycleStates?: readonly TextDocAnnotationLifecycleState[];
  readonly minRelations?: number;
  readonly requiredRoles: readonly TextDocTaskGraphRelationArgumentRoleV1[];
}

export type TextDocTaskGraphCoverageMode =
  | "annotation-target"
  | "span-overlap"
  | "span-contained";

export interface TextDocTaskGraphCoverageRuleV1 {
  readonly id: string;
  readonly sourceAnnotationKind: TextDocLayerKind;
  readonly sourceLayerId?: string;
  readonly sourceLifecycleStates?: readonly TextDocAnnotationLifecycleState[];
  readonly coveringAnnotationKind: TextDocLayerKind;
  readonly coveringLayerId?: string;
  readonly coveringLifecycleStates?: readonly TextDocAnnotationLifecycleState[];
  readonly mode: TextDocTaskGraphCoverageMode;
  readonly minCoveringAnnotations?: number;
}

export interface TextDocTaskGraphProfileV1 {
  readonly schemaVersion: TextDocTaskGraphProfileSchemaVersion;
  readonly profileId: string;
  readonly task: string;
  readonly requiredViews?: readonly TextDocTaskGraphRequiredViewV1[];
  readonly requiredLayers?: readonly TextDocTaskGraphRequiredLayerV1[];
  readonly annotationPatterns?: readonly TextDocTaskGraphAnnotationPatternV1[];
  readonly relationArgumentRules?: readonly TextDocTaskGraphRelationArgumentRuleV1[];
  readonly coverageRules?: readonly TextDocTaskGraphCoverageRuleV1[];
  readonly evidenceRefs: readonly TextDocReferenceRef[];
  readonly limitations: readonly string[];
  readonly notes?: readonly string[];
}

export interface TextDocTaskGraphValidationDiagnostic extends TextDocDocumentValidationDiagnostic {
  readonly profileId: string;
  readonly requirementId?: string;
}

export interface TextDocTaskGraphValidationSummaryV1 {
  readonly viewRequirements: number;
  readonly layerRequirements: number;
  readonly annotationPatternRequirements: number;
  readonly relationArgumentRequirements: number;
  readonly coverageRequirements: number;
  readonly passCount: number;
  readonly failCount: number;
  readonly diagnosticCount: number;
}

export interface TextDocTaskGraphValidationReportV1 {
  readonly schemaVersion: TextDocTaskGraphValidationReportSchemaVersion;
  readonly profileId: string;
  readonly task: string;
  readonly documentId: string;
  readonly documentRevision: string;
  readonly ok: boolean;
  readonly summary: TextDocTaskGraphValidationSummaryV1;
  readonly diagnostics: readonly TextDocTaskGraphValidationDiagnostic[];
  readonly evidenceRefs: readonly TextDocReferenceRef[];
  readonly limitations: readonly string[];
  readonly notes?: readonly string[];
}

interface ParsedConlluRow {
  readonly line: number;
  readonly fields: TextDocConlluFields;
}

interface ParsedConlluSentence {
  readonly index: number;
  readonly id: string;
  readonly comments: readonly string[];
  readonly text: string;
  readonly rows: readonly ParsedConlluRow[];
}

export class TextDocConlluError extends Error {
  readonly code: TextDocConlluErrorCode;
  readonly line: number | undefined;
  readonly sentenceId: string | undefined;

  constructor(
    code: TextDocConlluErrorCode,
    message: string,
    options: { readonly line?: number; readonly sentenceId?: string } = {},
  ) {
    super(message);
    this.name = "TextDocConlluError";
    this.code = code;
    this.line = options.line;
    this.sentenceId = options.sentenceId;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isSha256Hex(value: string): boolean {
  return /^[a-f0-9]{64}$/u.test(value);
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((entry) => isNonEmptyString(entry));
}

function textDocValidationDiagnostic(
  code: string,
  message: string,
  context: Omit<TextDocDocumentValidationDiagnostic, "code" | "message" | "severity"> = {},
): TextDocDocumentValidationDiagnostic {
  return {
    code,
    severity: "error",
    message,
    ...context,
  };
}

function hasErrorDiagnostics(diagnostics: readonly TextDocDocumentValidationDiagnostic[]): boolean {
  return diagnostics.some((entry) => entry.severity === "error");
}

function addDuplicateDiagnostics(
  values: readonly string[],
  code: string,
  label: string,
  diagnostics: TextDocDocumentValidationDiagnostic[],
): void {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  for (const duplicate of [...duplicates].sort()) {
    diagnostics.push(textDocValidationDiagnostic(code, `${label} id ${duplicate} is duplicated.`, {
      targetId: duplicate,
    }));
  }
}

function cloneJsonValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function stableTextDocJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map((entry) => stableTextDocJson(entry)).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableTextDocJson(entry)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function isTextDocLayerKind(value: unknown): value is TextDocLayerKind {
  return (
    value === "token" ||
    value === "sentence" ||
    value === "pos" ||
    value === "lemma" ||
    value === "morphology" ||
    value === "entity" ||
    value === "relation" ||
    value === "coreference-mention" ||
    value === "coreference-chain" ||
    value === "entity-link" ||
    value === "corpus-feature" ||
    value === "dependency-node" ||
    value === "dependency" ||
    value === "extension"
  );
}

function isTextDocLifecycleState(value: unknown): value is TextDocAnnotationLifecycleState {
  return value === "active" || value === "superseded" || value === "retracted";
}

function isTextDocSpanMapLifecycleState(value: unknown): value is TextDocSpanMapLifecycleState {
  return value === "active" || value === "partial" || value === "invalidated" || value === "superseded";
}

function isTextDocTargetOfKind(
  value: unknown,
  kind: TextDocTarget["kind"],
): value is TextDocTarget {
  return isTextDocTarget(value) && value.kind === kind;
}

export function isTextDocSpanInRange(span: TextDocSpanCU, textLengthCU: number): boolean {
  return (
    Number.isInteger(span.startCU) &&
    Number.isInteger(span.endCU) &&
    Number.isInteger(textLengthCU) &&
    span.startCU >= 0 &&
    span.endCU >= span.startCU &&
    span.endCU <= textLengthCU
  );
}

function isTextDocSpanCUValue(value: unknown): value is TextDocSpanCU {
  if (!isRecord(value)) return false;
  const { startCU, endCU } = value;
  return (
    typeof startCU === "number" &&
    typeof endCU === "number" &&
    Number.isInteger(startCU) &&
    Number.isInteger(endCU) &&
    startCU >= 0 &&
    endCU >= startCU
  );
}

export function isTextDocSourceRef(value: unknown): value is TextDocSourceRef {
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    (value.sha256 === undefined || isNonEmptyString(value.sha256))
  );
}

export function isTextDocReferenceRef(value: unknown): value is TextDocReferenceRef {
  return isRecord(value) && isNonEmptyString(value.kind) && isNonEmptyString(value.id);
}

export function isTextDocProvenance(value: unknown): value is TextDocProvenance {
  return (
    isRecord(value) &&
    (value.source === undefined || isTextDocSourceRef(value.source)) &&
    (value.references === undefined ||
      (Array.isArray(value.references) &&
        value.references.every((entry) => isTextDocReferenceRef(entry))))
  );
}

export function isTextDocView(value: unknown): value is TextDocView {
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    (value.kind === "raw" ||
      value.kind === "normalized" ||
      value.kind === "tailored" ||
      value.kind === "task" ||
      value.kind === "imported" ||
      value.kind === "extension") &&
    (value.description === undefined || isNonEmptyString(value.description)) &&
    (value.parentViewId === undefined || isNonEmptyString(value.parentViewId)) &&
    (value.spanMapIds === undefined || isStringArray(value.spanMapIds)) &&
    (value.loss === undefined ||
      (Array.isArray(value.loss) && value.loss.every((entry) => isTextDocLossMarker(entry))))
  );
}

export function isTextDocLifecycle(value: unknown): value is TextDocLifecycle {
  return (
    isRecord(value) &&
    isTextDocLifecycleState(value.state) &&
    (value.supersedes === undefined || isStringArray(value.supersedes)) &&
    (value.supersededBy === undefined || isNonEmptyString(value.supersededBy)) &&
    (value.reason === undefined || isNonEmptyString(value.reason))
  );
}

export function isTextDocSpanTarget(value: unknown): value is TextDocSpanTarget {
  return (
    isRecord(value) &&
    value.kind === "span" &&
    isNonEmptyString(value.viewId) &&
    Number.isInteger(value.startCU) &&
    Number.isInteger(value.endCU)
  );
}

export function isTextDocDocumentTarget(value: unknown): value is TextDocDocumentTarget {
  return isRecord(value) && value.kind === "document";
}

export function isTextDocAnnotationTarget(value: unknown): value is TextDocAnnotationTarget {
  return isRecord(value) && value.kind === "annotation" && isNonEmptyString(value.annotationId);
}

export function isTextDocTarget(value: unknown): value is TextDocTarget {
  return (
    isTextDocSpanTarget(value) ||
    isTextDocDocumentTarget(value) ||
    isTextDocAnnotationTarget(value)
  );
}

export function isTextDocStringAlternative(value: unknown): value is TextDocStringAlternative {
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    typeof value.rank === "number" &&
    Number.isInteger(value.rank) &&
    value.rank >= 1 &&
    isNonEmptyString(value.value) &&
    (value.notes === undefined || isStringArray(value.notes))
  );
}

function isTextDocDependencyNodeKind(value: unknown): value is TextDocDependencyNodeKind {
  return value === "word" || value === "multiword-token" || value === "empty-node";
}

function isTextDocConlluFields(value: unknown): value is TextDocConlluFields {
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    typeof value.form === "string" &&
    typeof value.lemma === "string" &&
    typeof value.upos === "string" &&
    typeof value.xpos === "string" &&
    typeof value.feats === "string" &&
    typeof value.head === "string" &&
    typeof value.deprel === "string" &&
    typeof value.deps === "string" &&
    typeof value.misc === "string"
  );
}

export function isTextDocFeature(value: unknown): value is TextDocFeature {
  return isRecord(value) && isNonEmptyString(value.name) && isNonEmptyString(value.value);
}

export function isTextDocMorphologyAlternative(
  value: unknown,
): value is TextDocMorphologyAlternative {
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    typeof value.rank === "number" &&
    Number.isInteger(value.rank) &&
    value.rank >= 1 &&
    Array.isArray(value.features) &&
    value.features.length >= 1 &&
    value.features.every((entry) => isTextDocFeature(entry)) &&
    (value.notes === undefined || isStringArray(value.notes))
  );
}

export function isTextDocRelationArgument(value: unknown): value is TextDocRelationArgument {
  return isRecord(value) && isNonEmptyString(value.role) && isNonEmptyString(value.annotationId);
}

export function isTextDocEntityLinkRef(value: unknown): value is TextDocEntityLinkRef {
  return isRecord(value) && isNonEmptyString(value.namespace) && isNonEmptyString(value.id);
}

export function isTextDocEntityLinkNil(value: unknown): value is TextDocEntityLinkNil {
  return isRecord(value) && isNonEmptyString(value.reason);
}

export function isTextDocConfidence(value: unknown): value is TextDocConfidence {
  return (
    isRecord(value) &&
    typeof value.value === "number" &&
    Number.isFinite(value.value) &&
    value.value >= 0 &&
    value.value <= 1 &&
    (value.method === undefined || isNonEmptyString(value.method))
  );
}

export function isTextDocLossMarker(value: unknown): value is TextDocLossMarker {
  return (
    isRecord(value) &&
    (value.kind === "lossy-normalization" ||
      value.kind === "omitted-alternative" ||
      value.kind === "truncated-context" ||
      value.kind === "external-reference") &&
    isNonEmptyString(value.reason) &&
    (value.source === undefined || isNonEmptyString(value.source))
  );
}

export function isTextDocAmbiguitySetRef(value: unknown): value is TextDocAmbiguitySetRef {
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    (value.role === "candidate" || value.role === "selected" || value.role === "rejected") &&
    (value.rank === undefined ||
      (typeof value.rank === "number" && Number.isInteger(value.rank) && value.rank >= 1))
  );
}

export function isTextDocExternalDocumentRef(value: unknown): value is TextDocExternalDocumentRef {
  return (
    isRecord(value) &&
    isNonEmptyString(value.documentId) &&
    isNonEmptyString(value.role) &&
    (value.revision === undefined || isNonEmptyString(value.revision)) &&
    (value.sha256 === undefined ||
      (typeof value.sha256 === "string" && /^[a-f0-9]{64}$/u.test(value.sha256)))
  );
}

export const textDocExtensionIdPattern = "^[a-z][a-z0-9+.-]*:[^\\s]+$" as const;

export function isTextDocExtensionId(value: unknown): value is string {
  return typeof value === "string" && /^[a-z][a-z0-9+.-]*:[^\s]+$/u.test(value);
}

export function isTextDocExtensionSchemaRef(value: unknown): value is TextDocExtensionSchemaRef {
  return (
    isRecord(value) &&
    isNonEmptyString(value.schemaId) &&
    (value.schemaVersion === undefined || isNonEmptyString(value.schemaVersion))
  );
}

export function isTextDocSpanMapSegment(value: unknown): value is TextDocSpanMapSegment {
  return (
    isRecord(value) &&
    isTextDocSpanCUValue(value.source) &&
    isTextDocSpanCUValue(value.target) &&
    (value.kind === "unchanged" ||
      value.kind === "normalized" ||
      value.kind === "inserted" ||
      value.kind === "deleted" ||
      value.kind === "reordered" ||
      value.kind === "unknown") &&
    (value.reversible === undefined || typeof value.reversible === "boolean") &&
    (value.loss === undefined ||
      (Array.isArray(value.loss) && value.loss.every((entry) => isTextDocLossMarker(entry))))
  );
}

export function isTextDocSpanMapLifecycle(value: unknown): value is TextDocSpanMapLifecycle {
  return (
    isRecord(value) &&
    isTextDocSpanMapLifecycleState(value.state) &&
    (value.supersededBy === undefined || isNonEmptyString(value.supersededBy)) &&
    (value.reason === undefined || isNonEmptyString(value.reason))
  );
}

export function isTextDocSpanMapV1(value: unknown): value is TextDocSpanMapV1 {
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.sourceViewId) &&
    isNonEmptyString(value.targetViewId) &&
    isTextDocSpanMapLifecycle(value.lifecycle) &&
    Array.isArray(value.segments) &&
    value.segments.every((entry) => isTextDocSpanMapSegment(entry)) &&
    (value.loss === undefined ||
      (Array.isArray(value.loss) && value.loss.every((entry) => isTextDocLossMarker(entry)))) &&
    (value.provenance === undefined || isTextDocProvenance(value.provenance))
  );
}

function isTextDocAnnotationBase(value: unknown): value is TextDocAnnotationBase {
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    isTextDocLayerKind(value.kind) &&
    isTextDocLifecycle(value.lifecycle) &&
    Array.isArray(value.targets) &&
    value.targets.length >= 1 &&
    value.targets.every((target) => isTextDocTarget(target)) &&
    (value.notes === undefined || isStringArray(value.notes)) &&
    (value.provenance === undefined || isTextDocProvenance(value.provenance)) &&
    (value.confidence === undefined || isTextDocConfidence(value.confidence)) &&
    (value.loss === undefined ||
      (Array.isArray(value.loss) && value.loss.every((entry) => isTextDocLossMarker(entry)))) &&
    (value.ambiguitySet === undefined || isTextDocAmbiguitySetRef(value.ambiguitySet)) &&
    (value.documentRefs === undefined ||
      (Array.isArray(value.documentRefs) &&
        value.documentRefs.every((entry) => isTextDocExternalDocumentRef(entry))))
  );
}

export function isTextDocAnnotation(value: unknown): value is TextDocAnnotation {
  if (!isTextDocAnnotationBase(value)) return false;
  const annotation = value as unknown as Record<string, unknown>;

  if (annotation.kind === "token") {
    return (
      (annotation.tokenKind === "uax29-word-boundary-token" ||
        annotation.tokenKind === "lexical-token") &&
      value.targets.length === 1 &&
      value.targets.every((target) => isTextDocTargetOfKind(target, "span")) &&
      (annotation.text === undefined || isNonEmptyString(annotation.text))
    );
  }

  if (annotation.kind === "sentence") {
    return (
      annotation.sentenceKind === "uax29-sentence" &&
      value.targets.length === 1 &&
      value.targets.every((target) => isTextDocTargetOfKind(target, "span")) &&
      (annotation.text === undefined || isNonEmptyString(annotation.text)) &&
      (annotation.sourceComments === undefined || isStringArray(annotation.sourceComments))
    );
  }

  if (annotation.kind === "pos") {
    return (
      isNonEmptyString(annotation.tagSet) &&
      Array.isArray(annotation.alternatives) &&
      annotation.alternatives.length >= 1 &&
      annotation.alternatives.every((entry: unknown) => isTextDocStringAlternative(entry)) &&
      value.targets.length === 1 &&
      value.targets.every((target) => isTextDocTargetOfKind(target, "annotation"))
    );
  }

  if (annotation.kind === "lemma") {
    return (
      Array.isArray(annotation.alternatives) &&
      annotation.alternatives.length >= 1 &&
      annotation.alternatives.every((entry: unknown) => isTextDocStringAlternative(entry)) &&
      value.targets.length === 1 &&
      value.targets.every((target) => isTextDocTargetOfKind(target, "annotation"))
    );
  }

  if (annotation.kind === "morphology") {
    return (
      Array.isArray(annotation.alternatives) &&
      annotation.alternatives.length >= 1 &&
      annotation.alternatives.every((entry: unknown) => isTextDocMorphologyAlternative(entry)) &&
      value.targets.length === 1 &&
      value.targets.every((target) => isTextDocTargetOfKind(target, "annotation"))
    );
  }

  if (annotation.kind === "entity") {
    return (
      isNonEmptyString(annotation.label) &&
      value.targets.every((target) => isTextDocTargetOfKind(target, "span")) &&
      (annotation.normalized === undefined || isNonEmptyString(annotation.normalized)) &&
      (annotation.text === undefined || isNonEmptyString(annotation.text))
    );
  }

  if (annotation.kind === "relation") {
    return (
      isNonEmptyString(annotation.relationType) &&
      Array.isArray(annotation.arguments) &&
      annotation.arguments.length >= 2 &&
      annotation.arguments.every((entry: unknown) => isTextDocRelationArgument(entry)) &&
      value.targets.every((target) => isTextDocTargetOfKind(target, "annotation"))
    );
  }

  if (annotation.kind === "coreference-mention") {
    return (
      isNonEmptyString(annotation.mentionType) &&
      value.targets.every(
        (target) => target.kind === "span" || target.kind === "annotation",
      ) &&
      (annotation.text === undefined || isNonEmptyString(annotation.text))
    );
  }

  if (annotation.kind === "coreference-chain") {
    return (
      Array.isArray(annotation.mentionIds) &&
      annotation.mentionIds.length >= 1 &&
      annotation.mentionIds.every((entry: unknown) => isNonEmptyString(entry)) &&
      (annotation.representativeMentionId === undefined ||
        isNonEmptyString(annotation.representativeMentionId)) &&
      value.targets.every((target) => isTextDocTargetOfKind(target, "annotation"))
    );
  }

  if (annotation.kind === "entity-link") {
    const hasLink = annotation.link !== undefined;
    const hasNil = annotation.nil !== undefined;
    return (
      hasLink !== hasNil &&
      (annotation.link === undefined || isTextDocEntityLinkRef(annotation.link)) &&
      (annotation.nil === undefined || isTextDocEntityLinkNil(annotation.nil)) &&
      value.targets.length === 1 &&
      value.targets.every((target) => isTextDocTargetOfKind(target, "annotation"))
    );
  }

  if (annotation.kind === "corpus-feature") {
    return (
      isNonEmptyString(annotation.featureName) &&
      (annotation.formula === undefined || isNonEmptyString(annotation.formula)) &&
      (annotation.value === undefined || isNonEmptyString(annotation.value)) &&
      (annotation.numericValue === undefined || typeof annotation.numericValue === "number") &&
      (annotation.value !== undefined || annotation.numericValue !== undefined)
    );
  }

  if (annotation.kind === "extension") {
    return (
      isTextDocExtensionId(annotation.extensionId) &&
      (annotation.extensionSchema === undefined ||
        isTextDocExtensionSchemaRef(annotation.extensionSchema)) &&
      (annotation.data === undefined || isRecord(annotation.data))
    );
  }

  if (annotation.kind === "dependency-node") {
    return (
      isTextDocDependencyNodeKind(annotation.nodeKind) &&
      isNonEmptyString(annotation.sentenceId) &&
      typeof annotation.sourceOrder === "number" &&
      Number.isInteger(annotation.sourceOrder) &&
      annotation.sourceOrder >= 0 &&
      isTextDocConlluFields(annotation.fields) &&
      value.targets.length === 1 &&
      value.targets.every((target) => target.kind === "span" || target.kind === "annotation" || target.kind === "document")
    );
  }

  return (
    annotation.kind === "dependency" &&
    isNonEmptyString(annotation.dependentNodeId) &&
    (annotation.headNodeId === null || isNonEmptyString(annotation.headNodeId)) &&
    isNonEmptyString(annotation.relation) &&
    isRecord(annotation.source) &&
    isNonEmptyString(annotation.source.sentenceId) &&
    isNonEmptyString(annotation.source.conlluId) &&
    typeof annotation.source.conlluHead === "string" &&
    isNonEmptyString(annotation.source.conlluDeprel) &&
    typeof annotation.source.conlluDeps === "string" &&
    value.targets.length >= 1 &&
    value.targets.every((target) => isTextDocTargetOfKind(target, "annotation"))
  );
}

export function isTextDocLayer(value: unknown): value is TextDocLayer {
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    isTextDocLayerKind(value.kind) &&
    isNonEmptyString(value.viewId) &&
    (value.allowSpanOverlap === undefined || typeof value.allowSpanOverlap === "boolean") &&
    Array.isArray(value.annotations) &&
    value.annotations.every(
      (annotation) => isTextDocAnnotation(annotation) && annotation.kind === value.kind,
    ) &&
    (value.notes === undefined || isStringArray(value.notes))
  );
}

export function isTextDocDocumentV1(value: unknown): value is TextDocDocumentV1 {
  return (
    isRecord(value) &&
    value.schemaVersion === documentSchemaVersion &&
    isNonEmptyString(value.documentId) &&
    isNonEmptyString(value.revision) &&
    typeof value.textLengthCU === "number" &&
    Number.isInteger(value.textLengthCU) &&
    value.textLengthCU >= 0 &&
    (value.text === undefined ||
      (typeof value.text === "string" && value.text.length === value.textLengthCU)) &&
    (value.source === undefined || isTextDocSourceRef(value.source)) &&
    (value.unicodeVersion === undefined || isNonEmptyString(value.unicodeVersion)) &&
    isRecord(value.units) &&
    value.units.text === "utf16-code-unit" &&
    Array.isArray(value.views) &&
    value.views.length >= 1 &&
    value.views.every((entry) => isTextDocView(entry)) &&
    (value.spanMaps === undefined ||
      (Array.isArray(value.spanMaps) && value.spanMaps.every((entry) => isTextDocSpanMapV1(entry)))) &&
    Array.isArray(value.layers) &&
    value.layers.length >= 1 &&
    value.layers.every((entry) => isTextDocLayer(entry)) &&
    (value.notes === undefined || isStringArray(value.notes))
  );
}

export function validateTextDocDocumentV1(value: unknown): TextDocDocumentValidationResult {
  const diagnostics: TextDocDocumentValidationDiagnostic[] = [];
  if (!isTextDocDocumentV1(value)) {
    return {
      ok: false,
      diagnostics: [
        textDocValidationDiagnostic(
          "textdoc.document-shape",
          "Document does not satisfy TextDocDocumentV1 runtime shape.",
        ),
      ],
    };
  }

  const document = value;
  const viewIds = new Set(document.views.map((view) => view.id));
  const viewById = new Map(document.views.map((view) => [view.id, view] as const));
  addDuplicateDiagnostics(
    document.views.map((view) => view.id),
    "textdoc.view-duplicate",
    "View",
    diagnostics,
  );
  for (const view of document.views) {
    if (view.parentViewId === view.id) {
      diagnostics.push(textDocValidationDiagnostic(
        "textdoc.view-parent-self",
        `View ${view.id} cannot declare itself as parent.`,
        { viewId: view.id, targetId: view.parentViewId },
      ));
    }
    if (view.parentViewId !== undefined && !viewIds.has(view.parentViewId)) {
      diagnostics.push(textDocValidationDiagnostic(
        "textdoc.view-parent-missing",
        `View ${view.id} references missing parent view ${view.parentViewId}.`,
        { viewId: view.id, targetId: view.parentViewId },
      ));
    }
    const visited = new Set<string>();
    let cursor: TextDocView | undefined = view;
    while (cursor?.parentViewId !== undefined) {
      if (visited.has(cursor.id)) {
        diagnostics.push(textDocValidationDiagnostic(
          "textdoc.view-parent-cycle",
          `View ${view.id} participates in a parent-view cycle.`,
          { viewId: view.id, targetId: cursor.id },
        ));
        break;
      }
      visited.add(cursor.id);
      cursor = viewById.get(cursor.parentViewId);
    }
  }

  const spanMaps = document.spanMaps ?? [];
  const spanMapById = new Map(spanMaps.map((spanMap) => [spanMap.id, spanMap] as const));
  addDuplicateDiagnostics(
    spanMaps.map((spanMap) => spanMap.id),
    "textdoc.span-map-duplicate",
    "Span map",
    diagnostics,
  );
  for (const spanMap of spanMaps) {
    if (spanMap.sourceViewId === spanMap.targetViewId) {
      diagnostics.push(textDocValidationDiagnostic(
        "textdoc.span-map-self",
        `Span map ${spanMap.id} cannot map a view to itself.`,
        { targetId: spanMap.id },
      ));
    }
    if (!viewIds.has(spanMap.sourceViewId)) {
      diagnostics.push(textDocValidationDiagnostic(
        "textdoc.span-map-source-view-missing",
        `Span map ${spanMap.id} references missing source view ${spanMap.sourceViewId}.`,
        { targetId: spanMap.sourceViewId },
      ));
    }
    if (!viewIds.has(spanMap.targetViewId)) {
      diagnostics.push(textDocValidationDiagnostic(
        "textdoc.span-map-target-view-missing",
        `Span map ${spanMap.id} references missing target view ${spanMap.targetViewId}.`,
        { targetId: spanMap.targetViewId },
      ));
    }
    if (spanMap.lifecycle.state === "superseded" && spanMap.lifecycle.supersededBy === undefined) {
      diagnostics.push(textDocValidationDiagnostic(
        "textdoc.span-map-superseded-by-missing",
        `Superseded span map ${spanMap.id} must declare supersededBy.`,
        { targetId: spanMap.id },
      ));
    }
    if (
      spanMap.lifecycle.state !== "superseded" &&
      spanMap.lifecycle.supersededBy !== undefined
    ) {
      diagnostics.push(textDocValidationDiagnostic(
        "textdoc.span-map-superseded-by-state",
        `Only superseded span maps may declare supersededBy.`,
        { targetId: spanMap.id },
      ));
    }
    if (
      (spanMap.lifecycle.state === "invalidated" || spanMap.lifecycle.state === "partial") &&
      spanMap.lifecycle.reason === undefined
    ) {
      diagnostics.push(textDocValidationDiagnostic(
        "textdoc.span-map-reason-missing",
        `Partial or invalidated span map ${spanMap.id} must declare a reason.`,
        { targetId: spanMap.id },
      ));
    }
    let previousSourceEnd = -1;
    for (const segment of spanMap.segments) {
      if (!isTextDocSpanInRange(segment.source, document.textLengthCU)) {
        diagnostics.push(textDocValidationDiagnostic(
          "textdoc.span-map-source-out-of-range",
          `Span map ${spanMap.id} has source segment outside document text range.`,
          { targetId: spanMap.id },
        ));
      }
      if (!isTextDocSpanInRange(segment.target, document.textLengthCU)) {
        diagnostics.push(textDocValidationDiagnostic(
          "textdoc.span-map-target-out-of-range",
          `Span map ${spanMap.id} has target segment outside document text range.`,
          { targetId: spanMap.id },
        ));
      }
      if (segment.source.startCU < previousSourceEnd) {
        diagnostics.push(textDocValidationDiagnostic(
          "textdoc.span-map-source-order",
          `Span map ${spanMap.id} source segments must be ordered and non-overlapping.`,
          { targetId: spanMap.id },
        ));
      }
      previousSourceEnd = segment.source.endCU;
    }
  }
  for (const view of document.views) {
    for (const spanMapId of view.spanMapIds ?? []) {
      const spanMap = spanMapById.get(spanMapId);
      if (spanMap === undefined) {
        diagnostics.push(textDocValidationDiagnostic(
          "textdoc.view-span-map-missing",
          `View ${view.id} references missing span map ${spanMapId}.`,
          { viewId: view.id, targetId: spanMapId },
        ));
        continue;
      }
      if (spanMap.targetViewId !== view.id) {
        diagnostics.push(textDocValidationDiagnostic(
          "textdoc.view-span-map-target-mismatch",
          `View ${view.id} references span map ${spanMapId} whose target is ${spanMap.targetViewId}.`,
          { viewId: view.id, targetId: spanMapId },
        ));
      }
      if (view.parentViewId !== undefined && spanMap.sourceViewId !== view.parentViewId) {
        diagnostics.push(textDocValidationDiagnostic(
          "textdoc.view-span-map-parent-mismatch",
          `View ${view.id} span map ${spanMapId} does not map from its parent view ${view.parentViewId}.`,
          { viewId: view.id, targetId: spanMapId },
        ));
      }
    }
  }

  addDuplicateDiagnostics(
    document.layers.map((layer) => layer.id),
    "textdoc.layer-duplicate",
    "Layer",
    diagnostics,
  );
  for (const layer of document.layers) {
    if (!viewIds.has(layer.viewId)) {
      diagnostics.push(textDocValidationDiagnostic(
        "textdoc.layer-view-missing",
        `Layer ${layer.id} references missing view ${layer.viewId}.`,
        { layerId: layer.id, viewId: layer.viewId },
      ));
    }
  }

  const annotationIds = new Map<string, TextDocAnnotation>();
  const duplicateAnnotationIds = new Set<string>();
  for (const layer of document.layers) {
    for (const annotation of layer.annotations) {
      if (annotationIds.has(annotation.id)) {
        duplicateAnnotationIds.add(annotation.id);
      } else {
        annotationIds.set(annotation.id, annotation);
      }
    }
  }
  for (const duplicate of [...duplicateAnnotationIds].sort()) {
    diagnostics.push(textDocValidationDiagnostic(
      "textdoc.annotation-duplicate",
      `Annotation id ${duplicate} is duplicated.`,
      { annotationId: duplicate },
    ));
  }

  const requireAnnotation = (
    sourceAnnotation: TextDocAnnotation,
    targetId: string,
    code: string,
    message: string,
  ): TextDocAnnotation | undefined => {
    const targetAnnotation = annotationIds.get(targetId);
    if (targetAnnotation === undefined) {
      diagnostics.push(textDocValidationDiagnostic(code, message, {
        annotationId: sourceAnnotation.id,
        targetId,
      }));
    }
    return targetAnnotation;
  };

  for (const layer of document.layers) {
    for (const annotation of layer.annotations) {
      for (const target of annotation.targets) {
        if (target.kind === "span" && !isTextDocSpanInRange(target, document.textLengthCU)) {
          diagnostics.push(textDocValidationDiagnostic(
            "textdoc.span-target-out-of-range",
            `Annotation ${annotation.id} has span target outside document text range.`,
            { layerId: layer.id, annotationId: annotation.id },
          ));
        }
        if (target.kind === "span" && !viewIds.has(target.viewId)) {
          diagnostics.push(textDocValidationDiagnostic(
            "textdoc.span-target-view-missing",
            `Annotation ${annotation.id} targets missing view ${target.viewId}.`,
            { layerId: layer.id, annotationId: annotation.id, viewId: target.viewId },
          ));
        }
        if (target.kind === "span" && target.viewId !== layer.viewId) {
          diagnostics.push(textDocValidationDiagnostic(
            "textdoc.span-target-layer-view-mismatch",
            `Annotation ${annotation.id} span target view ${target.viewId} does not match layer view ${layer.viewId}.`,
            { layerId: layer.id, annotationId: annotation.id, viewId: target.viewId },
          ));
        }
        if (
          target.kind === "span" &&
          annotation.lifecycle.state === "active" &&
          viewById
            .get(target.viewId)
            ?.spanMapIds?.some((spanMapId) => {
              const spanMap = spanMapById.get(spanMapId);
              return spanMap?.lifecycle.state === "invalidated" || spanMap?.lifecycle.state === "superseded";
            })
        ) {
          diagnostics.push(textDocValidationDiagnostic(
            "textdoc.span-target-inactive-span-map",
            `Annotation ${annotation.id} targets view ${target.viewId} through an inactive span map.`,
            { layerId: layer.id, annotationId: annotation.id, viewId: target.viewId },
          ));
        }
        if (target.kind === "annotation") {
          requireAnnotation(
            annotation,
            target.annotationId,
            "textdoc.annotation-target-missing",
            `Annotation ${annotation.id} targets missing annotation ${target.annotationId}.`,
          );
        }
      }

      if (annotation.lifecycle.state === "retracted" && annotation.lifecycle.reason === undefined) {
        diagnostics.push(textDocValidationDiagnostic(
          "textdoc.lifecycle-retraction-reason-missing",
          `Retracted annotation ${annotation.id} must declare a reason.`,
          { layerId: layer.id, annotationId: annotation.id },
        ));
      }
      if (annotation.lifecycle.state === "superseded" && annotation.lifecycle.supersededBy === undefined) {
        diagnostics.push(textDocValidationDiagnostic(
          "textdoc.lifecycle-superseded-by-missing",
          `Superseded annotation ${annotation.id} must declare supersededBy.`,
          { layerId: layer.id, annotationId: annotation.id },
        ));
      }
      if (annotation.lifecycle.state !== "superseded" && annotation.lifecycle.supersededBy !== undefined) {
        diagnostics.push(textDocValidationDiagnostic(
          "textdoc.lifecycle-superseded-by-state",
          `Only superseded annotations may declare supersededBy.`,
          { layerId: layer.id, annotationId: annotation.id, targetId: annotation.lifecycle.supersededBy },
        ));
      }
      if (
        annotation.loss !== undefined &&
        annotation.provenance === undefined &&
        annotation.loss.some((loss) => loss.source === undefined)
      ) {
        diagnostics.push(textDocValidationDiagnostic(
          "textdoc.loss-provenance-missing",
          `Annotation ${annotation.id} declares loss without annotation provenance or loss source.`,
          { layerId: layer.id, annotationId: annotation.id },
        ));
      }

      for (const supersedes of annotation.lifecycle.supersedes ?? []) {
        if (supersedes === annotation.id) {
          diagnostics.push(textDocValidationDiagnostic(
            "textdoc.lifecycle-self-reference",
            `Annotation ${annotation.id} cannot supersede itself.`,
            { annotationId: annotation.id, targetId: supersedes },
          ));
        }
        const supersededAnnotation = requireAnnotation(
          annotation,
          supersedes,
          "textdoc.lifecycle-supersedes-missing",
          `Annotation ${annotation.id} supersedes missing annotation ${supersedes}.`,
        );
        if (supersededAnnotation !== undefined) {
          if (supersededAnnotation.lifecycle.state !== "superseded") {
            diagnostics.push(textDocValidationDiagnostic(
              "textdoc.lifecycle-supersedes-state-mismatch",
              `Annotation ${annotation.id} supersedes ${supersedes}, but ${supersedes} is not superseded.`,
              { annotationId: annotation.id, targetId: supersedes },
            ));
          }
          if (supersededAnnotation.lifecycle.supersededBy !== annotation.id) {
            diagnostics.push(textDocValidationDiagnostic(
              "textdoc.lifecycle-supersedes-link-mismatch",
              `Annotation ${supersedes} must point back to ${annotation.id} via supersededBy.`,
              { annotationId: annotation.id, targetId: supersedes },
            ));
          }
        }
      }
      if (annotation.lifecycle.supersededBy !== undefined) {
        if (annotation.lifecycle.supersededBy === annotation.id) {
          diagnostics.push(textDocValidationDiagnostic(
            "textdoc.lifecycle-self-reference",
            `Annotation ${annotation.id} cannot be superseded by itself.`,
            { annotationId: annotation.id, targetId: annotation.lifecycle.supersededBy },
          ));
        }
        const supersedingAnnotation = requireAnnotation(
          annotation,
          annotation.lifecycle.supersededBy,
          "textdoc.lifecycle-superseded-by-missing",
          `Annotation ${annotation.id} is superseded by missing annotation ${annotation.lifecycle.supersededBy}.`,
        );
        if (
          supersedingAnnotation !== undefined &&
          !supersedingAnnotation.lifecycle.supersedes?.includes(annotation.id)
        ) {
          diagnostics.push(textDocValidationDiagnostic(
            "textdoc.lifecycle-superseded-by-link-mismatch",
            `Replacement annotation ${annotation.lifecycle.supersededBy} must list ${annotation.id} in supersedes.`,
            { annotationId: annotation.id, targetId: annotation.lifecycle.supersededBy },
          ));
        }
      }

      if (annotation.kind === "relation") {
        for (const argument of annotation.arguments) {
          if (argument.annotationId === annotation.id) {
            diagnostics.push(textDocValidationDiagnostic(
              "textdoc.relation-argument-self",
              `Relation ${annotation.id} cannot use itself as an argument.`,
              { annotationId: annotation.id, targetId: argument.annotationId },
            ));
          }
          requireAnnotation(
            annotation,
            argument.annotationId,
            "textdoc.relation-argument-missing",
            `Relation ${annotation.id} references missing argument annotation ${argument.annotationId}.`,
          );
        }
      }
      if (annotation.kind === "coreference-chain") {
        const seenMentionIds = new Set<string>();
        for (const mentionId of annotation.mentionIds) {
          if (seenMentionIds.has(mentionId)) {
            diagnostics.push(textDocValidationDiagnostic(
              "textdoc.coreference-mention-duplicate",
              `Coreference chain ${annotation.id} repeats mention ${mentionId}.`,
              { annotationId: annotation.id, targetId: mentionId },
            ));
          }
          seenMentionIds.add(mentionId);
          const mention = requireAnnotation(
            annotation,
            mentionId,
            "textdoc.coreference-mention-missing",
            `Coreference chain ${annotation.id} references missing mention ${mentionId}.`,
          );
          if (mention !== undefined && mention.kind !== "coreference-mention") {
            diagnostics.push(textDocValidationDiagnostic(
              "textdoc.coreference-mention-kind",
              `Coreference chain ${annotation.id} references non-mention annotation ${mentionId}.`,
              { annotationId: annotation.id, targetId: mentionId },
            ));
          }
        }
        if (annotation.representativeMentionId !== undefined) {
          if (!annotation.mentionIds.includes(annotation.representativeMentionId)) {
            diagnostics.push(textDocValidationDiagnostic(
              "textdoc.coreference-representative-outside-chain",
              `Coreference chain ${annotation.id} representative ${annotation.representativeMentionId} is not in mentionIds.`,
              { annotationId: annotation.id, targetId: annotation.representativeMentionId },
            ));
          }
          const representative = requireAnnotation(
            annotation,
            annotation.representativeMentionId,
            "textdoc.coreference-representative-missing",
            `Coreference chain ${annotation.id} references missing representative mention ${annotation.representativeMentionId}.`,
          );
          if (representative !== undefined && representative.kind !== "coreference-mention") {
            diagnostics.push(textDocValidationDiagnostic(
              "textdoc.coreference-representative-kind",
              `Coreference chain ${annotation.id} representative ${annotation.representativeMentionId} is not a coreference mention.`,
              { annotationId: annotation.id, targetId: annotation.representativeMentionId },
            ));
          }
        }
      }
      if (annotation.kind === "entity-link") {
        const target = annotation.targets[0];
        if (target?.kind !== "annotation") {
          diagnostics.push(textDocValidationDiagnostic(
            "textdoc.entity-link-target-kind",
            `Entity-link ${annotation.id} must target an entity annotation.`,
            { annotationId: annotation.id },
          ));
        } else {
          const targetAnnotation = requireAnnotation(
            annotation,
            target.annotationId,
            "textdoc.entity-link-target-missing",
            `Entity-link ${annotation.id} targets missing annotation ${target.annotationId}.`,
          );
          if (targetAnnotation !== undefined && targetAnnotation.kind !== "entity") {
            diagnostics.push(textDocValidationDiagnostic(
              "textdoc.entity-link-target-kind",
              `Entity-link ${annotation.id} must target an entity annotation, not ${targetAnnotation.kind}.`,
              { annotationId: annotation.id, targetId: target.annotationId },
            ));
          }
        }
        if ((annotation.link === undefined) === (annotation.nil === undefined)) {
          diagnostics.push(textDocValidationDiagnostic(
            "textdoc.entity-link-resolution-mismatch",
            `Entity-link ${annotation.id} must declare exactly one of link or nil.`,
            { annotationId: annotation.id },
          ));
        }
      }
      if (annotation.kind === "dependency") {
        if (annotation.headNodeId === annotation.dependentNodeId) {
          diagnostics.push(textDocValidationDiagnostic(
            "textdoc.dependency-self-loop",
            `Dependency ${annotation.id} cannot point a node to itself.`,
            { annotationId: annotation.id, targetId: annotation.dependentNodeId },
          ));
        }
        const dependent = requireAnnotation(
          annotation,
          annotation.dependentNodeId,
          "textdoc.dependency-dependent-missing",
          `Dependency ${annotation.id} references missing dependent node ${annotation.dependentNodeId}.`,
        );
        if (dependent !== undefined && dependent.kind !== "dependency-node") {
          diagnostics.push(textDocValidationDiagnostic(
            "textdoc.dependency-dependent-kind",
            `Dependency ${annotation.id} dependent ${annotation.dependentNodeId} is not a dependency node.`,
            { annotationId: annotation.id, targetId: annotation.dependentNodeId },
          ));
        }
        if (
          dependent !== undefined &&
          dependent.kind === "dependency-node" &&
          annotation.source.sentenceId !== dependent.sentenceId
        ) {
          diagnostics.push(textDocValidationDiagnostic(
            "textdoc.dependency-source-sentence-mismatch",
            `Dependency ${annotation.id} source sentence does not match dependent node sentence.`,
            { annotationId: annotation.id, targetId: annotation.dependentNodeId },
          ));
        }
        if (annotation.headNodeId !== null) {
          const head = requireAnnotation(
            annotation,
            annotation.headNodeId,
            "textdoc.dependency-head-missing",
            `Dependency ${annotation.id} references missing head node ${annotation.headNodeId}.`,
          );
          if (head !== undefined && head.kind !== "dependency-node") {
            diagnostics.push(textDocValidationDiagnostic(
              "textdoc.dependency-head-kind",
              `Dependency ${annotation.id} head ${annotation.headNodeId} is not a dependency node.`,
              { annotationId: annotation.id, targetId: annotation.headNodeId },
            ));
          }
          if (
            dependent !== undefined &&
            dependent.kind === "dependency-node" &&
            head !== undefined &&
            head.kind === "dependency-node" &&
            head.sentenceId !== dependent.sentenceId
          ) {
            diagnostics.push(textDocValidationDiagnostic(
              "textdoc.dependency-head-sentence-mismatch",
              `Dependency ${annotation.id} head and dependent nodes belong to different sentences.`,
              { annotationId: annotation.id, targetId: annotation.headNodeId },
            ));
          }
        }
      }
    }
  }

  const selectedAmbiguityBySet = new Map<string, string>();
  const ambiguityRankBySet = new Map<string, string>();
  for (const annotation of annotationIds.values()) {
    if (annotation.ambiguitySet === undefined || annotation.lifecycle.state !== "active") continue;
    if (annotation.ambiguitySet.role === "selected") {
      const existing = selectedAmbiguityBySet.get(annotation.ambiguitySet.id);
      if (existing !== undefined) {
        diagnostics.push(textDocValidationDiagnostic(
          "textdoc.ambiguity-multiple-selected",
          `Ambiguity set ${annotation.ambiguitySet.id} selects both ${existing} and ${annotation.id}.`,
          { annotationId: annotation.id, targetId: existing },
        ));
      } else {
        selectedAmbiguityBySet.set(annotation.ambiguitySet.id, annotation.id);
      }
    }
    if (annotation.ambiguitySet.rank !== undefined) {
      const rankKey = `${annotation.ambiguitySet.id}:${annotation.ambiguitySet.rank}`;
      const existing = ambiguityRankBySet.get(rankKey);
      if (existing !== undefined) {
        diagnostics.push(textDocValidationDiagnostic(
          "textdoc.ambiguity-rank-duplicate",
          `Ambiguity set ${annotation.ambiguitySet.id} repeats rank ${annotation.ambiguitySet.rank}.`,
          { annotationId: annotation.id, targetId: existing },
        ));
      } else {
        ambiguityRankBySet.set(rankKey, annotation.id);
      }
    }
  }

  return {
    ok: !hasErrorDiagnostics(diagnostics),
    diagnostics,
  };
}

export class TextDocRevisionError extends Error {
  readonly code: TextDocRevisionErrorCode;

  constructor(code: TextDocRevisionErrorCode, message: string) {
    super(message);
    this.name = "TextDocRevisionError";
    this.code = code;
  }
}

export function nextTextDocRevision(revision: string): string {
  if (!isNonEmptyString(revision)) {
    throw new TextDocRevisionError(
      "textdoc.revision.invalid-next",
      "Cannot derive a next textdoc revision from an empty revision.",
    );
  }
  if (/^[0-9]+$/u.test(revision)) return String(Number.parseInt(revision, 10) + 1);
  const match = /^(.*)\+([0-9]+)$/u.exec(revision);
  if (match?.[1] !== undefined && match[2] !== undefined) {
    return `${match[1]}+${Number.parseInt(match[2], 10) + 1}`;
  }
  return `${revision}+1`;
}

function revisionForOperation(
  document: TextDocDocumentV1,
  options: TextDocRevisionOptions = {},
): string {
  if (options.expectedRevision !== undefined && options.expectedRevision !== document.revision) {
    throw new TextDocRevisionError(
      "textdoc.revision.expected-mismatch",
      `Expected document revision ${options.expectedRevision}, received ${document.revision}.`,
    );
  }
  return options.revision ?? nextTextDocRevision(document.revision);
}

export function addTextDocViewV1(
  document: TextDocDocumentV1,
  view: TextDocView,
  options: TextDocRevisionOptions = {},
): TextDocDocumentV1 {
  return {
    ...document,
    revision: revisionForOperation(document, options),
    views: [...document.views, view],
  };
}

export function addTextDocSpanMapV1(
  document: TextDocDocumentV1,
  spanMap: TextDocSpanMapV1,
  options: TextDocRevisionOptions = {},
): TextDocDocumentV1 {
  return {
    ...document,
    revision: revisionForOperation(document, options),
    spanMaps: [...(document.spanMaps ?? []), spanMap],
  };
}

export function addTextDocLayerV1(
  document: TextDocDocumentV1,
  layer: TextDocLayer,
  options: TextDocRevisionOptions = {},
): TextDocDocumentV1 {
  return {
    ...document,
    revision: revisionForOperation(document, options),
    layers: [...document.layers, layer],
  };
}

export function addTextDocAnnotationV1(
  document: TextDocDocumentV1,
  layerId: string,
  annotation: TextDocAnnotation,
  options: TextDocRevisionOptions = {},
): TextDocDocumentV1 {
  let found = false;
  const layers = document.layers.map((layer) => {
    if (layer.id !== layerId) return layer;
    found = true;
    if (layer.kind !== annotation.kind) {
      throw new TypeError(`Layer ${layerId} cannot receive annotation kind ${annotation.kind}.`);
    }
    return {
      ...layer,
      annotations: [...layer.annotations, annotation],
    };
  });
  if (!found) throw new TypeError(`Layer ${layerId} does not exist.`);
  return {
    ...document,
    revision: revisionForOperation(document, options),
    layers,
  };
}

export function retractTextDocAnnotationV1(
  document: TextDocDocumentV1,
  annotationId: string,
  reason: string,
  options: TextDocRevisionOptions = {},
): TextDocDocumentV1 {
  if (!isNonEmptyString(reason)) {
    throw new TypeError("Retraction reason must be a non-empty string.");
  }
  let found = false;
  const layers = document.layers.map((layer) => ({
    ...layer,
    annotations: layer.annotations.map((annotation) => {
      if (annotation.id !== annotationId) return annotation;
      found = true;
      return {
        ...annotation,
        lifecycle: {
          ...annotation.lifecycle,
          state: "retracted" as const,
          reason,
        },
      };
    }),
  }));
  if (!found) throw new TypeError(`Annotation ${annotationId} does not exist.`);
  return {
    ...document,
    revision: revisionForOperation(document, options),
    layers,
  };
}

export function supersedeTextDocAnnotationV1(
  document: TextDocDocumentV1,
  layerId: string,
  supersededAnnotationId: string,
  replacement: TextDocAnnotation,
  reason: string,
  options: TextDocRevisionOptions = {},
): TextDocDocumentV1 {
  if (!isNonEmptyString(reason)) {
    throw new TypeError("Supersession reason must be a non-empty string.");
  }
  let foundLayer = false;
  let foundSuperseded = false;
  const layers = document.layers.map((layer) => {
    if (layer.id !== layerId) return layer;
    foundLayer = true;
    if (layer.kind !== replacement.kind) {
      throw new TypeError(`Layer ${layerId} cannot receive annotation kind ${replacement.kind}.`);
    }
    const annotations = layer.annotations.map((annotation) => {
      if (annotation.id !== supersededAnnotationId) return annotation;
      foundSuperseded = true;
      return {
        ...annotation,
        lifecycle: {
          ...annotation.lifecycle,
          state: "superseded" as const,
          supersededBy: replacement.id,
          reason,
        },
      };
    });
    return {
      ...layer,
      annotations: [
        ...annotations,
        {
          ...replacement,
          lifecycle: {
            ...replacement.lifecycle,
            supersedes: [...(replacement.lifecycle.supersedes ?? []), supersededAnnotationId],
          },
        },
      ],
    };
  });
  if (!foundLayer) throw new TypeError(`Layer ${layerId} does not exist.`);
  if (!foundSuperseded) throw new TypeError(`Annotation ${supersededAnnotationId} does not exist.`);
  return {
    ...document,
    revision: revisionForOperation(document, options),
    layers,
  };
}

function spanOverlaps(left: TextDocSpanCU, right: TextDocSpanCU): boolean {
  return left.startCU < right.endCU && right.startCU < left.endCU;
}

function spanContains(outer: TextDocSpanCU, inner: TextDocSpanCU): boolean {
  return outer.startCU <= inner.startCU && outer.endCU >= inner.endCU;
}

function firstSpanTarget(annotation: TextDocAnnotation): TextDocSpanTarget | undefined {
  return annotation.targets.find((target): target is TextDocSpanTarget => target.kind === "span");
}

function compareTextDocQueryResults(
  left: TextDocAnnotationQueryResult,
  right: TextDocAnnotationQueryResult,
): number {
  const leftSpan = firstSpanTarget(left.annotation);
  const rightSpan = firstSpanTarget(right.annotation);
  return (
    left.viewId.localeCompare(right.viewId) ||
    left.layerId.localeCompare(right.layerId) ||
    (leftSpan?.startCU ?? Number.MAX_SAFE_INTEGER) - (rightSpan?.startCU ?? Number.MAX_SAFE_INTEGER) ||
    (leftSpan?.endCU ?? Number.MAX_SAFE_INTEGER) - (rightSpan?.endCU ?? Number.MAX_SAFE_INTEGER) ||
    left.annotation.id.localeCompare(right.annotation.id)
  );
}

export function queryTextDocAnnotations(
  document: TextDocDocumentV1,
  query: TextDocAnnotationQuery = {},
): readonly TextDocAnnotationQueryResult[] {
  const lifecycleStates = new Set<TextDocAnnotationLifecycleState>(query.lifecycleStates ?? ["active"]);
  const results: TextDocAnnotationQueryResult[] = [];
  for (const layer of document.layers) {
    if (query.layerId !== undefined && layer.id !== query.layerId) continue;
    if (query.viewId !== undefined && layer.viewId !== query.viewId) continue;
    if (query.kind !== undefined && layer.kind !== query.kind) continue;
    for (const annotation of layer.annotations) {
      if (!lifecycleStates.has(annotation.lifecycle.state)) continue;
      if (query.targetKind !== undefined && !annotation.targets.some((target) => target.kind === query.targetKind)) {
        continue;
      }
      if (
        query.extensionId !== undefined &&
        (annotation.kind !== "extension" || annotation.extensionId !== query.extensionId)
      ) {
        continue;
      }
      if (
        query.provenanceReference !== undefined &&
        !annotation.provenance?.references?.some(
          (reference) =>
            reference.kind === query.provenanceReference?.kind &&
            reference.id === query.provenanceReference.id,
        )
      ) {
        continue;
      }
      if (
        query.spanOverlap !== undefined &&
        !annotation.targets.some(
          (target) =>
            target.kind === "span" &&
            target.viewId === query.spanOverlap?.viewId &&
            spanOverlaps(target, query.spanOverlap),
        )
      ) {
        continue;
      }
      if (
        query.spanContains !== undefined &&
        !annotation.targets.some(
          (target) =>
            target.kind === "span" &&
            target.viewId === query.spanContains?.viewId &&
            spanContains(target, query.spanContains),
        )
      ) {
        continue;
      }
      results.push({ viewId: layer.viewId, layerId: layer.id, annotation });
    }
  }
  return results.sort(compareTextDocQueryResults);
}

function isTextDocViewKind(value: unknown): value is TextDocViewKind {
  return (
    value === "raw" ||
    value === "normalized" ||
    value === "tailored" ||
    value === "task" ||
    value === "imported" ||
    value === "extension"
  );
}

function isTextDocTargetKind(value: unknown): value is TextDocTarget["kind"] {
  return value === "span" || value === "document" || value === "annotation";
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isTextDocLifecycleStateArray(
  value: unknown,
): value is readonly TextDocAnnotationLifecycleState[] {
  return Array.isArray(value) && value.length > 0 && value.every((entry) => isTextDocLifecycleState(entry));
}

function isTextDocLayerKindArray(value: unknown): value is readonly TextDocLayerKind[] {
  return Array.isArray(value) && value.length > 0 && value.every((entry) => isTextDocLayerKind(entry));
}

function isTextDocTargetKindArray(value: unknown): value is readonly TextDocTarget["kind"][] {
  return Array.isArray(value) && value.length > 0 && value.every((entry) => isTextDocTargetKind(entry));
}

function isTextDocReferenceRefArray(value: unknown): value is readonly TextDocReferenceRef[] {
  return Array.isArray(value) && value.length > 0 && value.every((entry) => isTextDocReferenceRef(entry));
}

function isTextDocTaskGraphRequiredViewV1(
  value: unknown,
): value is TextDocTaskGraphRequiredViewV1 {
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    (value.kind === undefined || isTextDocViewKind(value.kind))
  );
}

function isTextDocTaskGraphRequiredLayerV1(
  value: unknown,
): value is TextDocTaskGraphRequiredLayerV1 {
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    isTextDocLayerKind(value.kind) &&
    (value.viewId === undefined || isNonEmptyString(value.viewId)) &&
    (value.lifecycleStates === undefined || isTextDocLifecycleStateArray(value.lifecycleStates)) &&
    (value.minAnnotations === undefined || isNonNegativeInteger(value.minAnnotations))
  );
}

function isTextDocTaskGraphAnnotationPatternV1(
  value: unknown,
): value is TextDocTaskGraphAnnotationPatternV1 {
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    isTextDocLayerKind(value.annotationKind) &&
    (value.layerId === undefined || isNonEmptyString(value.layerId)) &&
    (value.viewId === undefined || isNonEmptyString(value.viewId)) &&
    (value.lifecycleStates === undefined || isTextDocLifecycleStateArray(value.lifecycleStates)) &&
    (value.minAnnotations === undefined || isNonNegativeInteger(value.minAnnotations)) &&
    (value.requiredTargetKinds === undefined || isTextDocTargetKindArray(value.requiredTargetKinds)) &&
    (value.requiredTargetAnnotationKinds === undefined ||
      isTextDocLayerKindArray(value.requiredTargetAnnotationKinds)) &&
    (value.requiredProvenanceReferences === undefined ||
      isTextDocReferenceRefArray(value.requiredProvenanceReferences))
  );
}

function isTextDocTaskGraphRelationArgumentRoleV1(
  value: unknown,
): value is TextDocTaskGraphRelationArgumentRoleV1 {
  return (
    isRecord(value) &&
    isNonEmptyString(value.role) &&
    (value.targetAnnotationKinds === undefined || isTextDocLayerKindArray(value.targetAnnotationKinds)) &&
    (value.minCount === undefined || isNonNegativeInteger(value.minCount))
  );
}

function isTextDocTaskGraphRelationArgumentRuleV1(
  value: unknown,
): value is TextDocTaskGraphRelationArgumentRuleV1 {
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    (value.layerId === undefined || isNonEmptyString(value.layerId)) &&
    (value.viewId === undefined || isNonEmptyString(value.viewId)) &&
    (value.relationType === undefined || isNonEmptyString(value.relationType)) &&
    (value.lifecycleStates === undefined || isTextDocLifecycleStateArray(value.lifecycleStates)) &&
    (value.minRelations === undefined || isNonNegativeInteger(value.minRelations)) &&
    Array.isArray(value.requiredRoles) &&
    value.requiredRoles.length > 0 &&
    value.requiredRoles.every((entry) => isTextDocTaskGraphRelationArgumentRoleV1(entry))
  );
}

function isTextDocTaskGraphCoverageMode(value: unknown): value is TextDocTaskGraphCoverageMode {
  return value === "annotation-target" || value === "span-overlap" || value === "span-contained";
}

function isTextDocTaskGraphCoverageRuleV1(
  value: unknown,
): value is TextDocTaskGraphCoverageRuleV1 {
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    isTextDocLayerKind(value.sourceAnnotationKind) &&
    (value.sourceLayerId === undefined || isNonEmptyString(value.sourceLayerId)) &&
    (value.sourceLifecycleStates === undefined || isTextDocLifecycleStateArray(value.sourceLifecycleStates)) &&
    isTextDocLayerKind(value.coveringAnnotationKind) &&
    (value.coveringLayerId === undefined || isNonEmptyString(value.coveringLayerId)) &&
    (value.coveringLifecycleStates === undefined ||
      isTextDocLifecycleStateArray(value.coveringLifecycleStates)) &&
    isTextDocTaskGraphCoverageMode(value.mode) &&
    (value.minCoveringAnnotations === undefined || isNonNegativeInteger(value.minCoveringAnnotations))
  );
}

export function isTextDocTaskGraphProfileV1(value: unknown): value is TextDocTaskGraphProfileV1 {
  if (!isRecord(value)) return false;
  const hasRequirement =
    (Array.isArray(value.requiredViews) && value.requiredViews.length > 0) ||
    (Array.isArray(value.requiredLayers) && value.requiredLayers.length > 0) ||
    (Array.isArray(value.annotationPatterns) && value.annotationPatterns.length > 0) ||
    (Array.isArray(value.relationArgumentRules) && value.relationArgumentRules.length > 0) ||
    (Array.isArray(value.coverageRules) && value.coverageRules.length > 0);
  return (
    value.schemaVersion === textDocTaskGraphProfileSchemaVersion &&
    isNonEmptyString(value.profileId) &&
    isNonEmptyString(value.task) &&
    (value.requiredViews === undefined ||
      (Array.isArray(value.requiredViews) &&
        value.requiredViews.every((entry) => isTextDocTaskGraphRequiredViewV1(entry)))) &&
    (value.requiredLayers === undefined ||
      (Array.isArray(value.requiredLayers) &&
        value.requiredLayers.every((entry) => isTextDocTaskGraphRequiredLayerV1(entry)))) &&
    (value.annotationPatterns === undefined ||
      (Array.isArray(value.annotationPatterns) &&
        value.annotationPatterns.every((entry) => isTextDocTaskGraphAnnotationPatternV1(entry)))) &&
    (value.relationArgumentRules === undefined ||
      (Array.isArray(value.relationArgumentRules) &&
        value.relationArgumentRules.every((entry) => isTextDocTaskGraphRelationArgumentRuleV1(entry)))) &&
    (value.coverageRules === undefined ||
      (Array.isArray(value.coverageRules) &&
        value.coverageRules.every((entry) => isTextDocTaskGraphCoverageRuleV1(entry)))) &&
    hasRequirement &&
    isTextDocReferenceRefArray(value.evidenceRefs) &&
    isStringArray(value.limitations) &&
    value.limitations.length > 0 &&
    (value.notes === undefined || isStringArray(value.notes))
  );
}

function isTextDocTaskGraphValidationDiagnostic(
  value: unknown,
): value is TextDocTaskGraphValidationDiagnostic {
  return (
    isRecord(value) &&
    isNonEmptyString(value.code) &&
    (value.severity === "error" || value.severity === "warning") &&
    isNonEmptyString(value.message) &&
    isNonEmptyString(value.profileId) &&
    (value.requirementId === undefined || isNonEmptyString(value.requirementId)) &&
    (value.viewId === undefined || isNonEmptyString(value.viewId)) &&
    (value.layerId === undefined || isNonEmptyString(value.layerId)) &&
    (value.annotationId === undefined || isNonEmptyString(value.annotationId)) &&
    (value.targetId === undefined || isNonEmptyString(value.targetId))
  );
}

function isTextDocTaskGraphValidationSummaryV1(
  value: unknown,
): value is TextDocTaskGraphValidationSummaryV1 {
  return (
    isRecord(value) &&
    isNonNegativeInteger(value.viewRequirements) &&
    isNonNegativeInteger(value.layerRequirements) &&
    isNonNegativeInteger(value.annotationPatternRequirements) &&
    isNonNegativeInteger(value.relationArgumentRequirements) &&
    isNonNegativeInteger(value.coverageRequirements) &&
    isNonNegativeInteger(value.passCount) &&
    isNonNegativeInteger(value.failCount) &&
    isNonNegativeInteger(value.diagnosticCount)
  );
}

export function isTextDocTaskGraphValidationReportV1(
  value: unknown,
): value is TextDocTaskGraphValidationReportV1 {
  return (
    isRecord(value) &&
    value.schemaVersion === textDocTaskGraphValidationReportSchemaVersion &&
    isNonEmptyString(value.profileId) &&
    isNonEmptyString(value.task) &&
    isNonEmptyString(value.documentId) &&
    isNonEmptyString(value.documentRevision) &&
    typeof value.ok === "boolean" &&
    isTextDocTaskGraphValidationSummaryV1(value.summary) &&
    Array.isArray(value.diagnostics) &&
    value.diagnostics.every((entry) => isTextDocTaskGraphValidationDiagnostic(entry)) &&
    value.summary.diagnosticCount === value.diagnostics.length &&
    isTextDocReferenceRefArray(value.evidenceRefs) &&
    isStringArray(value.limitations) &&
    value.limitations.length > 0 &&
    (value.notes === undefined || isStringArray(value.notes))
  );
}

interface TextDocTaskGraphRequirementCounts {
  readonly viewRequirements: number;
  readonly layerRequirements: number;
  readonly annotationPatternRequirements: number;
  readonly relationArgumentRequirements: number;
  readonly coverageRequirements: number;
}

interface TextDocTaskGraphAnnotationIndexEntry {
  readonly layer: TextDocLayer;
  readonly annotation: TextDocAnnotation;
}

interface TextDocTaskGraphAnnotationCriteria {
  readonly annotationKind: TextDocLayerKind;
  readonly layerId?: string;
  readonly viewId?: string;
  readonly lifecycleStates?: readonly TextDocAnnotationLifecycleState[];
}

function textDocTaskGraphRequirementCounts(
  profile: TextDocTaskGraphProfileV1,
): TextDocTaskGraphRequirementCounts {
  return {
    viewRequirements: profile.requiredViews?.length ?? 0,
    layerRequirements: profile.requiredLayers?.length ?? 0,
    annotationPatternRequirements: profile.annotationPatterns?.length ?? 0,
    relationArgumentRequirements: profile.relationArgumentRules?.length ?? 0,
    coverageRequirements: profile.coverageRules?.length ?? 0,
  };
}

function textDocTaskGraphRequirementTotal(counts: TextDocTaskGraphRequirementCounts): number {
  return (
    counts.viewRequirements +
    counts.layerRequirements +
    counts.annotationPatternRequirements +
    counts.relationArgumentRequirements +
    counts.coverageRequirements
  );
}

function textDocTaskGraphDiagnostic(
  profileId: string,
  code: string,
  message: string,
  context: Omit<TextDocTaskGraphValidationDiagnostic, "code" | "message" | "severity" | "profileId"> = {},
): TextDocTaskGraphValidationDiagnostic {
  return {
    code,
    severity: "error",
    message,
    profileId,
    ...context,
  };
}

function textDocTaskGraphLifecycleSet(
  lifecycleStates: readonly TextDocAnnotationLifecycleState[] | undefined,
): Set<TextDocAnnotationLifecycleState> {
  return new Set(lifecycleStates ?? ["active"]);
}

function textDocTaskGraphAnnotationEntries(
  document: TextDocDocumentV1,
): readonly TextDocTaskGraphAnnotationIndexEntry[] {
  return document.layers.flatMap((layer) =>
    layer.annotations.map((annotation): TextDocTaskGraphAnnotationIndexEntry => ({ layer, annotation })),
  );
}

function textDocTaskGraphMatchingEntries(
  entries: readonly TextDocTaskGraphAnnotationIndexEntry[],
  criteria: TextDocTaskGraphAnnotationCriteria,
): readonly TextDocTaskGraphAnnotationIndexEntry[] {
  const lifecycleStates = textDocTaskGraphLifecycleSet(criteria.lifecycleStates);
  return entries.filter(
    (entry) =>
      entry.annotation.kind === criteria.annotationKind &&
      (criteria.layerId === undefined || entry.layer.id === criteria.layerId) &&
      (criteria.viewId === undefined || entry.layer.viewId === criteria.viewId) &&
      lifecycleStates.has(entry.annotation.lifecycle.state),
  );
}

function textDocTaskGraphAnnotationTargets(
  annotation: TextDocAnnotation,
  annotationById: ReadonlyMap<string, TextDocTaskGraphAnnotationIndexEntry>,
): readonly TextDocTaskGraphAnnotationIndexEntry[] {
  return annotation.targets
    .filter((target): target is TextDocAnnotationTarget => target.kind === "annotation")
    .map((target) => annotationById.get(target.annotationId))
    .filter((entry): entry is TextDocTaskGraphAnnotationIndexEntry => entry !== undefined);
}

function textDocTaskGraphHasProvenanceReference(
  annotation: TextDocAnnotation,
  reference: TextDocReferenceRef,
): boolean {
  return annotation.provenance?.references?.some(
    (entry) => entry.kind === reference.kind && entry.id === reference.id,
  ) ?? false;
}

function textDocTaskGraphSpanTargets(annotation: TextDocAnnotation): readonly TextDocSpanTarget[] {
  return annotation.targets.filter((target): target is TextDocSpanTarget => target.kind === "span");
}

function textDocTaskGraphCoversSource(
  source: TextDocTaskGraphAnnotationIndexEntry,
  coverer: TextDocTaskGraphAnnotationIndexEntry,
  mode: TextDocTaskGraphCoverageMode,
): boolean {
  if (mode === "annotation-target") {
    return coverer.annotation.targets.some(
      (target) => target.kind === "annotation" && target.annotationId === source.annotation.id,
    );
  }
  const sourceSpans = textDocTaskGraphSpanTargets(source.annotation);
  const covererSpans = textDocTaskGraphSpanTargets(coverer.annotation);
  return sourceSpans.some((sourceSpan) =>
    covererSpans.some((covererSpan) => {
      if (sourceSpan.viewId !== covererSpan.viewId) return false;
      if (mode === "span-overlap") return spanOverlaps(sourceSpan, covererSpan);
      return spanContains(covererSpan, sourceSpan);
    }),
  );
}

function textDocTaskGraphReport(
  document: TextDocDocumentV1,
  profile: TextDocTaskGraphProfileV1,
  counts: TextDocTaskGraphRequirementCounts,
  passCount: number,
  failCount: number,
  diagnostics: readonly TextDocTaskGraphValidationDiagnostic[],
): TextDocTaskGraphValidationReportV1 {
  const summary: TextDocTaskGraphValidationSummaryV1 = {
    ...counts,
    passCount,
    failCount,
    diagnosticCount: diagnostics.length,
  };
  const report: TextDocTaskGraphValidationReportV1 = {
    schemaVersion: textDocTaskGraphValidationReportSchemaVersion,
    profileId: profile.profileId,
    task: profile.task,
    documentId: document.documentId,
    documentRevision: document.revision,
    ok: failCount === 0 && diagnostics.length === 0,
    summary,
    diagnostics,
    evidenceRefs: profile.evidenceRefs.map((reference) => ({ ...reference })),
    limitations: [...profile.limitations],
    ...(profile.notes !== undefined ? { notes: [...profile.notes] } : {}),
  };
  if (!isTextDocTaskGraphValidationReportV1(report)) {
    throw new TypeError("textdoc task graph validation report could not be produced");
  }
  return report;
}

export function validateTextDocTaskGraphProfile(
  document: TextDocDocumentV1,
  profile: TextDocTaskGraphProfileV1,
): TextDocTaskGraphValidationReportV1 {
  if (!isTextDocTaskGraphProfileV1(profile)) {
    throw new TypeError("textdoc task graph profile must satisfy TextDocTaskGraphProfileV1");
  }
  if (!isTextDocDocumentV1(document)) {
    throw new TypeError("textdoc task graph validation requires a TextDocDocumentV1");
  }

  const counts = textDocTaskGraphRequirementCounts(profile);
  const baseValidation = validateTextDocDocumentV1(document);
  if (!baseValidation.ok) {
    const diagnostics = baseValidation.diagnostics.map((diagnostic) =>
      textDocTaskGraphDiagnostic(
        profile.profileId,
        "textdoc.task-graph.document-invalid",
        `Package-level document validation failed: ${diagnostic.code}: ${diagnostic.message}`,
        {
          requirementId: "textdoc-document-v1",
          ...(diagnostic.viewId !== undefined ? { viewId: diagnostic.viewId } : {}),
          ...(diagnostic.layerId !== undefined ? { layerId: diagnostic.layerId } : {}),
          ...(diagnostic.annotationId !== undefined ? { annotationId: diagnostic.annotationId } : {}),
          ...(diagnostic.targetId !== undefined ? { targetId: diagnostic.targetId } : {}),
        },
      ),
    );
    return textDocTaskGraphReport(
      document,
      profile,
      counts,
      0,
      Math.max(1, textDocTaskGraphRequirementTotal(counts)),
      diagnostics,
    );
  }

  const diagnostics: TextDocTaskGraphValidationDiagnostic[] = [];
  let passCount = 0;
  let failCount = 0;
  const recordRequirement = (
    requirementDiagnostics: readonly TextDocTaskGraphValidationDiagnostic[],
  ): void => {
    if (requirementDiagnostics.length === 0) {
      passCount += 1;
    } else {
      failCount += 1;
      diagnostics.push(...requirementDiagnostics);
    }
  };

  const viewById = new Map(document.views.map((view) => [view.id, view] as const));
  const layerById = new Map(document.layers.map((layer) => [layer.id, layer] as const));
  const entries = textDocTaskGraphAnnotationEntries(document);
  const annotationById = new Map(entries.map((entry) => [entry.annotation.id, entry] as const));

  for (const requirement of profile.requiredViews ?? []) {
    const requirementDiagnostics: TextDocTaskGraphValidationDiagnostic[] = [];
    const view = viewById.get(requirement.id);
    if (view === undefined) {
      requirementDiagnostics.push(textDocTaskGraphDiagnostic(
        profile.profileId,
        "textdoc.task-graph.view-missing",
        `Task graph profile ${profile.profileId} requires missing view ${requirement.id}.`,
        { requirementId: requirement.id, viewId: requirement.id },
      ));
    } else if (requirement.kind !== undefined && view.kind !== requirement.kind) {
      requirementDiagnostics.push(textDocTaskGraphDiagnostic(
        profile.profileId,
        "textdoc.task-graph.view-kind",
        `Task graph profile ${profile.profileId} requires view ${requirement.id} kind ${requirement.kind}, received ${view.kind}.`,
        { requirementId: requirement.id, viewId: requirement.id },
      ));
    }
    recordRequirement(requirementDiagnostics);
  }

  for (const requirement of profile.requiredLayers ?? []) {
    const requirementDiagnostics: TextDocTaskGraphValidationDiagnostic[] = [];
    const layer = layerById.get(requirement.id);
    if (layer === undefined) {
      requirementDiagnostics.push(textDocTaskGraphDiagnostic(
        profile.profileId,
        "textdoc.task-graph.layer-missing",
        `Task graph profile ${profile.profileId} requires missing layer ${requirement.id}.`,
        { requirementId: requirement.id, layerId: requirement.id },
      ));
    } else {
      if (layer.kind !== requirement.kind) {
        requirementDiagnostics.push(textDocTaskGraphDiagnostic(
          profile.profileId,
          "textdoc.task-graph.layer-kind",
          `Task graph profile ${profile.profileId} requires layer ${requirement.id} kind ${requirement.kind}, received ${layer.kind}.`,
          { requirementId: requirement.id, layerId: requirement.id },
        ));
      }
      if (requirement.viewId !== undefined && layer.viewId !== requirement.viewId) {
        requirementDiagnostics.push(textDocTaskGraphDiagnostic(
          profile.profileId,
          "textdoc.task-graph.layer-view",
          `Task graph profile ${profile.profileId} requires layer ${requirement.id} on view ${requirement.viewId}, received ${layer.viewId}.`,
          { requirementId: requirement.id, layerId: requirement.id, viewId: layer.viewId },
        ));
      }
      if (requirement.minAnnotations !== undefined) {
        const lifecycleStates = textDocTaskGraphLifecycleSet(requirement.lifecycleStates);
        const annotationCount = layer.annotations.filter((annotation) =>
          lifecycleStates.has(annotation.lifecycle.state),
        ).length;
        if (annotationCount < requirement.minAnnotations) {
          requirementDiagnostics.push(textDocTaskGraphDiagnostic(
            profile.profileId,
            "textdoc.task-graph.layer-min-annotations",
            `Task graph profile ${profile.profileId} requires layer ${requirement.id} to contain at least ${requirement.minAnnotations} matching annotations, received ${annotationCount}.`,
            { requirementId: requirement.id, layerId: requirement.id },
          ));
        }
      }
    }
    recordRequirement(requirementDiagnostics);
  }

  for (const pattern of profile.annotationPatterns ?? []) {
    const requirementDiagnostics: TextDocTaskGraphValidationDiagnostic[] = [];
    const candidates = textDocTaskGraphMatchingEntries(entries, {
      annotationKind: pattern.annotationKind,
      ...(pattern.layerId !== undefined ? { layerId: pattern.layerId } : {}),
      ...(pattern.viewId !== undefined ? { viewId: pattern.viewId } : {}),
      ...(pattern.lifecycleStates !== undefined ? { lifecycleStates: pattern.lifecycleStates } : {}),
    });
    const minAnnotations = pattern.minAnnotations ?? 1;
    if (candidates.length < minAnnotations) {
      requirementDiagnostics.push(textDocTaskGraphDiagnostic(
        profile.profileId,
        "textdoc.task-graph.annotation-pattern-min-count",
        `Task graph profile ${profile.profileId} requires pattern ${pattern.id} to match at least ${minAnnotations} annotations, received ${candidates.length}.`,
        {
          requirementId: pattern.id,
          ...(pattern.layerId !== undefined ? { layerId: pattern.layerId } : {}),
        },
      ));
    }
    for (const candidate of candidates) {
      for (const targetKind of pattern.requiredTargetKinds ?? []) {
        if (!candidate.annotation.targets.some((target) => target.kind === targetKind)) {
          requirementDiagnostics.push(textDocTaskGraphDiagnostic(
            profile.profileId,
            "textdoc.task-graph.annotation-pattern-target-kind",
            `Annotation ${candidate.annotation.id} does not declare required target kind ${targetKind} for task graph pattern ${pattern.id}.`,
            {
              requirementId: pattern.id,
              layerId: candidate.layer.id,
              annotationId: candidate.annotation.id,
            },
          ));
        }
      }
      const targetEntries = textDocTaskGraphAnnotationTargets(candidate.annotation, annotationById);
      for (const targetAnnotationKind of pattern.requiredTargetAnnotationKinds ?? []) {
        if (!targetEntries.some((entry) => entry.annotation.kind === targetAnnotationKind)) {
          requirementDiagnostics.push(textDocTaskGraphDiagnostic(
            profile.profileId,
            "textdoc.task-graph.annotation-pattern-target-annotation-kind",
            `Annotation ${candidate.annotation.id} does not target a required ${targetAnnotationKind} annotation for task graph pattern ${pattern.id}.`,
            {
              requirementId: pattern.id,
              layerId: candidate.layer.id,
              annotationId: candidate.annotation.id,
            },
          ));
        }
      }
      for (const reference of pattern.requiredProvenanceReferences ?? []) {
        if (!textDocTaskGraphHasProvenanceReference(candidate.annotation, reference)) {
          requirementDiagnostics.push(textDocTaskGraphDiagnostic(
            profile.profileId,
            "textdoc.task-graph.annotation-pattern-provenance-reference",
            `Annotation ${candidate.annotation.id} does not declare required provenance reference ${reference.kind}:${reference.id} for task graph pattern ${pattern.id}.`,
            {
              requirementId: pattern.id,
              layerId: candidate.layer.id,
              annotationId: candidate.annotation.id,
            },
          ));
        }
      }
    }
    recordRequirement(requirementDiagnostics);
  }

  for (const rule of profile.relationArgumentRules ?? []) {
    const requirementDiagnostics: TextDocTaskGraphValidationDiagnostic[] = [];
    const relationEntries = textDocTaskGraphMatchingEntries(entries, {
      annotationKind: "relation",
      ...(rule.layerId !== undefined ? { layerId: rule.layerId } : {}),
      ...(rule.viewId !== undefined ? { viewId: rule.viewId } : {}),
      ...(rule.lifecycleStates !== undefined ? { lifecycleStates: rule.lifecycleStates } : {}),
    }).filter((entry) =>
      entry.annotation.kind === "relation" &&
      (rule.relationType === undefined || entry.annotation.relationType === rule.relationType),
    );
    const minRelations = rule.minRelations ?? 1;
    if (relationEntries.length < minRelations) {
      requirementDiagnostics.push(textDocTaskGraphDiagnostic(
        profile.profileId,
        "textdoc.task-graph.relation-min-count",
        `Task graph profile ${profile.profileId} requires relation rule ${rule.id} to match at least ${minRelations} relations, received ${relationEntries.length}.`,
        {
          requirementId: rule.id,
          ...(rule.layerId !== undefined ? { layerId: rule.layerId } : {}),
        },
      ));
    }
    for (const relationEntry of relationEntries) {
      if (relationEntry.annotation.kind !== "relation") continue;
      for (const roleRule of rule.requiredRoles) {
        const matchingArguments = relationEntry.annotation.arguments.filter(
          (argument) => argument.role === roleRule.role,
        );
        const minCount = roleRule.minCount ?? 1;
        if (matchingArguments.length < minCount) {
          requirementDiagnostics.push(textDocTaskGraphDiagnostic(
            profile.profileId,
            "textdoc.task-graph.relation-role-missing",
            `Relation ${relationEntry.annotation.id} does not declare required role ${roleRule.role} at least ${minCount} times for task graph rule ${rule.id}.`,
            {
              requirementId: rule.id,
              layerId: relationEntry.layer.id,
              annotationId: relationEntry.annotation.id,
            },
          ));
          continue;
        }
        if (roleRule.targetAnnotationKinds !== undefined) {
          const hasExpectedKind = matchingArguments.some((argument) => {
            const target = annotationById.get(argument.annotationId);
            return target !== undefined && roleRule.targetAnnotationKinds?.includes(target.annotation.kind);
          });
          if (!hasExpectedKind) {
            requirementDiagnostics.push(textDocTaskGraphDiagnostic(
              profile.profileId,
              "textdoc.task-graph.relation-role-target-kind",
              `Relation ${relationEntry.annotation.id} role ${roleRule.role} does not point to an allowed annotation kind for task graph rule ${rule.id}.`,
              {
                requirementId: rule.id,
                layerId: relationEntry.layer.id,
                annotationId: relationEntry.annotation.id,
              },
            ));
          }
        }
      }
    }
    recordRequirement(requirementDiagnostics);
  }

  for (const rule of profile.coverageRules ?? []) {
    const requirementDiagnostics: TextDocTaskGraphValidationDiagnostic[] = [];
    const sourceEntries = textDocTaskGraphMatchingEntries(entries, {
      annotationKind: rule.sourceAnnotationKind,
      ...(rule.sourceLayerId !== undefined ? { layerId: rule.sourceLayerId } : {}),
      ...(rule.sourceLifecycleStates !== undefined ? { lifecycleStates: rule.sourceLifecycleStates } : {}),
    });
    const coveringEntries = textDocTaskGraphMatchingEntries(entries, {
      annotationKind: rule.coveringAnnotationKind,
      ...(rule.coveringLayerId !== undefined ? { layerId: rule.coveringLayerId } : {}),
      ...(rule.coveringLifecycleStates !== undefined ? { lifecycleStates: rule.coveringLifecycleStates } : {}),
    });
    if (sourceEntries.length === 0) {
      requirementDiagnostics.push(textDocTaskGraphDiagnostic(
        profile.profileId,
        "textdoc.task-graph.coverage-source-missing",
        `Task graph profile ${profile.profileId} coverage rule ${rule.id} matched no source annotations.`,
        {
          requirementId: rule.id,
          ...(rule.sourceLayerId !== undefined ? { layerId: rule.sourceLayerId } : {}),
        },
      ));
    }
    const minCoveringAnnotations = rule.minCoveringAnnotations ?? 1;
    for (const source of sourceEntries) {
      const coverageCount = coveringEntries.filter((coverer) =>
        textDocTaskGraphCoversSource(source, coverer, rule.mode),
      ).length;
      if (coverageCount < minCoveringAnnotations) {
        requirementDiagnostics.push(textDocTaskGraphDiagnostic(
          profile.profileId,
          "textdoc.task-graph.coverage-missing",
          `Annotation ${source.annotation.id} has ${coverageCount} covering annotations for task graph coverage rule ${rule.id}; required ${minCoveringAnnotations}.`,
          {
            requirementId: rule.id,
            layerId: source.layer.id,
            annotationId: source.annotation.id,
          },
        ));
      }
    }
    recordRequirement(requirementDiagnostics);
  }

  return textDocTaskGraphReport(document, profile, counts, passCount, failCount, diagnostics);
}

function firstTextDocTarget(annotation: TextDocAnnotation): TextDocTarget | undefined {
  return annotation.targets[0];
}

function compareTextDocDocumentBundleEntries(
  left: TextDocDocumentBundleDocumentV1,
  right: TextDocDocumentBundleDocumentV1,
): number {
  return (
    left.documentId.localeCompare(right.documentId) ||
    left.revision.localeCompare(right.revision)
  );
}

function textDocDocumentBundleEntryKey(entry: Pick<TextDocDocumentBundleDocumentV1, "documentId" | "revision">): string {
  return `${entry.documentId}\u0000${entry.revision}`;
}

export function exportTextDocDocumentBundlePayloadV1(
  documents: readonly TextDocDocumentV1[],
): TextDocDocumentBundlePayloadV1 {
  if (!Array.isArray(documents) || documents.length === 0) {
    throw new TypeError("textdoc document bundle requires at least one document");
  }
  const seen = new Set<string>();
  const entries = documents.map((document): TextDocDocumentBundleDocumentV1 => {
    const validation = validateTextDocDocumentV1(document);
    if (!validation.ok) {
      throw new TypeError(
        `Document ${isRecord(document) && typeof document.documentId === "string" ? document.documentId : "<unknown>"} cannot be exported as a textdoc document bundle`,
      );
    }
    const entry = {
      documentId: document.documentId,
      revision: document.revision,
      document: cloneJsonValue(document),
    };
    const key = textDocDocumentBundleEntryKey(entry);
    if (seen.has(key)) {
      throw new TypeError(`textdoc document bundle repeats document revision ${document.documentId}@${document.revision}`);
    }
    seen.add(key);
    return entry;
  });
  return {
    documents: entries.sort(compareTextDocDocumentBundleEntries),
  };
}

function isTextDocDocumentBundleDocumentV1(
  value: unknown,
): value is TextDocDocumentBundleDocumentV1 {
  return (
    isRecord(value) &&
    isNonEmptyString(value.documentId) &&
    isNonEmptyString(value.revision) &&
    isTextDocDocumentV1(value.document) &&
    value.document.documentId === value.documentId &&
    value.document.revision === value.revision
  );
}

export function isTextDocDocumentBundlePayloadV1(
  value: unknown,
): value is TextDocDocumentBundlePayloadV1 {
  return (
    isRecord(value) &&
    Array.isArray(value.documents) &&
    value.documents.length > 0 &&
    value.documents.every((entry) => isTextDocDocumentBundleDocumentV1(entry))
  );
}

export function importTextDocDocumentBundlePayloadV1(
  bundle: unknown,
): TextDocDocumentBundleImportResult {
  const diagnostics: TextDocDocumentValidationDiagnostic[] = [];
  if (!isTextDocDocumentBundlePayloadV1(bundle)) {
    return {
      ok: false,
      diagnostics: [
        textDocValidationDiagnostic(
          "textdoc.document-bundle.shape",
          "Document bundle payload does not satisfy TextDocDocumentBundlePayloadV1.",
        ),
      ],
    };
  }

  const seen = new Set<string>();
  const documents: TextDocDocumentV1[] = [];
  for (const entry of bundle.documents) {
    const key = textDocDocumentBundleEntryKey(entry);
    if (seen.has(key)) {
      diagnostics.push(textDocValidationDiagnostic(
        "textdoc.document-bundle.document-duplicate",
        `Document bundle repeats document revision ${entry.documentId}@${entry.revision}.`,
        { targetId: entry.documentId },
      ));
    }
    seen.add(key);
    const validation = validateTextDocDocumentV1(entry.document);
    diagnostics.push(...validation.diagnostics);
    documents.push(cloneJsonValue(entry.document));
  }

  if (hasErrorDiagnostics(diagnostics)) {
    return { ok: false, diagnostics };
  }

  return {
    ok: true,
    documents: documents.sort((left, right) =>
      left.documentId.localeCompare(right.documentId) || left.revision.localeCompare(right.revision),
    ),
    diagnostics,
  };
}

function textDocMappingLossClass(loss: TextDocLossMarker): TextDocMappingLossReportLossClass {
  switch (loss.kind) {
    case "lossy-normalization":
      return "offset-loss";
    case "truncated-context":
      return "view-loss";
    case "omitted-alternative":
      return "feature-loss";
    case "external-reference":
      return "unknown-loss";
  }
}

function textDocMappingLossEntry(
  scope: string,
  loss: TextDocLossMarker,
  sourcePath: string,
  targetPath: string,
  affectedTargets: readonly TextDocReferenceRef[],
): TextDocMappingLossReportEntryV1 {
  return {
    code: `textdoc.mapping-loss.${scope}.${loss.kind}`,
    severity: "warning",
    class: textDocMappingLossClass(loss),
    reason: loss.reason,
    sourcePath,
    targetPath,
    affectedTargets,
  };
}

function textDocDocumentArtifactRef(document: TextDocDocumentV1): TextDocMappingLossReportArtifactRefV1 {
  return {
    kind: textDocDocumentPayloadKind,
    id: `${document.documentId}@${document.revision}`,
    schemaId: "https://github.com/Ismail-elkorchi/text-computing/schemas/textdoc-document-v1.schema.json",
  };
}

function textDocMappingLossReportArtifactRef(mappingId: string): TextDocMappingLossReportArtifactRefV1 {
  return {
    kind: "textdoc-mapping-loss-report-v1",
    id: mappingId,
    schemaId: "urn:ismail-elkorchi:textdoc:mapping-loss-report:v1",
  };
}

function isTextDocMappingLossReportSeverity(value: unknown): value is TextDocMappingLossReportSeverity {
  return value === "info" || value === "warning" || value === "error";
}

function isTextDocMappingLossReportLossClass(value: unknown): value is TextDocMappingLossReportLossClass {
  return (
    value === "offset-loss" ||
    value === "view-loss" ||
    value === "feature-loss" ||
    value === "type-loss" ||
    value === "ordering-loss" ||
    value === "unknown-loss"
  );
}

function isTextDocMappingLossReportArtifactRefV1(
  value: unknown,
): value is TextDocMappingLossReportArtifactRefV1 {
  return (
    isRecord(value) &&
    isNonEmptyString(value.kind) &&
    isNonEmptyString(value.id) &&
    (value.schemaId === undefined || isNonEmptyString(value.schemaId))
  );
}

function isTextDocMappingLossReportEntryV1(value: unknown): value is TextDocMappingLossReportEntryV1 {
  return (
    isRecord(value) &&
    isNonEmptyString(value.code) &&
    isTextDocMappingLossReportSeverity(value.severity) &&
    isTextDocMappingLossReportLossClass(value.class) &&
    isNonEmptyString(value.reason) &&
    (value.sourcePath === undefined || isNonEmptyString(value.sourcePath)) &&
    (value.targetPath === undefined || isNonEmptyString(value.targetPath)) &&
    (value.affectedTargets === undefined ||
      (Array.isArray(value.affectedTargets) &&
        value.affectedTargets.every((entry) => isTextDocReferenceRef(entry))))
  );
}

export function isTextDocMappingLossReportPayloadV1(
  value: unknown,
): value is TextDocMappingLossReportPayloadV1 {
  return (
    isRecord(value) &&
    isNonEmptyString(value.mappingId) &&
    isTextDocMappingLossReportArtifactRefV1(value.source) &&
    isTextDocMappingLossReportArtifactRefV1(value.target) &&
    Array.isArray(value.losses) &&
    value.losses.every((entry) => isTextDocMappingLossReportEntryV1(entry))
  );
}

export function exportTextDocMappingLossReportPayloadV1(
  document: TextDocDocumentV1,
  options: TextDocMappingLossReportPayloadOptions = {},
): TextDocMappingLossReportPayloadV1 {
  const validation = validateTextDocDocumentV1(document);
  if (!validation.ok) {
    throw new TypeError("textdoc mapping-loss report requires a valid TextDocDocumentV1");
  }
  const mappingId = options.mappingId ?? `textdoc.mapping-loss:${document.documentId}:${document.revision}`;
  if (!isNonEmptyString(mappingId)) {
    throw new TypeError("textdoc mapping-loss report mappingId must be a non-empty string");
  }

  const losses: TextDocMappingLossReportEntryV1[] = [];
  document.views.forEach((view, viewIndex) => {
    view.loss?.forEach((loss, lossIndex) => {
      losses.push(textDocMappingLossEntry(
        "view",
        loss,
        `/views/${viewIndex}/loss/${lossIndex}`,
        `/views/${viewIndex}`,
        [{ kind: "view", id: view.id }],
      ));
    });
  });
  document.spanMaps?.forEach((spanMap, spanMapIndex) => {
    spanMap.loss?.forEach((loss, lossIndex) => {
      losses.push(textDocMappingLossEntry(
        "span-map",
        loss,
        `/spanMaps/${spanMapIndex}/loss/${lossIndex}`,
        `/spanMaps/${spanMapIndex}`,
        [{ kind: "span-map", id: spanMap.id }],
      ));
    });
    spanMap.segments.forEach((segment, segmentIndex) => {
      segment.loss?.forEach((loss, lossIndex) => {
        losses.push(textDocMappingLossEntry(
          "span-map-segment",
          loss,
          `/spanMaps/${spanMapIndex}/segments/${segmentIndex}/loss/${lossIndex}`,
          `/spanMaps/${spanMapIndex}/segments/${segmentIndex}`,
          [{ kind: "span-map", id: spanMap.id }],
        ));
      });
    });
  });
  document.layers.forEach((layer, layerIndex) => {
    layer.annotations.forEach((annotation, annotationIndex) => {
      annotation.loss?.forEach((loss, lossIndex) => {
        losses.push(textDocMappingLossEntry(
          "annotation",
          loss,
          `/layers/${layerIndex}/annotations/${annotationIndex}/loss/${lossIndex}`,
          `/layers/${layerIndex}/annotations/${annotationIndex}`,
          [{ kind: "annotation", id: annotation.id }],
        ));
      });
    });
  });

  const payload = {
    mappingId,
    source: options.source ?? textDocDocumentArtifactRef(document),
    target: options.target ?? textDocMappingLossReportArtifactRef(mappingId),
    losses: losses.sort((left, right) =>
      left.sourcePath?.localeCompare(right.sourcePath ?? "") ||
      left.code.localeCompare(right.code) ||
      left.reason.localeCompare(right.reason),
    ),
  };
  if (!isTextDocMappingLossReportPayloadV1(payload)) {
    throw new TypeError("textdoc mapping-loss report payload could not be produced");
  }
  return payload;
}

function isTextDocEvidenceBundleExactnessClass(
  value: unknown,
): value is TextDocEvidenceBundleExactnessClass {
  return value === "E0" || value === "E1" || value === "E2" || value === "E3";
}

function isTextDocEvidenceBundleTargetV1(
  value: unknown,
): value is TextDocEvidenceBundleTargetV1 {
  return isRecord(value) && isNonEmptyString(value.kind) && isNonEmptyString(value.id);
}

function isTextDocEvidenceBundleRecordV1(
  value: unknown,
): value is TextDocEvidenceBundleRecordV1 {
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.kind) &&
    isTextDocEvidenceBundleExactnessClass(value.exactness) &&
    Array.isArray(value.targets) &&
    value.targets.every((entry) => isTextDocEvidenceBundleTargetV1(entry)) &&
    isRecord(value.payload) &&
    isRecord(value.provenance) &&
    (value.uncertainty === undefined || isRecord(value.uncertainty)) &&
    (value.support === undefined ||
      (Array.isArray(value.support) && value.support.every((entry) => isTextDocReferenceRef(entry)))) &&
    (value.loss === undefined ||
      (Array.isArray(value.loss) && value.loss.every((entry) => isTextDocMappingLossReportEntryV1(entry))))
  );
}

export function isTextDocEvidenceBundlePayloadV1(
  value: unknown,
): value is TextDocEvidenceBundlePayloadV1 {
  return (
    isRecord(value) &&
    Array.isArray(value.records) &&
    value.records.every((entry) => isTextDocEvidenceBundleRecordV1(entry))
  );
}

function textDocAnnotationTargetRef(
  document: TextDocDocumentV1,
  target: TextDocTarget,
): TextDocEvidenceBundleTargetV1 {
  switch (target.kind) {
    case "annotation":
      return { kind: "annotation", id: target.annotationId };
    case "document":
      return { kind: "document", id: `${document.documentId}@${document.revision}` };
    case "span":
      return {
        kind: "span",
        id: `${document.documentId}@${document.revision}:${target.viewId}:${target.startCU}-${target.endCU}`,
      };
  }
}

function textDocReferenceKey(reference: TextDocReferenceRef): string {
  return `${reference.kind}\u0000${reference.id}`;
}

function textDocSortedUniqueReferences(
  references: readonly TextDocReferenceRef[],
): readonly TextDocReferenceRef[] {
  const byKey = new Map<string, TextDocReferenceRef>();
  for (const reference of references) byKey.set(textDocReferenceKey(reference), reference);
  return [...byKey.values()].sort((left, right) =>
    left.kind.localeCompare(right.kind) || left.id.localeCompare(right.id),
  );
}

function textDocEvidenceExactness(annotation: TextDocAnnotation): TextDocEvidenceBundleExactnessClass {
  if (annotation.lifecycle.state !== "active") return "E3";
  if (annotation.loss !== undefined && annotation.loss.length > 0) return "E2";
  if (annotation.ambiguitySet !== undefined && annotation.ambiguitySet.role !== "selected") return "E2";
  if (annotation.confidence !== undefined) {
    if (annotation.confidence.value >= 1) return "E0";
    if (annotation.confidence.value >= 0.8) return "E1";
    return "E2";
  }
  if (annotation.ambiguitySet?.role === "selected") return "E1";
  return "E0";
}

function textDocEvidenceUncertainty(
  annotation: TextDocAnnotation,
): Readonly<Record<string, unknown>> | undefined {
  const uncertainty: Record<string, unknown> = {};
  if (annotation.confidence !== undefined) uncertainty.confidence = cloneJsonValue(annotation.confidence);
  if (annotation.ambiguitySet !== undefined) uncertainty.ambiguitySet = cloneJsonValue(annotation.ambiguitySet);
  if (annotation.lifecycle.state !== "active") uncertainty.lifecycle = cloneJsonValue(annotation.lifecycle);
  return Object.keys(uncertainty).length > 0 ? uncertainty : undefined;
}

function textDocEvidenceSupport(
  annotation: TextDocAnnotation,
  extraReferences: readonly TextDocReferenceRef[] = [],
): readonly TextDocReferenceRef[] | undefined {
  const documentRefSupport = annotation.documentRefs?.map((reference): TextDocReferenceRef => ({
    kind: `external-document:${reference.role}`,
    id: `${reference.documentId}${reference.revision === undefined ? "" : `@${reference.revision}`}`,
  })) ?? [];
  const support = textDocSortedUniqueReferences([
    ...(annotation.provenance?.references ?? []),
    ...documentRefSupport,
    ...extraReferences,
  ]);
  return support.length > 0 ? support : undefined;
}

function textDocEvidenceProvenance(
  document: TextDocDocumentV1,
  layer: TextDocLayer,
  annotation: TextDocAnnotation,
): Readonly<Record<string, unknown>> {
  const references = textDocSortedUniqueReferences([
    { kind: "textdoc-document", id: `${document.documentId}@${document.revision}` },
    { kind: "textdoc-layer", id: layer.id },
    ...(annotation.provenance?.references ?? []),
  ]);
  return {
    ...(annotation.provenance?.source ?? document.source
      ? { source: cloneJsonValue(annotation.provenance?.source ?? document.source) }
      : {}),
    references,
  };
}

export function exportTextDocEvidenceBundlePayloadV1(
  document: TextDocDocumentV1,
  options: TextDocEvidenceBundlePayloadOptions = {},
): TextDocEvidenceBundlePayloadV1 {
  const validation = validateTextDocDocumentV1(document);
  if (!validation.ok) {
    throw new TypeError("textdoc evidence-bundle requires a valid TextDocDocumentV1");
  }
  const recordIdPrefix = options.recordIdPrefix ?? `textdoc.evidence:${document.documentId}:${document.revision}`;
  if (!isNonEmptyString(recordIdPrefix)) {
    throw new TypeError("textdoc evidence-bundle recordIdPrefix must be a non-empty string");
  }

  const records: TextDocEvidenceBundleRecordV1[] = [];
  document.layers.forEach((layer, layerIndex) => {
    layer.annotations.forEach((annotation, annotationIndex) => {
      const loss = annotation.loss?.map((entry, lossIndex) =>
        textDocMappingLossEntry(
          "evidence-annotation",
          entry,
          `/layers/${layerIndex}/annotations/${annotationIndex}/loss/${lossIndex}`,
          `/layers/${layerIndex}/annotations/${annotationIndex}`,
          [{ kind: "annotation", id: annotation.id }],
        ),
      );
      const uncertainty = textDocEvidenceUncertainty(annotation);
      const support = textDocEvidenceSupport(
        annotation,
        options.supportByAnnotationId?.[annotation.id] ?? [],
      );
      records.push({
        id: `${recordIdPrefix}:${layer.id}:${annotation.id}`,
        kind: `textdoc.annotation.${annotation.kind}`,
        exactness: options.exactnessByAnnotationId?.[annotation.id] ?? textDocEvidenceExactness(annotation),
        targets: [
          { kind: "annotation", id: annotation.id },
          ...annotation.targets.map((target) => textDocAnnotationTargetRef(document, target)),
        ],
        payload: {
          documentId: document.documentId,
          documentRevision: document.revision,
          layerId: layer.id,
          layerKind: layer.kind,
          annotation: cloneJsonValue(annotation),
        },
        provenance: textDocEvidenceProvenance(document, layer, annotation),
        ...(uncertainty !== undefined ? { uncertainty } : {}),
        ...(support !== undefined ? { support } : {}),
        ...(loss !== undefined && loss.length > 0 ? { loss } : {}),
      });
    });
  });

  const payload = {
    records: records.sort((left, right) => left.id.localeCompare(right.id)),
  };
  if (!isTextDocEvidenceBundlePayloadV1(payload)) {
    throw new TypeError("textdoc evidence-bundle payload could not be produced");
  }
  return payload;
}

export function exportTextDocAnnotationBundlePayloadV1(
  document: TextDocDocumentV1,
): TextDocAnnotationBundlePayloadV1 {
  const annotations: TextDocAnnotationBundleAnnotationV1[] = [];
  for (const layer of document.layers) {
    for (const annotation of layer.annotations) {
      const target = firstTextDocTarget(annotation);
      if (target === undefined) {
        throw new TypeError(`Annotation ${annotation.id} cannot be exported without at least one target.`);
      }
      annotations.push({
        annotationId: annotation.id,
        layerId: layer.id,
        kind: annotation.kind,
        target: cloneJsonValue(target),
        annotation: cloneJsonValue(annotation),
      });
    }
  }
  return {
    documentId: document.documentId,
    documentRevision: document.revision,
    annotations,
  };
}

function isTextDocAnnotationBundleAnnotationV1(
  value: unknown,
): value is TextDocAnnotationBundleAnnotationV1 {
  return (
    isRecord(value) &&
    isNonEmptyString(value.annotationId) &&
    isNonEmptyString(value.layerId) &&
    isTextDocLayerKind(value.kind) &&
    isTextDocTarget(value.target) &&
    isTextDocAnnotation(value.annotation)
  );
}

export function isTextDocAnnotationBundlePayloadV1(
  value: unknown,
): value is TextDocAnnotationBundlePayloadV1 {
  return (
    isRecord(value) &&
    isNonEmptyString(value.documentId) &&
    isNonEmptyString(value.documentRevision) &&
    Array.isArray(value.annotations) &&
    value.annotations.every((entry) => isTextDocAnnotationBundleAnnotationV1(entry))
  );
}

export function applyTextDocAnnotationBundlePayloadV1(
  document: TextDocDocumentV1,
  bundle: unknown,
): TextDocAnnotationBundleApplyResult {
  const diagnostics: TextDocDocumentValidationDiagnostic[] = [];
  if (!isTextDocAnnotationBundlePayloadV1(bundle)) {
    return {
      ok: false,
      diagnostics: [
        textDocValidationDiagnostic(
          "textdoc.annotation-bundle.shape",
          "Annotation bundle payload does not satisfy TextDocAnnotationBundlePayloadV1.",
        ),
      ],
    };
  }

  if (bundle.documentId !== document.documentId) {
    diagnostics.push(textDocValidationDiagnostic(
      "textdoc.annotation-bundle.document-mismatch",
      `Annotation bundle document ${bundle.documentId} does not match ${document.documentId}.`,
    ));
  }
  if (bundle.documentRevision !== document.revision) {
    diagnostics.push(textDocValidationDiagnostic(
      "textdoc.annotation-bundle.revision-mismatch",
      `Annotation bundle revision ${bundle.documentRevision} does not match ${document.revision}.`,
    ));
  }

  const layerById = new Map(document.layers.map((layer) => [layer.id, layer] as const));
  const annotationsByLayer = new Map<string, TextDocAnnotation[]>();
  const seenAnnotationIds = new Set<string>();
  for (const entry of bundle.annotations) {
    const layer = layerById.get(entry.layerId);
    if (seenAnnotationIds.has(entry.annotationId)) {
      diagnostics.push(textDocValidationDiagnostic(
        "textdoc.annotation-bundle.annotation-duplicate",
        `Annotation bundle repeats annotation ${entry.annotationId}.`,
        { annotationId: entry.annotationId },
      ));
    }
    seenAnnotationIds.add(entry.annotationId);
    if (entry.annotation.id !== entry.annotationId) {
      diagnostics.push(textDocValidationDiagnostic(
        "textdoc.annotation-bundle.annotation-id-mismatch",
        `Annotation bundle entry ${entry.annotationId} contains annotation ${entry.annotation.id}.`,
        { annotationId: entry.annotationId, targetId: entry.annotation.id },
      ));
    }
    if (layer === undefined) {
      diagnostics.push(textDocValidationDiagnostic(
        "textdoc.annotation-bundle.layer-missing",
        `Annotation bundle references missing layer ${entry.layerId}.`,
        { layerId: entry.layerId, annotationId: entry.annotationId },
      ));
      continue;
    }
    if (layer.kind !== entry.kind || entry.annotation.kind !== layer.kind) {
      diagnostics.push(textDocValidationDiagnostic(
        "textdoc.annotation-bundle.kind-mismatch",
        `Annotation bundle entry ${entry.annotationId} does not match layer kind ${layer.kind}.`,
        { layerId: layer.id, annotationId: entry.annotationId },
      ));
    }
    const annotationTarget = firstTextDocTarget(entry.annotation);
    if (annotationTarget === undefined || stableTextDocJson(annotationTarget) !== stableTextDocJson(entry.target)) {
      diagnostics.push(textDocValidationDiagnostic(
        "textdoc.annotation-bundle.target-mismatch",
        `Annotation bundle entry ${entry.annotationId} does not preserve its representative target.`,
        { layerId: layer.id, annotationId: entry.annotationId },
      ));
    }
    const annotations = annotationsByLayer.get(entry.layerId) ?? [];
    annotations.push(cloneJsonValue(entry.annotation));
    annotationsByLayer.set(entry.layerId, annotations);
  }

  if (hasErrorDiagnostics(diagnostics)) {
    return { ok: false, diagnostics };
  }

  const roundTrippedDocument: TextDocDocumentV1 = {
    ...document,
    layers: document.layers.map((layer) => ({
      ...layer,
      annotations: annotationsByLayer.get(layer.id) ?? [],
    })),
  };
  const validation = validateTextDocDocumentV1(roundTrippedDocument);
  if (!validation.ok) {
    return {
      ok: false,
      diagnostics: validation.diagnostics,
    };
  }
  return {
    ok: true,
    document: roundTrippedDocument,
    diagnostics: validation.diagnostics,
  };
}

export function toTextDocDocumentV1(
  annotationSet: TextDocTokenSentenceAnnotationSet,
): TextDocDocumentV1 {
  let textLengthCU = 0;
  for (const span of [...annotationSet.tokens, ...annotationSet.sentences]) {
    if (span.endCU > textLengthCU) textLengthCU = span.endCU;
  }

  return {
    schemaVersion: documentSchemaVersion,
    documentId: annotationSet.documentId,
    revision: "token-sentence-v1",
    textLengthCU,
    units: annotationSet.units,
    views: [
      {
        id: "source-view",
        kind: "raw",
        description: "Original text source",
      },
      {
        id: "tokenization-view",
        kind: "task",
        description: "Tokenization and sentence segmentation annotations",
        parentViewId: "source-view",
        spanMapIds: ["span-map-source-tokenization"],
      },
    ],
    spanMaps: [
      {
        id: "span-map-source-tokenization",
        sourceViewId: "source-view",
        targetViewId: "tokenization-view",
        lifecycle: { state: "active" },
        segments:
          textLengthCU === 0
            ? []
            : [
                {
                  source: { startCU: 0, endCU: textLengthCU },
                  target: { startCU: 0, endCU: textLengthCU },
                  kind: "unchanged",
                  reversible: true,
                },
              ],
      },
    ],
    layers: [
      {
        id: "tokens",
        kind: "token",
        viewId: "tokenization-view",
        annotations: annotationSet.tokens.map((token) => ({
          id: token.id,
          kind: "token",
          tokenKind: token.kind,
          lifecycle: {
            state: "active",
          },
          targets: [
            {
              kind: "span",
              viewId: "tokenization-view",
              startCU: token.startCU,
              endCU: token.endCU,
            },
          ],
          ...(token.text ? { text: token.text } : {}),
          ...(token.notes ? { notes: token.notes } : {}),
        })),
      },
      {
        id: "sentences",
        kind: "sentence",
        viewId: "tokenization-view",
        annotations: annotationSet.sentences.map((sentence) => ({
          id: sentence.id,
          kind: "sentence",
          sentenceKind: sentence.kind,
          lifecycle: {
            state: "active",
          },
          targets: [
            {
              kind: "span",
              viewId: "tokenization-view",
              startCU: sentence.startCU,
              endCU: sentence.endCU,
            },
          ],
          ...(sentence.text ? { text: sentence.text } : {}),
          ...(sentence.notes ? { notes: sentence.notes } : {}),
        })),
      },
    ],
    ...(annotationSet.source ? { source: annotationSet.source } : {}),
    ...(annotationSet.unicodeVersion ? { unicodeVersion: annotationSet.unicodeVersion } : {}),
    ...(annotationSet.notes ? { notes: annotationSet.notes } : {}),
  };
}

function validateRawTextDocumentOptions(options: TextDocRawTextDocumentOptions): void {
  if (!isNonEmptyString(options.documentId)) {
    throw new TypeError("raw text document options require a non-empty documentId");
  }
  if (options.sourceId !== undefined && !isNonEmptyString(options.sourceId)) {
    throw new TypeError("raw text document sourceId must be non-empty when provided");
  }
  if (options.revision !== undefined && !isNonEmptyString(options.revision)) {
    throw new TypeError("raw text document revision must be non-empty when provided");
  }
  if (options.unicodeVersion !== undefined && !isNonEmptyString(options.unicodeVersion)) {
    throw new TypeError("raw text document unicodeVersion must be non-empty when provided");
  }
  if (options.sourceSha256 !== undefined && !isSha256Hex(options.sourceSha256)) {
    throw new TypeError("raw text document sourceSha256 must be a lowercase 64-character hex digest");
  }
}

function rawTextDiagnostics(text: string): readonly TextDocRawTextDiagnostic[] {
  return scanLoneSurrogates(text).map((finding) => ({
    code: "textdoc.raw-text.lone-surrogate",
    severity: "warning",
    message: `Input contains a lone ${finding.kind} surrogate at UTF-16 code unit ${finding.span.startCU}.`,
    startCU: finding.span.startCU,
    endCU: finding.span.endCU,
  }));
}

function rawTextSourceRef(
  options: TextDocRawTextDocumentOptions,
  sourceSha256: string | undefined,
): TextDocSourceRef {
  return {
    id: options.sourceId ?? options.documentId,
    ...(sourceSha256 ? { sha256: sourceSha256 } : {}),
  };
}

function textDocRawTextNotes(diagnostics: readonly TextDocRawTextDiagnostic[]): readonly string[] {
  return [
    "Created from raw text with @ismail-elkorchi/textfacts UAX #29 word and sentence segmentation.",
    ...(diagnostics.length > 0
      ? ["Input contains Unicode integrity diagnostics; inspect the returned diagnostics before broad statements."]
      : []),
  ];
}

function createTextDocDocumentFromTextWithSourceHash(
  text: string,
  options: TextDocRawTextDocumentOptions,
  sourceSha256: string | undefined,
  diagnostics: readonly TextDocRawTextDiagnostic[] = rawTextDiagnostics(text),
): TextDocRawTextDocumentResult {
  validateRawTextDocumentOptions(options);

  const wordSegments = segmentWordsUAX29(text);
  const sentenceSegments = segmentSentencesUAX29(text);
  const unicodeVersion = options.unicodeVersion ?? wordSegments.provenance.unicodeVersion;
  const annotationSet: TextDocTokenSentenceAnnotationSet = {
    schemaVersion: tokenSentenceAnnotationSchemaVersion,
    documentId: options.documentId,
    source: rawTextSourceRef(options, sourceSha256),
    unicodeVersion,
    units: {
      text: "utf16-code-unit",
    },
    tokens: [...wordSegments].map((span, index) => ({
      id: `token-${index + 1}`,
      kind: "uax29-word-boundary-token",
      startCU: span.startCU,
      endCU: span.endCU,
      text: text.slice(span.startCU, span.endCU),
    })),
    sentences: [...sentenceSegments].map((span, index) => ({
      id: `sentence-${index + 1}`,
      kind: "uax29-sentence",
      startCU: span.startCU,
      endCU: span.endCU,
      text: text.slice(span.startCU, span.endCU),
    })),
    notes: textDocRawTextNotes(diagnostics),
  };
  const document = toTextDocDocumentV1(annotationSet);
  return {
    document: {
      ...document,
      revision: options.revision ?? "raw-text-uax29-v1",
      textLengthCU: text.length,
      ...(options.includeText === false ? {} : { text }),
    },
    diagnostics,
  };
}

async function computeRawTextSourceSha256(
  text: string,
  diagnostics: readonly TextDocRawTextDiagnostic[],
): Promise<{
  readonly sourceSha256: string | undefined;
  readonly diagnostics: readonly TextDocRawTextDiagnostic[];
}> {
  const digest = await sha256Hex(text);
  if (digest.startsWith("sha256:")) {
    const sourceSha256 = digest.slice("sha256:".length);
    if (isSha256Hex(sourceSha256)) {
      return { sourceSha256, diagnostics };
    }
  }
  return {
    sourceSha256: undefined,
    diagnostics: [
      ...diagnostics,
      {
        code: "textdoc.raw-text.sha256-unavailable",
        severity: "warning",
        message: "SHA-256 source digest was unavailable in the current runtime.",
      },
    ],
  };
}

export function createTextDocDocumentFromTextSync(
  text: string,
  options: TextDocRawTextDocumentOptions,
): TextDocRawTextDocumentResult {
  if (typeof text !== "string") {
    throw new TypeError("raw text document input must be a string");
  }
  return createTextDocDocumentFromTextWithSourceHash(text, options, options.sourceSha256);
}

export async function createTextDocDocumentFromText(
  text: string,
  options: TextDocRawTextDocumentOptions,
): Promise<TextDocRawTextDocumentResult> {
  if (typeof text !== "string") {
    throw new TypeError("raw text document input must be a string");
  }
  const initialDiagnostics = rawTextDiagnostics(text);
  const { sourceSha256, diagnostics } =
    options.sourceSha256 === undefined
      ? await computeRawTextSourceSha256(text, initialDiagnostics)
      : { sourceSha256: options.sourceSha256, diagnostics: initialDiagnostics };
  return createTextDocDocumentFromTextWithSourceHash(text, options, sourceSha256, diagnostics);
}

export function createTextDocDocumentsFromTextsSync(
  inputs: readonly TextDocRawTextDocumentInput[],
): readonly TextDocRawTextDocumentResult[] {
  return inputs.map((input) => createTextDocDocumentFromTextSync(input.text, input));
}

export async function createTextDocDocumentsFromTexts(
  inputs: readonly TextDocRawTextDocumentInput[],
): Promise<readonly TextDocRawTextDocumentResult[]> {
  return Promise.all(inputs.map((input) => createTextDocDocumentFromText(input.text, input)));
}

function sentenceIdFromComments(comments: readonly string[], fallback: string): string {
  const sentIdComment = comments.find((line) => line.startsWith("# sent_id = "));
  return sentIdComment?.slice("# sent_id = ".length).trim() || fallback;
}

function sentenceTextFromComments(comments: readonly string[]): string {
  const textComment = comments.find((line) => line.startsWith("# text = "));
  return textComment?.slice("# text = ".length) ?? "";
}

function isIntegerConlluId(id: string): boolean {
  return /^[1-9][0-9]*$/.test(id);
}

function isRangeConlluId(id: string): boolean {
  return /^[1-9][0-9]*-[1-9][0-9]*$/.test(id);
}

function parseConllu(input: string): ParsedConlluSentence[] {
  const trimmed = input.trimEnd();
  if (trimmed.length === 0) {
    throw new TextDocConlluError("empty-input", "CoNLL-U input must contain at least one sentence.");
  }

  const sentences: ParsedConlluSentence[] = [];
  let sourceLine = 1;
  for (const [sentenceIndex, block] of trimmed.split(/\n\n+/).entries()) {
    const comments: string[] = [];
    const rows: ParsedConlluRow[] = [];
    for (const line of block.split("\n")) {
      if (line.startsWith("#")) {
        comments.push(line);
        sourceLine += 1;
        continue;
      }
      const fields = line.split("\t");
      if (fields.length !== 10) {
        throw new TextDocConlluError(
          "field-count",
          `CoNLL-U row at line ${sourceLine} must contain 10 tab-separated fields.`,
          { line: sourceLine },
        );
      }
      rows.push({
        line: sourceLine,
        fields: {
          id: fields[0] ?? "",
          form: fields[1] ?? "",
          lemma: fields[2] ?? "",
          upos: fields[3] ?? "",
          xpos: fields[4] ?? "",
          feats: fields[5] ?? "",
          head: fields[6] ?? "",
          deprel: fields[7] ?? "",
          deps: fields[8] ?? "",
          misc: fields[9] ?? "",
        },
      });
      sourceLine += 1;
    }
    sourceLine += 1;

    if (rows.length === 0) continue;
    const sentenceId = sentenceIdFromComments(comments, `sentence-${sentenceIndex + 1}`);
    const wordRows = rows.filter((row) => isIntegerConlluId(row.fields.id));
    const tokenIds = new Set(wordRows.map((row) => row.fields.id));
    let rootCount = 0;
    for (const row of wordRows) {
      if (!/^[0-9]+$/.test(row.fields.head)) {
        throw new TextDocConlluError(
          "head-format",
          `CoNLL-U row ${row.fields.id} in ${sentenceId} has invalid HEAD ${row.fields.head}.`,
          { line: row.line, sentenceId },
        );
      }
      if (row.fields.head === "0") {
        rootCount += 1;
      } else if (!tokenIds.has(row.fields.head)) {
        throw new TextDocConlluError(
          "dangling-head",
          `CoNLL-U row ${row.fields.id} in ${sentenceId} points to missing HEAD ${row.fields.head}.`,
          { line: row.line, sentenceId },
        );
      }
      if (row.fields.deprel === "_" || row.fields.deprel.length === 0) {
        throw new TextDocConlluError(
          "deprel-missing",
          `CoNLL-U row ${row.fields.id} in ${sentenceId} must declare DEPREL.`,
          { line: row.line, sentenceId },
        );
      }
    }
    if (rootCount !== 1) {
      throw new TextDocConlluError(
        "root-count",
        `CoNLL-U sentence ${sentenceId} must contain exactly one root; found ${rootCount}.`,
        { sentenceId },
      );
    }

    sentences.push({
      index: sentenceIndex,
      id: sentenceId,
      comments,
      text: sentenceTextFromComments(comments),
      rows,
    });
  }

  if (sentences.length === 0) {
    throw new TextDocConlluError("empty-input", "CoNLL-U input must contain at least one sentence.");
  }
  return sentences;
}

function rowColumns(fields: TextDocConlluFields): readonly string[] {
  return [
    fields.id,
    fields.form,
    fields.lemma,
    fields.upos,
    fields.xpos,
    fields.feats,
    fields.head,
    fields.deprel,
    fields.deps,
    fields.misc,
  ];
}

function conlluNodeId(sentenceId: string, conlluId: string): string {
  return `${sentenceId}:node-${conlluId}`;
}

function conlluTokenId(sentenceId: string, conlluId: string): string {
  return `${sentenceId}:token-${conlluId}`;
}

function findSurfaceSpan(sentenceText: string, form: string, cursor: number): TextDocSpanCU {
  const start = sentenceText.indexOf(form, cursor);
  if (start < 0) return { startCU: cursor, endCU: cursor };
  return { startCU: start, endCU: start + form.length };
}

function rangeContainsId(rangeId: string, id: string): boolean {
  const parts = rangeId.split("-").map((value) => Number.parseInt(value, 10));
  const start = parts[0];
  const end = parts[1];
  const numericId = Number.parseInt(id, 10);
  return (
    start !== undefined &&
    end !== undefined &&
    Number.isInteger(start) &&
    Number.isInteger(end) &&
    numericId >= start &&
    numericId <= end
  );
}

export function importConlluToTextDocDocumentV1(
  input: string,
  options: TextDocConlluImportOptions = {},
): TextDocDocumentV1 {
  const sentences = parseConllu(input);
  const sentenceTexts = sentences.map((sentence) => sentence.text);
  const documentText = sentenceTexts.join("\n");
  let sentenceTextOffset = 0;
  let sourceOrder = 0;

  const tokenAnnotations: TextDocDocumentTokenAnnotation[] = [];
  const sentenceAnnotations: TextDocDocumentSentenceAnnotation[] = [];
  const dependencyNodeAnnotations: TextDocDependencyNodeAnnotation[] = [];
  const dependencyAnnotations: TextDocDependencyAnnotation[] = [];

  for (const sentence of sentences) {
    const sentenceStart = sentenceTextOffset;
    const sentenceEnd = sentenceStart + sentence.text.length;
    sentenceAnnotations.push({
      id: `${sentence.id}:sentence`,
      kind: "sentence",
      sentenceKind: "uax29-sentence",
      lifecycle: { state: "active" },
      targets: [{ kind: "span", viewId: "conllu-view", startCU: sentenceStart, endCU: sentenceEnd }],
      sourceComments: sentence.comments,
      ...(sentence.text ? { text: sentence.text } : {}),
    });

    const ranges = sentence.rows.filter((row) => isRangeConlluId(row.fields.id));
    let cursor = 0;
    const tokenTargetByConlluId = new Map<string, TextDocAnnotationTarget | TextDocSpanTarget>();
    for (const row of sentence.rows) {
      if (!isRangeConlluId(row.fields.id) && !isIntegerConlluId(row.fields.id)) continue;
      if (isIntegerConlluId(row.fields.id) && ranges.some((range) => rangeContainsId(range.fields.id, row.fields.id))) {
        continue;
      }
      const span = findSurfaceSpan(sentence.text, row.fields.form, cursor);
      cursor = span.endCU;
      const tokenId = conlluTokenId(sentence.id, row.fields.id);
      tokenAnnotations.push({
        id: tokenId,
        kind: "token",
        tokenKind: "lexical-token",
        lifecycle: { state: "active" },
        targets: [
          {
            kind: "span",
            viewId: "conllu-view",
            startCU: sentenceStart + span.startCU,
            endCU: sentenceStart + span.endCU,
          },
        ],
        text: row.fields.form,
      });
      tokenTargetByConlluId.set(row.fields.id, {
        kind: "annotation",
        annotationId: tokenId,
      });
    }

    for (const row of sentence.rows) {
      const containingRange = ranges.find((range) => rangeContainsId(range.fields.id, row.fields.id));
      const target =
        tokenTargetByConlluId.get(row.fields.id) ??
        (containingRange ? tokenTargetByConlluId.get(containingRange.fields.id) : undefined) ??
        ({ kind: "document" } as const);
      const nodeId = conlluNodeId(sentence.id, row.fields.id);
      dependencyNodeAnnotations.push({
        id: nodeId,
        kind: "dependency-node",
        nodeKind: isRangeConlluId(row.fields.id)
          ? "multiword-token"
          : isIntegerConlluId(row.fields.id)
            ? "word"
            : "empty-node",
        lifecycle: { state: "active" },
        targets: [target],
        sentenceId: sentence.id,
        sourceOrder,
        fields: row.fields,
      });
      sourceOrder += 1;
    }

    for (const row of sentence.rows.filter((entry) => isIntegerConlluId(entry.fields.id))) {
      const dependentNodeId = conlluNodeId(sentence.id, row.fields.id);
      const headNodeId = row.fields.head === "0" ? null : conlluNodeId(sentence.id, row.fields.head);
      dependencyAnnotations.push({
        id: `${sentence.id}:dep-${row.fields.id}`,
        kind: "dependency",
        lifecycle: { state: "active" },
        targets: [
          { kind: "annotation", annotationId: dependentNodeId },
          ...(headNodeId ? [{ kind: "annotation" as const, annotationId: headNodeId }] : []),
        ],
        dependentNodeId,
        headNodeId,
        relation: row.fields.deprel,
        source: {
          sentenceId: sentence.id,
          conlluId: row.fields.id,
          conlluHead: row.fields.head,
          conlluDeprel: row.fields.deprel,
          conlluDeps: row.fields.deps,
        },
      });
    }

    sentenceTextOffset = sentenceEnd + 1;
  }

  const document: TextDocDocumentV1 = {
    schemaVersion: documentSchemaVersion,
    documentId: options.documentId ?? "conllu:document",
    revision: options.revision ?? "conllu-roundtrip-v1",
    textLengthCU: documentText.length,
    text: documentText,
    ...(options.sourceId
      ? {
          source: {
            id: options.sourceId,
            ...(options.sourceSha256 ? { sha256: options.sourceSha256 } : {}),
          },
        }
      : {}),
    ...(options.unicodeVersion ? { unicodeVersion: options.unicodeVersion } : {}),
    units: { text: "utf16-code-unit" },
    views: [
      { id: "source-view", kind: "raw" },
      {
        id: "conllu-view",
        kind: "imported",
        parentViewId: "source-view",
        spanMapIds: ["span-map-source-conllu"],
        description: "CoNLL-U import view",
      },
    ],
    spanMaps: [
      {
        id: "span-map-source-conllu",
        sourceViewId: "source-view",
        targetViewId: "conllu-view",
        lifecycle: { state: "active" },
        segments:
          documentText.length === 0
            ? []
            : [
                {
                  source: { startCU: 0, endCU: documentText.length },
                  target: { startCU: 0, endCU: documentText.length },
                  kind: "unchanged",
                  reversible: true,
                },
              ],
      },
    ],
    layers: [
      {
        id: "tokens",
        kind: "token",
        viewId: "conllu-view",
        annotations: tokenAnnotations,
      },
      {
        id: "sentences",
        kind: "sentence",
        viewId: "conllu-view",
        annotations: sentenceAnnotations,
      },
      {
        id: "dependency-nodes",
        kind: "dependency-node",
        viewId: "conllu-view",
        annotations: dependencyNodeAnnotations,
        notes: ["CoNLL-U rows in source order."],
      },
      {
        id: "dependencies",
        kind: "dependency",
        viewId: "conllu-view",
        annotations: dependencyAnnotations,
        notes: ["CoNLL-U basic dependency arcs for integer token rows."],
      },
    ],
    notes: ["Imported from CoNLL-U without dependency parser inference."],
  };

  if (!isTextDocDocumentV1(document)) {
    throw new TextDocConlluError(
      "invalid-dependency-document",
      "CoNLL-U import produced an invalid TextDocDocumentV1.",
    );
  }
  return document;
}

export function exportTextDocDocumentV1ToConllu(document: TextDocDocumentV1): string {
  const nodeLayer = document.layers.find((layer) => layer.kind === "dependency-node");
  if (!nodeLayer) {
    throw new TextDocConlluError(
      "missing-dependency-layer",
      "TextDocDocumentV1 does not contain a dependency-node layer.",
    );
  }

  const sentenceLayer = document.layers.find((layer) => layer.kind === "sentence");
  const commentsBySentenceId = new Map<string, readonly string[]>();
  for (const annotation of sentenceLayer?.annotations ?? []) {
    if (annotation.kind !== "sentence") continue;
    const sentenceId = annotation.id.endsWith(":sentence")
      ? annotation.id.slice(0, -":sentence".length)
      : annotation.id;
    commentsBySentenceId.set(sentenceId, annotation.sourceComments ?? []);
  }

  const nodes = nodeLayer.annotations
    .filter((annotation): annotation is TextDocDependencyNodeAnnotation => annotation.kind === "dependency-node")
    .slice()
    .sort((left, right) => left.sourceOrder - right.sourceOrder);
  const sentenceIds = [...new Set(nodes.map((node) => node.sentenceId))];
  const blocks = sentenceIds.map((sentenceId) => {
    const comments = commentsBySentenceId.get(sentenceId) ?? [`# sent_id = ${sentenceId}`];
    const rows = nodes
      .filter((node) => node.sentenceId === sentenceId)
      .map((node) => rowColumns(node.fields).join("\t"));
    return [...comments, ...rows].join("\n");
  });
  return blocks.join("\n\n");
}
