export const packageName = "@ismail-elkorchi/textdoc" as const;

export type PackageName = typeof packageName;

export const tokenSentenceAnnotationSchemaVersion = 1 as const;
export const documentSchemaVersion = 1 as const;
export const textDocDocumentPayloadKind = "textdoc-document" as const;

export type TextDocTokenSentenceAnnotationSchemaVersion =
  typeof tokenSentenceAnnotationSchemaVersion;
export type TextDocDocumentSchemaVersion = typeof documentSchemaVersion;
export type TextDocDocumentPayloadKind = typeof textDocDocumentPayloadKind;

export type TextDocOffsetUnit = "utf16-code-unit";
export type TextDocViewKind = "source" | "analysis";
export type TextDocLayerKind =
  | "token"
  | "sentence"
  | "pos"
  | "lemma"
  | "morphology"
  | "entity"
  | "corpus-feature";
export type TextDocAnnotationLifecycleState = "active" | "superseded" | "retracted";

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
  readonly derivedFrom?: readonly string[];
}

export interface TextDocLifecycle {
  readonly state: TextDocAnnotationLifecycleState;
  readonly supersedes?: readonly string[];
  readonly supersededBy?: string;
  readonly reason?: string;
}

export interface TextDocSpanTarget extends TextDocSpanCU {
  readonly kind: "span";
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

export interface TextDocAnnotationBase {
  readonly id: string;
  readonly kind: TextDocLayerKind;
  readonly lifecycle: TextDocLifecycle;
  readonly targets: readonly TextDocTarget[];
  readonly notes?: readonly string[];
  readonly provenance?: TextDocProvenance;
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

export interface TextDocCorpusFeatureAnnotation extends TextDocAnnotationBase {
  readonly kind: "corpus-feature";
  readonly featureName: string;
  readonly formula?: string;
  readonly value?: string;
  readonly numericValue?: number;
}

export type TextDocAnnotation =
  | TextDocDocumentTokenAnnotation
  | TextDocDocumentSentenceAnnotation
  | TextDocPosAnnotation
  | TextDocLemmaAnnotation
  | TextDocMorphologyAnnotation
  | TextDocEntityAnnotation
  | TextDocCorpusFeatureAnnotation;

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
  readonly layers: readonly TextDocLayer[];
  readonly notes?: readonly string[];
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

function isTextDocLayerKind(value: unknown): value is TextDocLayerKind {
  return (
    value === "token" ||
    value === "sentence" ||
    value === "pos" ||
    value === "lemma" ||
    value === "morphology" ||
    value === "entity" ||
    value === "corpus-feature"
  );
}

function isTextDocLifecycleState(value: unknown): value is TextDocAnnotationLifecycleState {
  return value === "active" || value === "superseded" || value === "retracted";
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
    (value.kind === "source" || value.kind === "analysis") &&
    (value.description === undefined || isNonEmptyString(value.description)) &&
    (value.derivedFrom === undefined || isStringArray(value.derivedFrom))
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
    (value.provenance === undefined || isTextDocProvenance(value.provenance))
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
      (annotation.text === undefined || isNonEmptyString(annotation.text))
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

  return (
    annotation.kind === "corpus-feature" &&
    isNonEmptyString(annotation.featureName) &&
    (annotation.formula === undefined || isNonEmptyString(annotation.formula)) &&
    (annotation.value === undefined || isNonEmptyString(annotation.value)) &&
    (annotation.numericValue === undefined || typeof annotation.numericValue === "number") &&
    (annotation.value !== undefined || annotation.numericValue !== undefined)
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
    Array.isArray(value.layers) &&
    value.layers.length >= 1 &&
    value.layers.every((entry) => isTextDocLayer(entry)) &&
    (value.notes === undefined || isStringArray(value.notes))
  );
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
        kind: "source",
        description: "Original text source",
      },
      {
        id: "tokenization-view",
        kind: "analysis",
        description: "Tokenization and sentence segmentation annotations",
        derivedFrom: ["source-view"],
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
