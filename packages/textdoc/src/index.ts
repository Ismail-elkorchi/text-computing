export const packageName = "@ismail-elkorchi/textdoc" as const;

export type PackageName = typeof packageName;

export const tokenSentenceAnnotationSchemaVersion = 1 as const;
export const documentSchemaVersion = 1 as const;
export const textDocDocumentPayloadKind = "textdoc-document" as const;
export const textDocConlluRoundTripPayloadKind = "textdoc-conllu-roundtrip" as const;

export type TextDocTokenSentenceAnnotationSchemaVersion =
  typeof tokenSentenceAnnotationSchemaVersion;
export type TextDocDocumentSchemaVersion = typeof documentSchemaVersion;
export type TextDocDocumentPayloadKind = typeof textDocDocumentPayloadKind;
export type TextDocConlluRoundTripPayloadKind = typeof textDocConlluRoundTripPayloadKind;

export type TextDocOffsetUnit = "utf16-code-unit";
export type TextDocViewKind = "source" | "analysis";
export type TextDocLayerKind =
  | "token"
  | "sentence"
  | "pos"
  | "lemma"
  | "morphology"
  | "entity"
  | "corpus-feature"
  | "dependency-node"
  | "dependency";
export type TextDocAnnotationLifecycleState = "active" | "superseded" | "retracted";
export type TextDocDependencyNodeKind = "word" | "multiword-token" | "empty-node";
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

export interface TextDocCorpusFeatureAnnotation extends TextDocAnnotationBase {
  readonly kind: "corpus-feature";
  readonly featureName: string;
  readonly formula?: string;
  readonly value?: string;
  readonly numericValue?: number;
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
  | TextDocCorpusFeatureAnnotation
  | TextDocDependencyNodeAnnotation
  | TextDocDependencyAnnotation;

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

export interface TextDocConlluImportOptions {
  readonly documentId?: string;
  readonly revision?: string;
  readonly sourceId?: string;
  readonly sourceSha256?: string;
  readonly unicodeVersion?: string;
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
    value === "corpus-feature" ||
    value === "dependency-node" ||
    value === "dependency"
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

  if (annotation.kind === "corpus-feature") {
    return (
      isNonEmptyString(annotation.featureName) &&
      (annotation.formula === undefined || isNonEmptyString(annotation.formula)) &&
      (annotation.value === undefined || isNonEmptyString(annotation.value)) &&
      (annotation.numericValue === undefined || typeof annotation.numericValue === "number") &&
      (annotation.value !== undefined || annotation.numericValue !== undefined)
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
      targets: [{ kind: "span", startCU: sentenceStart, endCU: sentenceEnd }],
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
      { id: "source-view", kind: "source" },
      {
        id: "conllu-view",
        kind: "analysis",
        derivedFrom: ["source-view"],
        description: "CoNLL-U import view",
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
