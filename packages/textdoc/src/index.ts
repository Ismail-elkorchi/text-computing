export const packageName = "@ismail-elkorchi/textdoc" as const;

export type PackageName = typeof packageName;

export const tokenSentenceAnnotationSchemaVersion = 1 as const;

export type TextDocTokenSentenceAnnotationSchemaVersion =
  typeof tokenSentenceAnnotationSchemaVersion;

export type TextDocOffsetUnit = "utf16-code-unit";

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
