import {
  documentSchemaVersion,
  textDocDocumentPayloadKind,
  type TextDocAnnotation,
  type TextDocCoreferenceChainAnnotation,
  type TextDocCoreferenceMentionAnnotation,
  type TextDocDependencyAnnotation,
  type TextDocDependencyNodeAnnotation,
  type TextDocDocumentSentenceAnnotation,
  type TextDocDocumentTokenAnnotation,
  type TextDocDocumentV1,
  type TextDocEntityAnnotation,
  type TextDocExtensionAnnotation,
  type TextDocFeature,
  type TextDocLayer,
  type TextDocLemmaAnnotation,
  type TextDocMorphologyAlternative,
  type TextDocMorphologyAnnotation,
  type TextDocPosAnnotation,
  type TextDocProvenance,
  type TextDocReferenceRef,
  type TextDocRelationAnnotation,
  type TextDocStringAlternative,
  type TextDocSourceRef,
  type TextDocSpanMapV1,
  type TextDocView,
} from "@ismail-elkorchi/textdoc";
import {
  resultEnvelopeSchemaId,
  resultEnvelopeSchemaVersion,
  type TextProtocolDiagnostic,
  type TextProtocolResultEnvelopeV1,
} from "@ismail-elkorchi/textprotocol";
import type { TextPackLoadedResource, TextPackResolvedResource } from "@ismail-elkorchi/textpack";

export const packageName = "@ismail-elkorchi/textrules" as const;
export const posMorphLemmaRevision = "pos-morph-lemma-v1" as const;
export const posMorphLemmaTagSet = "ud-v2-upos" as const;
export const ruleBackedNerRevision = "rule-backed-ner-v1" as const;
export const dependencyParserRevision = "dependency-parser-v1" as const;
export const relationExtractionRevision = "relation-extraction-v1" as const;
export const coreferenceRevision = "coreference-v1" as const;
const textRulesConformanceReportSchemaId =
  "urn:ismail-elkorchi:textconformance:report:v1" as const;
const textRulesConformanceReportSchemaVersion = 1 as const;

export type PackageName = typeof packageName;
export type TextRulesPosMorphLemmaRevision = typeof posMorphLemmaRevision;
export type TextRulesPosMorphLemmaTagSet = typeof posMorphLemmaTagSet;
export type TextRulesRuleBackedNerRevision = typeof ruleBackedNerRevision;
export type TextRulesDependencyParserRevision = typeof dependencyParserRevision;
export type TextRulesRelationExtractionRevision = typeof relationExtractionRevision;
export type TextRulesCoreferenceRevision = typeof coreferenceRevision;
export type TextRulesEntityLabel = "PER" | "ORG" | "LOC";
export type TextRulesRelationLabel = "employed-by" | "located-in" | "part-of";
export type TextRulesCoreferenceMentionKind = "proper" | "nominal" | "pronoun" | "singleton";
export type TextRulesConformanceCheckStatus = "pass" | "fail" | "not-run";

export interface TextRulesConformanceReportV1 {
  readonly schemaId: typeof textRulesConformanceReportSchemaId;
  readonly schemaVersion: typeof textRulesConformanceReportSchemaVersion;
  readonly reportId: string;
  readonly subject: {
    readonly kind: string;
    readonly id: string;
    readonly schemaId?: string;
  };
  readonly generatedAt: string;
  readonly summary: {
    readonly pass: number;
    readonly fail: number;
    readonly notRun: number;
  };
  readonly checks: readonly {
    readonly checkId: string;
    readonly status: TextRulesConformanceCheckStatus;
    readonly message?: string;
    readonly evidenceRefs?: readonly string[];
  }[];
  readonly notes?: readonly string[];
}

export type TextRulesPosMorphLemmaPhenomenon =
  | "unknown-word"
  | "multiword-token"
  | "clitic"
  | "historical-spelling"
  | "code-switching";

export interface TextRulesLexiconAnalysis {
  readonly ruleId: string;
  readonly pos: string;
  readonly lemma: string;
  readonly morphology?: readonly TextDocFeature[];
  readonly notes?: readonly string[];
}

export interface TextRulesLexiconEntry {
  readonly surface: string;
  readonly analyses: readonly TextRulesLexiconAnalysis[];
}

export interface TextRulesLexiconResourceData {
  readonly entries: readonly TextRulesLexiconEntry[];
}

export interface TextRulesLexiconResource {
  readonly packId: string;
  readonly packageName: string;
  readonly version: string;
  readonly resourceId: string;
  readonly lookupKey: string;
  readonly language?: string;
  readonly overlayPrecedence: number;
  readonly entries: readonly TextRulesLexiconEntry[];
}

export interface TextRulesEntityEntry {
  readonly id: string;
  readonly surface: string;
  readonly label: TextRulesEntityLabel;
  readonly normalized?: string;
  readonly aliases?: readonly string[];
  readonly caseFoldFallback?: boolean;
  readonly notes?: readonly string[];
}

export interface TextRulesEntityResourceData {
  readonly entries: readonly TextRulesEntityEntry[];
}

export interface TextRulesEntityResource {
  readonly packId: string;
  readonly packageName: string;
  readonly version: string;
  readonly resourceId: string;
  readonly lookupKey: string;
  readonly language?: string;
  readonly overlayPrecedence: number;
  readonly entries: readonly TextRulesEntityEntry[];
}

export type TextRulesResourceDiagnosticCode =
  | "unsupported-resource-kind"
  | "missing-lexicon-attribute"
  | "unsupported-entity-label";

export interface TextRulesResourceDiagnostic {
  readonly code: TextRulesResourceDiagnosticCode;
  readonly packId: string;
  readonly resourceId: string;
  readonly line?: number;
  readonly message: string;
}

export interface TextRulesLoadedLexiconResources {
  readonly resources: readonly TextRulesLexiconResource[];
  readonly diagnostics: readonly TextRulesResourceDiagnostic[];
}

export interface TextRulesLoadedEntityResources {
  readonly resources: readonly TextRulesEntityResource[];
  readonly diagnostics: readonly TextRulesResourceDiagnostic[];
}

export interface TextRulesTokenSpan {
  readonly id: string;
  readonly tokenKind: "lexical-token";
  readonly startCU: number;
  readonly endCU: number;
  readonly text: string;
  readonly notes?: readonly string[];
}

export interface TextRulesTextDocTokenLayerOptions {
  readonly tokenLayerId?: string;
}

export interface TextRulesSentenceSpan {
  readonly id: string;
  readonly sentenceKind: "uax29-sentence";
  readonly startCU: number;
  readonly endCU: number;
  readonly text: string;
}

export interface TextRulesPosMorphLemmaInput {
  readonly documentId: string;
  readonly revision?: string;
  readonly text: string;
  readonly sourceId: string;
  readonly sourceSha256?: string;
  readonly unicodeVersion?: string;
  readonly languageHint?: string;
  readonly phenomena?: readonly TextRulesPosMorphLemmaPhenomenon[];
}

export interface TextRulesPosMorphLemmaDocumentInput {
  readonly document: TextDocDocumentV1;
  readonly revision?: string;
  readonly languageHint?: string;
  readonly phenomena?: readonly TextRulesPosMorphLemmaPhenomenon[];
  readonly tokenLayerId?: string;
}

export interface TextRulesPosMorphLemmaResult {
  readonly document: TextDocDocumentV1;
  readonly diagnostics: readonly TextProtocolDiagnostic[];
}

export interface TextRulesRuleBackedNerInput {
  readonly document: TextDocDocumentV1;
  readonly languageHint?: string;
  readonly allowSpanOverlap?: boolean;
}

export interface TextRulesRuleBackedNerResult {
  readonly document: TextDocDocumentV1;
  readonly diagnostics: readonly TextProtocolDiagnostic[];
}

export interface TextRulesDependencyParserInput {
  readonly documentId: string;
  readonly revision?: string;
  readonly text: string;
  readonly sourceId: string;
  readonly sourceSha256?: string;
  readonly unicodeVersion?: string;
  readonly languageHint?: string;
}

export interface TextRulesDependencyParserResult {
  readonly document: TextDocDocumentV1;
  readonly diagnostics: readonly TextProtocolDiagnostic[];
}

export interface TextRulesRelationExtractionInput {
  readonly documentId: string;
  readonly revision?: string;
  readonly text: string;
  readonly sourceId: string;
  readonly sourceSha256?: string;
  readonly unicodeVersion?: string;
  readonly languageHint?: string;
}

export interface TextRulesRelationExtractionResult {
  readonly document: TextDocDocumentV1;
  readonly diagnostics: readonly TextProtocolDiagnostic[];
}

export interface TextRulesCoreferenceInput {
  readonly documentId: string;
  readonly revision?: string;
  readonly text: string;
  readonly sourceId: string;
  readonly sourceSha256?: string;
  readonly unicodeVersion?: string;
  readonly languageHint?: string;
}

export interface TextRulesCoreferenceResult {
  readonly document: TextDocDocumentV1;
  readonly diagnostics: readonly TextProtocolDiagnostic[];
}

export interface TextRulesResultEnvelopeOptions {
  readonly producerVersion: string;
  readonly referenceId?: string;
}

export interface TextRulesConformanceReportOptions {
  readonly expectedArtifactPath: string;
  readonly matchesExpected: boolean;
  readonly generatedAt?: string;
  readonly notes?: readonly string[];
}

export type TextRulesPatternAtom =
  | {
      readonly kind: "literal";
      readonly value: string;
      readonly capture?: string;
    }
  | {
      readonly kind: "one-of";
      readonly values: readonly string[];
      readonly capture?: string;
    }
  | {
      readonly kind: "any";
      readonly capture?: string;
    };

export interface TextRulesTokenPattern {
  readonly ruleId: string;
  readonly atoms: readonly TextRulesPatternAtom[];
  readonly caseSensitive?: boolean;
}

export interface TextRulesTextDocTokenPatternInput extends TextRulesTextDocTokenLayerOptions {
  readonly document: TextDocDocumentV1;
  readonly pattern: TextRulesTokenPattern;
}

export interface TextRulesTextDocTokenPatternsInput extends TextRulesTextDocTokenLayerOptions {
  readonly document: TextDocDocumentV1;
  readonly patterns: readonly TextRulesTokenPattern[];
}

export interface TextRulesPatternCapture {
  readonly name: string;
  readonly tokenId: string;
  readonly value: string;
  readonly startCU: number;
  readonly endCU: number;
}

export interface TextRulesPatternMatch {
  readonly ruleId: string;
  readonly startTokenIndex: number;
  readonly endTokenIndexExclusive: number;
  readonly startCU: number;
  readonly endCU: number;
  readonly text: string;
  readonly captures: readonly TextRulesPatternCapture[];
}

export interface TextRulesTokenTextRewriteRule {
  readonly ruleId: string;
  readonly pattern: TextRulesTokenPattern;
  readonly replacement: readonly string[];
}

export interface TextRulesTokenTextRewrite {
  readonly ruleId: string;
  readonly match: TextRulesPatternMatch;
  readonly replacement: readonly string[];
}

export interface TextRulesTokenTextRewriteResult {
  readonly tokens: readonly string[];
  readonly rewrites: readonly TextRulesTokenTextRewrite[];
}

export type TextRulesRuleKind =
  | "span-pattern"
  | "annotation-pattern"
  | "lexicon"
  | "rewrite"
  | "validation"
  | "transducer";

export type TextRulesConflictPolicy = "emit-all" | "first-win" | "longest-win" | "error";

export interface TextRulesRuleReadsV1 extends TextRulesTextDocTokenLayerOptions {
  readonly viewId?: string;
  readonly layerId?: string;
  readonly annotationKind?: TextDocAnnotation["kind"];
}

export interface TextRulesRuleWhenV1 {
  readonly pattern?: TextRulesTokenPattern;
  readonly surfaceIn?: readonly string[];
  readonly annotationKind?: TextDocAnnotation["kind"];
  readonly feature?: TextDocFeature;
}

export interface TextRulesRuleEmitV1 {
  readonly layerId?: string;
  readonly extensionId?: string;
  readonly data?: Readonly<Record<string, unknown>>;
  readonly notes?: readonly string[];
  readonly diagnosticCode?: string;
  readonly diagnosticSeverity?: TextProtocolDiagnostic["severity"];
  readonly transducerAnalyses?: readonly TextRulesTransducerAnalysisV1[];
}

export interface TextRulesRuleRewriteV1 {
  readonly targetViewId: string;
  readonly replacement: readonly string[];
  readonly reversible?: boolean;
  readonly loss?: readonly {
    readonly kind: "lossy-normalization" | "omitted-alternative" | "truncated-context" | "external-reference";
    readonly reason: string;
    readonly source?: string;
  }[];
}

export interface TextRulesTransducerAnalysisV1 {
  readonly lemma?: string;
  readonly stem?: string;
  readonly features?: readonly TextDocFeature[];
  readonly gloss?: string;
  readonly analysis?: string;
  readonly notes?: readonly string[];
}

export interface TextRulesRuleDeclarationV1 {
  readonly id: string;
  readonly kind: TextRulesRuleKind;
  readonly namespace: string;
  readonly priority: number;
  readonly reads?: TextRulesRuleReadsV1;
  readonly requires?: readonly string[];
  readonly when?: TextRulesRuleWhenV1;
  readonly emit?: TextRulesRuleEmitV1;
  readonly rewrite?: TextRulesRuleRewriteV1;
  readonly resources?: readonly string[];
  readonly diagnostic?: boolean;
  readonly enabled?: boolean;
}

export interface TextRulesRuleBundleV1 {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly namespace: string;
  readonly conflictPolicy?: TextRulesConflictPolicy;
  readonly resources?: readonly string[];
  readonly rules: readonly TextRulesRuleDeclarationV1[];
}

export interface TextRulesRuleValidationDiagnostic {
  readonly code:
    | "invalid-bundle"
    | "invalid-rule"
    | "duplicate-rule-id"
    | "missing-resource"
    | "invalid-rewrite"
    | "invalid-conflict-policy";
  readonly severity: "error" | "warning";
  readonly message: string;
  readonly ruleId?: string;
  readonly resourceId?: string;
}

export interface TextRulesRuleValidationResult {
  readonly ok: boolean;
  readonly diagnostics: readonly TextRulesRuleValidationDiagnostic[];
}

export interface TextRulesCompiledRuleBundleV1 {
  readonly schemaVersion: 1;
  readonly bundleId: string;
  readonly compiledId: string;
  readonly namespace: string;
  readonly conflictPolicy: TextRulesConflictPolicy;
  readonly resourceIds: readonly string[];
  readonly rules: readonly TextRulesRuleDeclarationV1[];
}

export interface TextRulesRuleRuntimeResource {
  readonly id: string;
  readonly entries?: readonly string[];
  readonly lexicon?: TextRulesLexiconResource;
}

export interface TextRulesRewriteArtifact {
  readonly ruleId: string;
  readonly sourceViewId: string;
  readonly targetViewId: string;
  readonly text: string;
  readonly spanMapId: string;
}

export interface TextRulesRunOptions extends TextRulesTextDocTokenLayerOptions {
  readonly sourceViewId?: string;
  readonly targetViewId?: string;
}

export interface TextRulesRunResult {
  readonly document: TextDocDocumentV1;
  readonly annotations: readonly TextDocExtensionAnnotation[];
  readonly diagnostics: readonly TextProtocolDiagnostic[];
  readonly rewrites: readonly TextRulesRewriteArtifact[];
}

interface TextRulesResolvedAnalysis extends TextRulesLexiconAnalysis {
  readonly resourceRefs: readonly TextDocReferenceRef[];
}

type TextRulesPosLayer = TextDocLayer<TextDocPosAnnotation>;
type TextRulesLemmaLayer = TextDocLayer<TextDocLemmaAnnotation>;
type TextRulesMorphologyLayer = TextDocLayer<TextDocMorphologyAnnotation>;
type TextRulesEntityLayer = TextDocLayer<TextDocEntityAnnotation>;
type TextRulesRelationLayer = TextDocLayer<TextDocRelationAnnotation>;
type TextRulesDependencyNodeLayer = TextDocLayer<TextDocDependencyNodeAnnotation>;
type TextRulesDependencyLayer = TextDocLayer<TextDocDependencyAnnotation>;
type TextRulesCoreferenceMentionLayer = TextDocLayer<TextDocCoreferenceMentionAnnotation>;
type TextRulesCoreferenceChainLayer = TextDocLayer<TextDocCoreferenceChainAnnotation>;

interface TextRulesEntityMatch {
  readonly entry: TextRulesEntityEntry;
  readonly resource: TextRulesEntityResource;
  readonly startCU: number;
  readonly endCU: number;
  readonly text: string;
  readonly priority: number;
  readonly matchedSurface: string;
}

export interface TextRulesDependencyNodeSpec {
  readonly id: string;
  readonly form: string;
  readonly targetTokenId: string;
  readonly head: string;
  readonly relation: string;
}

export interface TextRulesDependencyNodeTemplate {
  readonly id: string;
  readonly form: string;
  readonly targetCapture: string;
  readonly head: string;
  readonly relation: string;
}

export interface TextRulesDependencyRule {
  readonly ruleId: string;
  readonly language?: string;
  readonly pattern: TextRulesTokenPattern;
  readonly nodes: readonly TextRulesDependencyNodeTemplate[];
}

export interface TextRulesRelationSpanSpec {
  readonly role: string;
  readonly text: string;
  readonly startCU: number;
  readonly endCU: number;
}

export interface TextRulesCaptureSpanTemplate {
  readonly captureNames: readonly string[];
  readonly startOffsetCU?: number;
  readonly endOffsetCU?: number;
}

export interface TextRulesRelationArgumentTemplate extends TextRulesCaptureSpanTemplate {
  readonly role: string;
}

export interface TextRulesRelationEvidenceTemplate extends TextRulesCaptureSpanTemplate {}

export interface TextRulesRelationRule {
  readonly ruleId: string;
  readonly language?: string;
  readonly label: TextRulesRelationLabel;
  readonly pattern: TextRulesTokenPattern;
  readonly arguments: readonly TextRulesRelationArgumentTemplate[];
  readonly evidence: readonly TextRulesRelationEvidenceTemplate[];
}

export interface TextRulesRelationSpec {
  readonly id: string;
  readonly label: TextRulesRelationLabel;
  readonly arguments: readonly TextRulesRelationSpanSpec[];
  readonly evidence: readonly Omit<TextRulesRelationSpanSpec, "role">[];
}

export interface TextRulesCoreferenceMentionSpec {
  readonly id: string;
  readonly kind: TextRulesCoreferenceMentionKind;
  readonly text: string;
  readonly startCU: number;
  readonly endCU: number;
  readonly notes?: readonly string[];
}

export interface TextRulesCoreferenceMentionTemplate extends TextRulesCaptureSpanTemplate {
  readonly id: string;
  readonly kind: TextRulesCoreferenceMentionKind;
  readonly notes?: readonly string[];
}

export interface TextRulesCoreferenceChainSpec {
  readonly id: string;
  readonly mentionIds: readonly string[];
  readonly representativeMentionId?: string;
  readonly diagnostics?: readonly string[];
}

export interface TextRulesCoreferenceChainTemplate {
  readonly id: string;
  readonly mentionIds: readonly string[];
  readonly representativeMentionId?: string;
  readonly diagnostics?: readonly string[];
}

export interface TextRulesCoreferenceSpec {
  readonly mentions: readonly TextRulesCoreferenceMentionSpec[];
  readonly chains: readonly TextRulesCoreferenceChainSpec[];
  readonly diagnostics: readonly TextProtocolDiagnostic[];
}

export interface TextRulesCoreferenceRule {
  readonly ruleId: string;
  readonly language?: string;
  readonly pattern: TextRulesTokenPattern;
  readonly mentions: readonly TextRulesCoreferenceMentionTemplate[];
  readonly chains: readonly TextRulesCoreferenceChainTemplate[];
  readonly diagnostics?: readonly TextProtocolDiagnostic[];
}

const punctuationCharacters = new Set([".", "!", "?"]);
const apostropheCharacters = new Set(["'", "’"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((entry) => isNonEmptyString(entry));
}

function isWhitespace(char: string): boolean {
  return /\s/u.test(char);
}

function isBoundaryPunctuation(char: string): boolean {
  return punctuationCharacters.has(char);
}

function isApostrophe(char: string): boolean {
  return apostropheCharacters.has(char);
}

function normalizeSurface(value: string): string {
  return value.trim().toLocaleLowerCase("und");
}

function isTextRulesEntityLabel(value: unknown): value is TextRulesEntityLabel {
  return value === "PER" || value === "ORG" || value === "LOC";
}

function compareFeatures(left: TextDocFeature, right: TextDocFeature): number {
  return left.name.localeCompare(right.name) || left.value.localeCompare(right.value);
}

function normalizeFeatures(features: readonly TextDocFeature[]): readonly TextDocFeature[] {
  return [...features].sort(compareFeatures);
}

function stableMorphKey(features: readonly TextDocFeature[]): string {
  return normalizeFeatures(features)
    .map((feature) => `${feature.name}=${feature.value}`)
    .join("|");
}

function uniqueReferences(references: readonly TextDocReferenceRef[]): readonly TextDocReferenceRef[] {
  const seen = new Set<string>();
  const result: TextDocReferenceRef[] = [];
  for (const reference of references) {
    const key = `${reference.kind}:${reference.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(reference);
  }
  return result;
}

function normalizeLanguageHint(languageHint: string | undefined): readonly string[] {
  if (languageHint === undefined) return [];
  return languageHint
    .split("+")
    .map((entry) => normalizeSurface(entry))
    .filter((entry) => entry.length > 0);
}

function selectResources(
  resources: readonly TextRulesLexiconResource[],
  languageHint: string | undefined,
): readonly TextRulesLexiconResource[] {
  const requestedLanguages = normalizeLanguageHint(languageHint);
  if (requestedLanguages.length === 0) return resources;

  return resources.filter((resource) => {
    if (resource.language === undefined) return true;
    return requestedLanguages.includes(normalizeSurface(resource.language));
  });
}

function selectEntityResources(
  resources: readonly TextRulesEntityResource[],
  languageHint: string | undefined,
): readonly TextRulesEntityResource[] {
  const requestedLanguages = normalizeLanguageHint(languageHint);
  if (requestedLanguages.length === 0) return resources;

  return resources.filter((resource) => {
    if (resource.language === undefined) return true;
    return requestedLanguages.includes(normalizeSurface(resource.language));
  });
}

function buildLexiconIndex(
  resources: readonly TextRulesLexiconResource[],
): ReadonlyMap<string, readonly TextRulesResolvedAnalysis[]> {
  const entriesBySurface = new Map<string, TextRulesResolvedAnalysis[]>();

  for (const resource of resources) {
    const resourceReference = {
      kind: "textpack-resource",
      id: `${resource.packId}:${resource.resourceId}`,
    } as const;

    for (const entry of resource.entries) {
      const surface = normalizeSurface(entry.surface);
      const resolvedAnalyses = entriesBySurface.get(surface) ?? [];
      for (const analysis of entry.analyses) {
        resolvedAnalyses.push({
          ...analysis,
          ...(analysis.morphology === undefined
            ? {}
            : { morphology: normalizeFeatures(analysis.morphology) }),
          resourceRefs: [resourceReference],
        });
      }
      entriesBySurface.set(surface, resolvedAnalyses);
    }
  }

  return entriesBySurface;
}

function createStringAlternatives(
  tokenId: string,
  prefix: "pos" | "lemma",
  values: readonly { value: string; notes?: readonly string[] }[],
): readonly TextDocStringAlternative[] {
  return values.map((value, index) => ({
    id: `${tokenId}:${prefix}:${index + 1}`,
    rank: index + 1,
    value: value.value,
    ...(value.notes ? { notes: value.notes } : {}),
  }));
}

function createMorphologyAlternatives(
  tokenId: string,
  values: readonly { features: readonly TextDocFeature[]; notes?: readonly string[] }[],
): readonly TextDocMorphologyAlternative[] {
  return values.map((value, index) => ({
    id: `${tokenId}:morphology:${index + 1}`,
    rank: index + 1,
    features: normalizeFeatures(value.features),
    ...(value.notes ? { notes: value.notes } : {}),
  }));
}

function createTokenAnnotations(
  tokens: readonly TextRulesTokenSpan[],
  sourceId: string,
  sourceSha256: string | undefined,
): readonly TextDocDocumentTokenAnnotation[] {
  return tokens.map((token) => ({
    id: token.id,
    kind: "token",
    tokenKind: token.tokenKind,
    lifecycle: {
      state: "active",
    },
    targets: [
      {
        kind: "span",
        viewId: "analysis-view",
        startCU: token.startCU,
        endCU: token.endCU,
      },
    ],
    text: token.text,
    provenance: {
      source: {
        id: sourceId,
        ...(sourceSha256 ? { sha256: sourceSha256 } : {}),
      },
      references: [
        {
          kind: "textrules-rule",
          id: "tokenizer:lexical-v1",
        },
      ],
    },
    ...(token.notes ? { notes: token.notes } : {}),
  }));
}

function createSentenceAnnotations(
  sentences: readonly TextRulesSentenceSpan[],
  sourceId: string,
  sourceSha256: string | undefined,
): readonly TextDocDocumentSentenceAnnotation[] {
  return sentences.map((sentence) => ({
    id: sentence.id,
    kind: "sentence",
    sentenceKind: sentence.sentenceKind,
    lifecycle: {
      state: "active",
    },
    targets: [
      {
        kind: "span",
        viewId: "analysis-view",
        startCU: sentence.startCU,
        endCU: sentence.endCU,
      },
    ],
    text: sentence.text,
    provenance: {
      source: {
        id: sourceId,
        ...(sourceSha256 ? { sha256: sourceSha256 } : {}),
      },
      references: [
        {
          kind: "textrules-rule",
          id: "sentence-boundary:terminal-punctuation-v1",
        },
      ],
    },
  }));
}

function tokenizeTextForRules(text: string): readonly TextRulesTokenSpan[] {
  const tokens: TextRulesTokenSpan[] = [];
  let cursor = 0;
  let tokenIndex = 1;

  while (cursor < text.length) {
    const current = text[cursor];
    if (current === undefined) break;

    if (isWhitespace(current)) {
      cursor += 1;
      continue;
    }

    if (isBoundaryPunctuation(current)) {
      tokens.push({
        id: `token-${tokenIndex}`,
        tokenKind: "lexical-token",
        startCU: cursor,
        endCU: cursor + 1,
        text: current,
      });
      tokenIndex += 1;
      cursor += 1;
      continue;
    }

    const startCU = cursor;
    while (
      cursor < text.length &&
      !isWhitespace(text[cursor] ?? "") &&
      !isBoundaryPunctuation(text[cursor] ?? "") &&
      !isApostrophe(text[cursor] ?? "")
    ) {
      cursor += 1;
    }

    if (
      cursor < text.length &&
      isApostrophe(text[cursor] ?? "") &&
      cursor + 1 < text.length &&
      !isWhitespace(text[cursor + 1] ?? "") &&
      !isBoundaryPunctuation(text[cursor + 1] ?? "")
    ) {
      tokens.push({
        id: `token-${tokenIndex}`,
        tokenKind: "lexical-token",
        startCU,
        endCU: cursor + 1,
        text: text.slice(startCU, cursor + 1),
        notes: ["Elided clitic boundary is preserved as a token-level split."],
      });
      tokenIndex += 1;
      cursor += 1;
      continue;
    }

    if (startCU < cursor) {
      tokens.push({
        id: `token-${tokenIndex}`,
        tokenKind: "lexical-token",
        startCU,
        endCU: cursor,
        text: text.slice(startCU, cursor),
      });
      tokenIndex += 1;
    }
  }

  return tokens;
}

export function tokenizeTextRulesText(text: string): readonly TextRulesTokenSpan[] {
  return tokenizeTextForRules(text);
}

export function tokenizeTextRulesFixtureText(text: string): readonly TextRulesTokenSpan[] {
  return tokenizeTextForRules(text);
}

function tokenLayerFromTextDoc(
  document: TextDocDocumentV1,
  options: TextRulesTextDocTokenLayerOptions = {},
): TextDocLayer<TextDocDocumentTokenAnnotation> {
  const layer = options.tokenLayerId
    ? document.layers.find((entry) => entry.id === options.tokenLayerId)
    : document.layers.find((entry) => entry.kind === "token");
  if (layer === undefined || layer.kind !== "token") {
    throw new TypeError(
      options.tokenLayerId
        ? `textdoc token layer ${options.tokenLayerId} was not found`
        : "textdoc document must contain a token layer",
    );
  }
  return layer as TextDocLayer<TextDocDocumentTokenAnnotation>;
}

function spanTargetForTextRulesToken(annotation: TextDocDocumentTokenAnnotation): {
  readonly startCU: number;
  readonly endCU: number;
} {
  const target = annotation.targets.find((entry) => entry.kind === "span");
  if (target === undefined || target.kind !== "span") {
    throw new TypeError(`token annotation ${annotation.id} must target a span`);
  }
  return {
    startCU: target.startCU,
    endCU: target.endCU,
  };
}

function tokenTextFromTextDocAnnotation(
  document: TextDocDocumentV1,
  annotation: TextDocDocumentTokenAnnotation,
  startCU: number,
  endCU: number,
): string {
  if (annotation.text !== undefined) return annotation.text;
  if (document.text === undefined) {
    throw new TypeError(`token annotation ${annotation.id} requires text or document.text`);
  }
  return document.text.slice(startCU, endCU);
}

export function textRulesTokenSpansFromTextDoc(
  document: TextDocDocumentV1,
  options: TextRulesTextDocTokenLayerOptions = {},
): readonly TextRulesTokenSpan[] {
  return tokenLayerFromTextDoc(document, options).annotations
    .map((annotation) => {
      const span = spanTargetForTextRulesToken(annotation);
      return {
        id: annotation.id,
        tokenKind: "lexical-token" as const,
        startCU: span.startCU,
        endCU: span.endCU,
        text: tokenTextFromTextDocAnnotation(document, annotation, span.startCU, span.endCU),
        ...(annotation.notes ? { notes: annotation.notes } : {}),
      };
    })
    .sort(
      (left, right) =>
        left.startCU - right.startCU ||
        left.endCU - right.endCU ||
        left.id.localeCompare(right.id),
    );
}

export function matchTextDocTokenPattern(
  input: TextRulesTextDocTokenPatternInput,
): readonly TextRulesPatternMatch[] {
  return matchTextRulesTokenPattern(
    textRulesTokenSpansFromTextDoc(
      input.document,
      input.tokenLayerId === undefined ? {} : { tokenLayerId: input.tokenLayerId },
    ),
    input.pattern,
  );
}

export function matchTextDocTokenPatterns(
  input: TextRulesTextDocTokenPatternsInput,
): readonly TextRulesPatternMatch[] {
  return matchTextRulesTokenPatterns(
    textRulesTokenSpansFromTextDoc(
      input.document,
      input.tokenLayerId === undefined ? {} : { tokenLayerId: input.tokenLayerId },
    ),
    input.patterns,
  );
}

function normalizePatternValue(value: string, caseSensitive: boolean): string {
  return caseSensitive ? value : normalizeSurface(value);
}

function patternAtomMatches(
  atom: TextRulesPatternAtom,
  token: TextRulesTokenSpan,
  caseSensitive: boolean,
): boolean {
  if (atom.kind === "any") return true;

  const tokenText = normalizePatternValue(token.text, caseSensitive);
  if (atom.kind === "literal") {
    return tokenText === normalizePatternValue(atom.value, caseSensitive);
  }

  return atom.values.some((value) => tokenText === normalizePatternValue(value, caseSensitive));
}

function comparePatternMatches(left: TextRulesPatternMatch, right: TextRulesPatternMatch): number {
  const leftLength = left.endTokenIndexExclusive - left.startTokenIndex;
  const rightLength = right.endTokenIndexExclusive - right.startTokenIndex;
  return (
    left.startTokenIndex - right.startTokenIndex ||
    rightLength - leftLength ||
    left.ruleId.localeCompare(right.ruleId) ||
    left.endTokenIndexExclusive - right.endTokenIndexExclusive
  );
}

export function matchTextRulesTokenPattern(
  tokens: readonly TextRulesTokenSpan[],
  pattern: TextRulesTokenPattern,
): readonly TextRulesPatternMatch[] {
  if (pattern.atoms.length === 0) return [];

  const matches: TextRulesPatternMatch[] = [];
  const caseSensitive = pattern.caseSensitive === true;
  for (let startIndex = 0; startIndex <= tokens.length - pattern.atoms.length; startIndex += 1) {
    const captures: TextRulesPatternCapture[] = [];
    let matched = true;

    for (let atomIndex = 0; atomIndex < pattern.atoms.length; atomIndex += 1) {
      const atom = pattern.atoms[atomIndex];
      const token = tokens[startIndex + atomIndex];
      if (atom === undefined || token === undefined || !patternAtomMatches(atom, token, caseSensitive)) {
        matched = false;
        break;
      }

      if (atom.capture !== undefined) {
        captures.push({
          name: atom.capture,
          tokenId: token.id,
          value: token.text,
          startCU: token.startCU,
          endCU: token.endCU,
        });
      }
    }

    if (!matched) continue;
    const first = tokens[startIndex];
    const last = tokens[startIndex + pattern.atoms.length - 1];
    if (first === undefined || last === undefined) continue;
    matches.push({
      ruleId: pattern.ruleId,
      startTokenIndex: startIndex,
      endTokenIndexExclusive: startIndex + pattern.atoms.length,
      startCU: first.startCU,
      endCU: last.endCU,
      text: tokens
        .slice(startIndex, startIndex + pattern.atoms.length)
        .map((token) => token.text)
        .join(" "),
      captures,
    });
  }

  return matches.sort(comparePatternMatches);
}

export function matchTextRulesTokenPatterns(
  tokens: readonly TextRulesTokenSpan[],
  patterns: readonly TextRulesTokenPattern[],
): readonly TextRulesPatternMatch[] {
  return patterns
    .flatMap((pattern) => [...matchTextRulesTokenPattern(tokens, pattern)])
    .sort(comparePatternMatches);
}

export function rewriteTextRulesTokenTexts(
  tokens: readonly TextRulesTokenSpan[],
  rules: readonly TextRulesTokenTextRewriteRule[],
): TextRulesTokenTextRewriteResult {
  const matchesByRule = rules.flatMap((rule) =>
    matchTextRulesTokenPattern(tokens, rule.pattern).map((match) => ({
      rule,
      match,
    })),
  );
  const orderedMatches = matchesByRule.sort(
    (left, right) => comparePatternMatches(left.match, right.match) || left.rule.ruleId.localeCompare(right.rule.ruleId),
  );
  const rewrittenTokens: string[] = [];
  const rewrites: TextRulesTokenTextRewrite[] = [];
  let cursor = 0;

  while (cursor < tokens.length) {
    const selected = orderedMatches.find((entry) => entry.match.startTokenIndex === cursor);
    if (selected === undefined) {
      const token = tokens[cursor];
      if (token !== undefined) rewrittenTokens.push(token.text);
      cursor += 1;
      continue;
    }

    rewrittenTokens.push(...selected.rule.replacement);
    rewrites.push({
      ruleId: selected.rule.ruleId,
      match: selected.match,
      replacement: selected.rule.replacement,
    });
    cursor = selected.match.endTokenIndexExclusive;
  }

  return {
    tokens: rewrittenTokens,
    rewrites,
  };
}

function isTextRulesRuleKind(value: unknown): value is TextRulesRuleKind {
  return (
    value === "span-pattern" ||
    value === "annotation-pattern" ||
    value === "lexicon" ||
    value === "rewrite" ||
    value === "validation" ||
    value === "transducer"
  );
}

function isTextRulesConflictPolicy(value: unknown): value is TextRulesConflictPolicy {
  return value === "emit-all" || value === "first-win" || value === "longest-win" || value === "error";
}

function isTextRulesFeature(value: unknown): value is TextDocFeature {
  return (
    isRecord(value) &&
    isNonEmptyString(value.name) &&
    isNonEmptyString(value.value)
  );
}

function isTextRulesPatternAtom(value: unknown): value is TextRulesPatternAtom {
  if (!isRecord(value) || !isNonEmptyString(value.kind)) return false;
  if (value.kind === "any") {
    return value.capture === undefined || isNonEmptyString(value.capture);
  }
  if (value.kind === "literal") {
    return isNonEmptyString(value.value) && (value.capture === undefined || isNonEmptyString(value.capture));
  }
  return (
    value.kind === "one-of" &&
    Array.isArray(value.values) &&
    value.values.length > 0 &&
    value.values.every((entry) => isNonEmptyString(entry)) &&
    (value.capture === undefined || isNonEmptyString(value.capture))
  );
}

function isTextRulesTokenPattern(value: unknown): value is TextRulesTokenPattern {
  return (
    isRecord(value) &&
    isNonEmptyString(value.ruleId) &&
    Array.isArray(value.atoms) &&
    value.atoms.length > 0 &&
    value.atoms.every((entry) => isTextRulesPatternAtom(entry)) &&
    (value.caseSensitive === undefined || typeof value.caseSensitive === "boolean")
  );
}

function isTextRulesWhen(value: unknown): value is TextRulesRuleWhenV1 {
  return (
    value === undefined ||
    (isRecord(value) &&
      (value.pattern === undefined || isTextRulesTokenPattern(value.pattern)) &&
      (value.surfaceIn === undefined || isStringArray(value.surfaceIn)) &&
      (value.annotationKind === undefined || isNonEmptyString(value.annotationKind)) &&
      (value.feature === undefined || isTextRulesFeature(value.feature)))
  );
}

function isTextRulesEmit(value: unknown): value is TextRulesRuleEmitV1 {
  return (
    value === undefined ||
    (isRecord(value) &&
      (value.layerId === undefined || isNonEmptyString(value.layerId)) &&
      (value.extensionId === undefined || isNonEmptyString(value.extensionId)) &&
      (value.data === undefined || isRecord(value.data)) &&
      (value.notes === undefined || isStringArray(value.notes)) &&
      (value.diagnosticCode === undefined || isNonEmptyString(value.diagnosticCode)) &&
      (value.diagnosticSeverity === undefined ||
        value.diagnosticSeverity === "info" ||
        value.diagnosticSeverity === "warning" ||
        value.diagnosticSeverity === "error") &&
      (value.transducerAnalyses === undefined ||
        (Array.isArray(value.transducerAnalyses) &&
          value.transducerAnalyses.every((entry) => isRecord(entry)))))
  );
}

function isTextRulesRewrite(value: unknown): value is TextRulesRuleRewriteV1 {
  return (
    value === undefined ||
    (isRecord(value) &&
      isNonEmptyString(value.targetViewId) &&
      isStringArray(value.replacement) &&
      (value.reversible === undefined || typeof value.reversible === "boolean") &&
      (value.loss === undefined || Array.isArray(value.loss)))
  );
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map((entry) => stableJson(entry)).join(",")}]`;
  if (isRecord(value)) {
    return `{${Object.entries(value)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function stableHash(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function ruleReference(rule: TextRulesRuleDeclarationV1): TextDocReferenceRef {
  return {
    kind: "textrules-rule",
    id: rule.id,
  };
}

function resourceReferences(rule: TextRulesRuleDeclarationV1): readonly TextDocReferenceRef[] {
  return (rule.resources ?? []).map((id) => ({
    kind: "textpack-resource",
    id,
  }));
}

function ruleProvenance(rule: TextRulesRuleDeclarationV1): TextDocProvenance {
  return {
    references: uniqueReferences([...resourceReferences(rule), ruleReference(rule)]),
  };
}

function normalizeRuleDeclaration(rule: TextRulesRuleDeclarationV1): TextRulesRuleDeclarationV1 {
  return {
    ...rule,
    namespace: normalizeSurface(rule.namespace),
    enabled: rule.enabled !== false,
    resources: [...(rule.resources ?? [])].sort((left, right) => left.localeCompare(right)),
  };
}

function compareRuleDeclarations(
  left: TextRulesRuleDeclarationV1,
  right: TextRulesRuleDeclarationV1,
): number {
  return (
    right.priority - left.priority ||
    left.id.localeCompare(right.id) ||
    left.kind.localeCompare(right.kind) ||
    stableJson(left.when ?? {}).localeCompare(stableJson(right.when ?? {}))
  );
}

export function parseTextRulesRuleBundle(value: unknown): TextRulesRuleBundleV1 {
  const validation = validateTextRulesRuleBundle(value);
  if (!validation.ok) {
    throw new TypeError(validation.diagnostics.map((diagnostic) => diagnostic.message).join("; "));
  }
  return value as TextRulesRuleBundleV1;
}

export function validateTextRulesRuleBundle(value: unknown): TextRulesRuleValidationResult {
  const diagnostics: TextRulesRuleValidationDiagnostic[] = [];
  if (!isRecord(value)) {
    return {
      ok: false,
      diagnostics: [
        {
          code: "invalid-bundle",
          severity: "error",
          message: "Rule bundle must be an object.",
        },
      ],
    };
  }

  if (value.schemaVersion !== 1 || !isNonEmptyString(value.id) || !isNonEmptyString(value.namespace)) {
    diagnostics.push({
      code: "invalid-bundle",
      severity: "error",
      message: "Rule bundle requires schemaVersion=1, id, and namespace.",
    });
  }
  if (value.conflictPolicy !== undefined && !isTextRulesConflictPolicy(value.conflictPolicy)) {
    diagnostics.push({
      code: "invalid-conflict-policy",
      severity: "error",
      message: "Rule bundle conflictPolicy must be emit-all, first-win, longest-win, or error.",
    });
  }
  if (value.resources !== undefined && !isStringArray(value.resources)) {
    diagnostics.push({
      code: "invalid-bundle",
      severity: "error",
      message: "Rule bundle resources must be string identifiers.",
    });
  }
  if (!Array.isArray(value.rules)) {
    diagnostics.push({
      code: "invalid-bundle",
      severity: "error",
      message: "Rule bundle rules must be an array.",
    });
    return { ok: diagnostics.length === 0, diagnostics };
  }

  const bundleResourceList = isStringArray(value.resources) ? value.resources : [];
  const bundleResources = new Set(bundleResourceList);
  const seenRuleIds = new Set<string>();
  for (const ruleValue of value.rules) {
    if (!isRecord(ruleValue)) {
      diagnostics.push({
        code: "invalid-rule",
        severity: "error",
        message: "Rule declarations must be objects.",
      });
      continue;
    }
    const ruleId = isNonEmptyString(ruleValue.id) ? ruleValue.id : undefined;
    if (
      ruleId === undefined ||
      !isTextRulesRuleKind(ruleValue.kind) ||
      !isNonEmptyString(ruleValue.namespace) ||
      typeof ruleValue.priority !== "number" ||
      !Number.isFinite(ruleValue.priority) ||
      !isTextRulesWhen(ruleValue.when) ||
      !isTextRulesEmit(ruleValue.emit) ||
      !isTextRulesRewrite(ruleValue.rewrite) ||
      (ruleValue.resources !== undefined && !isStringArray(ruleValue.resources)) ||
      (ruleValue.requires !== undefined && !isStringArray(ruleValue.requires)) ||
      (ruleValue.enabled !== undefined && typeof ruleValue.enabled !== "boolean") ||
      (ruleValue.diagnostic !== undefined && typeof ruleValue.diagnostic !== "boolean")
    ) {
      diagnostics.push({
        code: "invalid-rule",
        severity: "error",
        message: `Rule ${ruleId ?? "<unknown>"} has an invalid declaration shape.`,
        ...(ruleId === undefined ? {} : { ruleId }),
      });
      continue;
    }
    if (seenRuleIds.has(ruleId)) {
      diagnostics.push({
        code: "duplicate-rule-id",
        severity: "error",
        message: `Rule id ${ruleId} is duplicated.`,
        ruleId,
      });
    }
    seenRuleIds.add(ruleId);
    for (const resourceId of ruleValue.resources ?? []) {
      if (!bundleResources.has(resourceId)) {
        diagnostics.push({
          code: "missing-resource",
          severity: "error",
          message: `Rule ${ruleId} references missing resource ${resourceId}.`,
          ruleId,
          resourceId,
        });
      }
    }
    if (ruleValue.kind === "rewrite" && ruleValue.rewrite === undefined) {
      diagnostics.push({
        code: "invalid-rewrite",
        severity: "error",
        message: `Rewrite rule ${ruleId} requires rewrite metadata.`,
        ruleId,
      });
    }
    if (ruleValue.kind !== "rewrite" && ruleValue.emit === undefined && ruleValue.diagnostic !== true) {
      diagnostics.push({
        code: "invalid-rule",
        severity: "error",
        message: `Rule ${ruleId} requires emit metadata unless it is a diagnostic-only rule.`,
        ruleId,
      });
    }
  }

  return {
    ok: diagnostics.every((diagnostic) => diagnostic.severity !== "error"),
    diagnostics,
  };
}

export function compileTextRulesRuleBundle(
  bundle: TextRulesRuleBundleV1,
): TextRulesCompiledRuleBundleV1 {
  const parsed = parseTextRulesRuleBundle(bundle);
  const rules = parsed.rules
    .filter((rule) => rule.enabled !== false)
    .map(normalizeRuleDeclaration)
    .sort(compareRuleDeclarations);
  const resourceIds = [...new Set([...(parsed.resources ?? []), ...rules.flatMap((rule) => rule.resources ?? [])])]
    .sort((left, right) => left.localeCompare(right));
  const sealed = {
    schemaVersion: 1 as const,
    bundleId: parsed.id,
    namespace: normalizeSurface(parsed.namespace),
    conflictPolicy: parsed.conflictPolicy ?? "emit-all",
    resourceIds,
    rules,
  };
  return {
    ...sealed,
    compiledId: `textrules-compiled:${stableHash(stableJson(sealed))}`,
  };
}

function captureSignature(match: TextRulesPatternMatch): string {
  return match.captures
    .map((capture) => `${capture.name}:${capture.tokenId}:${capture.value}`)
    .sort((left, right) => left.localeCompare(right))
    .join("|");
}

function compareRuleMatches(
  left: { readonly rule: TextRulesRuleDeclarationV1; readonly match: TextRulesPatternMatch },
  right: { readonly rule: TextRulesRuleDeclarationV1; readonly match: TextRulesPatternMatch },
): number {
  const leftLength = left.match.endTokenIndexExclusive - left.match.startTokenIndex;
  const rightLength = right.match.endTokenIndexExclusive - right.match.startTokenIndex;
  return (
    right.rule.priority - left.rule.priority ||
    left.match.startCU - right.match.startCU ||
    rightLength - leftLength ||
    left.rule.id.localeCompare(right.rule.id) ||
    captureSignature(left.match).localeCompare(captureSignature(right.match))
  );
}

function applyConflictPolicy(
  candidates: readonly {
    readonly rule: TextRulesRuleDeclarationV1;
    readonly match: TextRulesPatternMatch;
  }[],
  policy: TextRulesConflictPolicy,
): {
  readonly selected: readonly {
    readonly rule: TextRulesRuleDeclarationV1;
    readonly match: TextRulesPatternMatch;
  }[];
  readonly diagnostics: readonly TextProtocolDiagnostic[];
} {
  const ordered = [...candidates].sort(compareRuleMatches);
  if (policy === "emit-all") return { selected: ordered, diagnostics: [] };
  if (policy === "first-win") return { selected: ordered.slice(0, 1), diagnostics: [] };

  const selected: typeof ordered = [];
  const diagnostics: TextProtocolDiagnostic[] = [];
  for (const candidate of ordered) {
    const overlaps = selected.some(
      (entry) => candidate.match.startCU < entry.match.endCU && entry.match.startCU < candidate.match.endCU,
    );
    if (!overlaps) {
      selected.push(candidate);
      continue;
    }
    if (policy === "error") {
      diagnostics.push({
        code: "textrules-conflict",
        severity: "error",
        message: `Rule ${candidate.rule.id} overlaps an already selected match.`,
      });
    }
  }
  return { selected, diagnostics };
}

function rulePattern(rule: TextRulesRuleDeclarationV1): TextRulesTokenPattern | undefined {
  return rule.when?.pattern;
}

function ruleTargetView(document: TextDocDocumentV1, options: TextRulesRunOptions): string {
  if (options.targetViewId !== undefined) return options.targetViewId;
  if (document.views.some((view) => view.id === "analysis-view")) return "analysis-view";
  return document.views[0]?.id ?? "source-view";
}

function extensionAnnotationForMatch(
  rule: TextRulesRuleDeclarationV1,
  match: TextRulesPatternMatch,
  index: number,
  viewId: string,
): TextDocExtensionAnnotation {
  return {
    id: `${rule.namespace}:${rule.id}:match-${index + 1}`,
    kind: "extension",
    extensionId: rule.emit?.extensionId ?? `${rule.namespace}:${rule.kind}`,
    lifecycle: { state: "active" },
    targets: [{ kind: "span", viewId, startCU: match.startCU, endCU: match.endCU }],
    provenance: ruleProvenance(rule),
    data: {
      ruleKind: rule.kind,
      text: match.text,
      captures: match.captures.map((capture) => ({
        name: capture.name,
        tokenId: capture.tokenId,
        value: capture.value,
        startCU: capture.startCU,
        endCU: capture.endCU,
      })),
      ...(rule.emit?.data ?? {}),
    },
    ...(rule.emit?.notes ? { notes: rule.emit.notes } : {}),
  };
}

function annotationMatchesRule(annotation: TextDocAnnotation, rule: TextRulesRuleDeclarationV1): boolean {
  if (rule.when?.annotationKind !== undefined && annotation.kind !== rule.when.annotationKind) return false;
  if (rule.reads?.annotationKind !== undefined && annotation.kind !== rule.reads.annotationKind) return false;
  const feature = rule.when?.feature;
  if (feature === undefined) return true;
  if (annotation.kind !== "pos" && annotation.kind !== "morphology") return false;
  const text = stableJson(annotation);
  return text.includes(`"${feature.name}"`) && text.includes(`"${feature.value}"`);
}

function tokenSurfaceMatches(rule: TextRulesRuleDeclarationV1, token: TextRulesTokenSpan): boolean {
  const surfaces = rule.when?.surfaceIn;
  if (surfaces === undefined || surfaces.length === 0) return true;
  return surfaces.some((surface) => normalizeSurface(surface) === normalizeSurface(token.text));
}

function runtimeResourcesForRule(
  rule: TextRulesRuleDeclarationV1,
  resources: readonly TextRulesRuleRuntimeResource[],
): readonly TextRulesRuleRuntimeResource[] {
  const required = new Set(rule.resources ?? []);
  if (required.size === 0) return resources;
  return resources.filter((resource) => required.has(resource.id));
}

function lexiconRuleCandidates(
  document: TextDocDocumentV1,
  rule: TextRulesRuleDeclarationV1,
  resources: readonly TextRulesRuleRuntimeResource[],
  options: TextRulesRunOptions,
): readonly { readonly rule: TextRulesRuleDeclarationV1; readonly match: TextRulesPatternMatch }[] {
  const tokens = textRulesTokenSpansFromTextDoc(document, options);
  const surfaces = new Set<string>();
  for (const resource of runtimeResourcesForRule(rule, resources)) {
    for (const entry of resource.entries ?? []) surfaces.add(normalizeSurface(entry));
    for (const entry of resource.lexicon?.entries ?? []) surfaces.add(normalizeSurface(entry.surface));
  }
  const declared = rule.when?.surfaceIn ?? [];
  for (const surface of declared) surfaces.add(normalizeSurface(surface));
  return tokens.flatMap((token, index) => {
    if (surfaces.size > 0 && !surfaces.has(normalizeSurface(token.text))) return [];
    if (!tokenSurfaceMatches(rule, token)) return [];
    return [{
      rule,
      match: {
        ruleId: rule.id,
        startTokenIndex: index,
        endTokenIndexExclusive: index + 1,
        startCU: token.startCU,
        endCU: token.endCU,
        text: token.text,
        captures: [
          {
            name: "surface",
            tokenId: token.id,
            value: token.text,
            startCU: token.startCU,
            endCU: token.endCU,
          },
        ],
      },
    }];
  });
}

function ruleCandidates(
  document: TextDocDocumentV1,
  compiled: TextRulesCompiledRuleBundleV1,
  resources: readonly TextRulesRuleRuntimeResource[],
  options: TextRulesRunOptions,
): readonly { readonly rule: TextRulesRuleDeclarationV1; readonly match: TextRulesPatternMatch }[] {
  const tokens = textRulesTokenSpansFromTextDoc(document, options);
  const candidates: { rule: TextRulesRuleDeclarationV1; match: TextRulesPatternMatch }[] = [];
  for (const rule of compiled.rules) {
    if (rule.kind === "annotation-pattern") continue;
    if (rule.kind === "lexicon" || (rule.kind === "transducer" && rulePattern(rule) === undefined)) {
      candidates.push(...lexiconRuleCandidates(document, rule, resources, options));
      continue;
    }
    const pattern = rulePattern(rule);
    if (pattern === undefined) continue;
    for (const match of matchTextRulesTokenPattern(tokens, { ...pattern, ruleId: rule.id })) {
      candidates.push({ rule, match });
    }
  }
  return candidates;
}

function annotationPatternAnnotations(
  document: TextDocDocumentV1,
  rule: TextRulesRuleDeclarationV1,
  viewId: string,
): readonly TextDocExtensionAnnotation[] {
  const annotations = document.layers.flatMap((layer) => layer.annotations).filter((annotation) => annotationMatchesRule(annotation, rule));
  return annotations.map((annotation, index) => ({
    id: `${rule.namespace}:${rule.id}:annotation-${index + 1}`,
    kind: "extension",
    extensionId: rule.emit?.extensionId ?? `${rule.namespace}:annotation-pattern`,
    lifecycle: { state: "active" },
    targets: [{ kind: "annotation", annotationId: annotation.id }],
    provenance: ruleProvenance(rule),
    data: {
      ruleKind: rule.kind,
      annotationKind: annotation.kind,
      ...(rule.emit?.data ?? {}),
    },
    ...(rule.emit?.notes ? { notes: rule.emit.notes } : {}),
    ...(annotation.loss ? { loss: annotation.loss } : {}),
    ...(annotation.ambiguitySet ? { ambiguitySet: annotation.ambiguitySet } : {}),
    ...(viewId.length === 0 ? {} : {}),
  }));
}

function transducerAnnotationForMatch(
  rule: TextRulesRuleDeclarationV1,
  match: TextRulesPatternMatch,
  index: number,
  viewId: string,
): TextDocExtensionAnnotation {
  const analyses = [...(rule.emit?.transducerAnalyses ?? [])].sort((left, right) =>
    stableJson(left).localeCompare(stableJson(right)),
  );
  return {
    id: `${rule.namespace}:${rule.id}:transducer-${index + 1}`,
    kind: "extension",
    extensionId: rule.emit?.extensionId ?? `${rule.namespace}:transducer-analysis`,
    lifecycle: { state: "active" },
    targets: [{ kind: "span", viewId, startCU: match.startCU, endCU: match.endCU }],
    provenance: ruleProvenance(rule),
    data: {
      ruleKind: "transducer",
      surface: match.text,
      analyses,
    },
    ...(analyses.length > 1
      ? {
          ambiguitySet: {
            id: `${rule.namespace}:${rule.id}:ambiguity-${index + 1}`,
            role: "candidate" as const,
            rank: 1,
          },
        }
      : {}),
  };
}

function validationDiagnosticForMatch(
  rule: TextRulesRuleDeclarationV1,
  match: TextRulesPatternMatch,
): TextProtocolDiagnostic {
  return {
    code: rule.emit?.diagnosticCode ?? rule.id,
    severity: rule.emit?.diagnosticSeverity ?? (rule.diagnostic === true ? "warning" : "info"),
    message: `${rule.kind} rule ${rule.id} matched ${match.text}.`,
  };
}

function rewriteArtifactsForMatches(
  document: TextDocDocumentV1,
  matches: readonly {
    readonly rule: TextRulesRuleDeclarationV1;
    readonly match: TextRulesPatternMatch;
  }[],
  options: TextRulesRunOptions,
): {
  readonly views: readonly TextDocView[];
  readonly spanMaps: readonly TextDocSpanMapV1[];
  readonly rewrites: readonly TextRulesRewriteArtifact[];
} {
  const rewriteMatches = matches.filter((entry) => entry.rule.kind === "rewrite" && entry.rule.rewrite !== undefined);
  const views: TextDocView[] = [];
  const spanMaps: TextDocSpanMapV1[] = [];
  const rewrites: TextRulesRewriteArtifact[] = [];
  const sourceViewId = options.sourceViewId ?? document.views[0]?.id ?? "source-view";
  for (const entry of rewriteMatches) {
    const rewrite = entry.rule.rewrite;
    if (rewrite === undefined) continue;
    const targetViewId = rewrite.targetViewId;
    const spanMapId = `${entry.rule.namespace}:${entry.rule.id}:span-map`;
    if (!document.views.some((view) => view.id === targetViewId) && !views.some((view) => view.id === targetViewId)) {
      views.push({
        id: targetViewId,
        kind: "normalized",
        parentViewId: sourceViewId,
        spanMapIds: [spanMapId],
        ...(rewrite.loss ? { loss: rewrite.loss } : {}),
      });
    }
    spanMaps.push({
      id: spanMapId,
      sourceViewId,
      targetViewId,
      lifecycle: { state: rewrite.reversible === false ? "partial" : "active", ...(rewrite.reversible === false ? { reason: "rewrite declared non-reversible output" } : {}) },
      segments: [
        {
          source: { startCU: entry.match.startCU, endCU: entry.match.endCU },
          target: { startCU: 0, endCU: rewrite.replacement.join(" ").length },
          kind: rewrite.reversible === false ? "normalized" : "unchanged",
          reversible: rewrite.reversible !== false,
          ...(rewrite.loss ? { loss: rewrite.loss } : {}),
        },
      ],
      provenance: ruleProvenance(entry.rule),
      ...(rewrite.loss ? { loss: rewrite.loss } : {}),
    });
    rewrites.push({
      ruleId: entry.rule.id,
      sourceViewId,
      targetViewId,
      text: rewrite.replacement.join(" "),
      spanMapId,
    });
  }
  return { views, spanMaps, rewrites };
}

export function runTextRules(
  document: TextDocDocumentV1,
  compiled: TextRulesCompiledRuleBundleV1,
  resources: readonly TextRulesRuleRuntimeResource[] = [],
  options: TextRulesRunOptions = {},
): TextRulesRunResult {
  const viewId = ruleTargetView(document, options);
  const candidates = ruleCandidates(document, compiled, resources, options);
  const { selected, diagnostics: conflictDiagnostics } = applyConflictPolicy(candidates, compiled.conflictPolicy);
  const annotations: TextDocExtensionAnnotation[] = [];
  const diagnostics: TextProtocolDiagnostic[] = [...conflictDiagnostics];

  for (const [index, entry] of selected.entries()) {
    if (entry.rule.kind === "rewrite") continue;
    if (entry.rule.kind === "validation") {
      diagnostics.push(validationDiagnosticForMatch(entry.rule, entry.match));
      if (entry.rule.diagnostic === true) continue;
    }
    annotations.push(
      entry.rule.kind === "transducer"
        ? transducerAnnotationForMatch(entry.rule, entry.match, index, viewId)
        : extensionAnnotationForMatch(entry.rule, entry.match, index, viewId),
    );
  }
  for (const rule of compiled.rules.filter((entry) => entry.kind === "annotation-pattern")) {
    annotations.push(...annotationPatternAnnotations(document, rule, viewId));
  }

  const rewriteOutput = rewriteArtifactsForMatches(document, selected, options);
  const extensionLayer: TextDocLayer<TextDocExtensionAnnotation> = {
    id: `${compiled.namespace}:rule-outputs`,
    kind: "extension",
    viewId,
    annotations: annotations.sort((left, right) => left.id.localeCompare(right.id)),
    notes: [`Compiled rule bundle ${compiled.compiledId}`],
  };
  const layers: TextDocLayer<TextDocAnnotation>[] = [
    ...document.layers.filter((layer) => layer.id !== extensionLayer.id),
    ...(annotations.length === 0 ? [] : [extensionLayer]),
  ];
  return {
    document: {
      ...document,
      views: [...document.views, ...rewriteOutput.views],
      spanMaps: [...(document.spanMaps ?? []), ...rewriteOutput.spanMaps],
      layers,
    },
    annotations: extensionLayer.annotations,
    diagnostics: sortDiagnostics(diagnostics),
    rewrites: rewriteOutput.rewrites,
  };
}

function segmentSentencesForRules(text: string): readonly TextRulesSentenceSpan[] {
  const sentences: TextRulesSentenceSpan[] = [];
  let sentenceStart = 0;
  let sentenceIndex = 1;

  for (let cursor = 0; cursor < text.length; cursor += 1) {
    const current = text[cursor];
    if (current === undefined || !isBoundaryPunctuation(current)) continue;

    const endCU = cursor + 1;
    sentences.push({
      id: `sentence-${sentenceIndex}`,
      sentenceKind: "uax29-sentence",
      startCU: sentenceStart,
      endCU,
      text: text.slice(sentenceStart, endCU),
    });
    sentenceIndex += 1;
    sentenceStart = endCU;
    while (sentenceStart < text.length && isWhitespace(text[sentenceStart] ?? "")) {
      sentenceStart += 1;
    }
  }

  if (sentences.length === 0 && text.length > 0) {
    sentences.push({
      id: "sentence-1",
      sentenceKind: "uax29-sentence",
      startCU: 0,
      endCU: text.length,
      text,
    });
  }

  return sentences;
}

function createUnknownTokenDiagnostics(token: TextRulesTokenSpan): {
  readonly analyses: readonly TextRulesResolvedAnalysis[];
  readonly diagnostics: readonly TextProtocolDiagnostic[];
} {
  return {
    analyses: [],
    diagnostics: [
      {
        code: "unknown-word",
        severity: "warning",
        message: `Unknown token ${token.text} has no explicit lexicon or transducer analysis.`,
      },
    ],
  };
}

function resolveAnalyses(
  token: TextRulesTokenSpan,
  entriesBySurface: ReadonlyMap<string, readonly TextRulesResolvedAnalysis[]>,
): {
  readonly analyses: readonly TextRulesResolvedAnalysis[];
  readonly diagnostics: readonly TextProtocolDiagnostic[];
} {
  if (token.text.length === 1 && isBoundaryPunctuation(token.text)) {
    return {
      analyses: [
        {
          ruleId: "punctuation:terminal",
          pos: "PUNCT",
          lemma: token.text,
          resourceRefs: [],
        },
      ],
      diagnostics: [],
    };
  }

  const surface = normalizeSurface(token.text);
  const knownAnalyses = entriesBySurface.get(surface);
  if (knownAnalyses && knownAnalyses.length > 0) {
    return {
      analyses: knownAnalyses,
      diagnostics: [],
    };
  }

  return createUnknownTokenDiagnostics(token);
}

function createPhenomenonDiagnostics(
  token: TextRulesTokenSpan,
  phenomenaInput: readonly TextRulesPosMorphLemmaPhenomenon[] | undefined,
): readonly TextProtocolDiagnostic[] {
  const diagnostics: TextProtocolDiagnostic[] = [];
  const phenomena = new Set(phenomenaInput ?? []);
  const normalized = normalizeSurface(token.text);

  if (phenomena.has("unknown-word") && normalized === "florped") {
    diagnostics.push({
      code: "unknown-word",
      severity: "warning",
      message: "Unknown token florped uses explicitly declared fallback-style analyses.",
    });
  }

  if (phenomena.has("multiword-token") && normalized === "del") {
    diagnostics.push({
      code: "multiword-token",
      severity: "info",
      message: "Surface contraction Del keeps ambiguity explicit across POS, lemma, and morphology.",
    });
  }

  if (phenomena.has("clitic") && token.text.endsWith("'")) {
    diagnostics.push({
      code: "clitic-token",
      severity: "info",
      message: `Clitic token ${token.text} preserves an apostrophe boundary.`,
    });
  }

  if (phenomena.has("historical-spelling") && (normalized === "hoste" || normalized === "escrist")) {
    diagnostics.push({
      code: "historical-spelling",
      severity: "info",
      message: `Historical surface ${token.text} keeps surface-preserving and normalized analyses.`,
    });
  }

  return diagnostics;
}

function createDocumentViews(): readonly TextDocView[] {
  return [
    {
      id: "source-view",
      kind: "raw",
      description: "Original source text for POS, lemma, and morphology analysis.",
    },
    {
      id: "analysis-view",
      kind: "task",
      description: "Deterministic textrules POS, lemma, and morphology annotations.",
      parentViewId: "source-view",
      spanMapIds: ["span-map-source-analysis"],
    },
  ];
}

function createAnalysisSpanMaps(textLengthCU: number): readonly TextDocSpanMapV1[] {
  return [
    {
      id: "span-map-source-analysis",
      sourceViewId: "source-view",
      targetViewId: "analysis-view",
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
  ];
}

function createDependencyParserViews(): readonly TextDocView[] {
  return [
    {
      id: "source-view",
      kind: "raw",
      description: "Original source text for dependency parsing.",
    },
    {
      id: "analysis-view",
      kind: "task",
      description: "Deterministic textrules dependency annotations.",
      parentViewId: "source-view",
      spanMapIds: ["span-map-source-analysis"],
    },
  ];
}

function createRelationExtractionViews(): readonly TextDocView[] {
  return [
    {
      id: "source-view",
      kind: "raw",
      description: "Original source text for relation extraction.",
    },
    {
      id: "analysis-view",
      kind: "task",
      description: "Deterministic textrules relation annotations.",
      parentViewId: "source-view",
      spanMapIds: ["span-map-source-analysis"],
    },
  ];
}

function createCoreferenceViews(): readonly TextDocView[] {
  return [
    {
      id: "source-view",
      kind: "raw",
      description: "Original source text for coreference analysis.",
    },
    {
      id: "analysis-view",
      kind: "task",
      description: "Deterministic textrules coreference annotations.",
      parentViewId: "source-view",
      spanMapIds: ["span-map-source-analysis"],
    },
  ];
}

function entityDocumentViews(document: TextDocDocumentV1): readonly TextDocView[] {
  if (document.views.some((view) => view.id === "analysis-view")) return document.views;
  const parentViewId = document.views.some((view) => view.id === "source-view")
    ? "source-view"
    : document.views[0]?.id;
  if (parentViewId === undefined) return document.views;
  return [
    ...document.views,
    {
      id: "analysis-view",
      kind: "task",
      description: "Deterministic textrules rule-backed named entity annotations.",
      parentViewId,
      spanMapIds: ["span-map-source-analysis"],
    },
  ];
}

function analysisDocumentSpanMaps(document: TextDocDocumentV1): readonly TextDocSpanMapV1[] {
  if (document.spanMaps?.some((spanMap) => spanMap.id === "span-map-source-analysis")) {
    return document.spanMaps;
  }
  const parentViewId = document.views.some((view) => view.id === "source-view")
    ? "source-view"
    : document.views[0]?.id;
  if (parentViewId === undefined) return document.spanMaps ?? [];
  return [
    ...(document.spanMaps ?? []),
    {
      id: "span-map-source-analysis",
      sourceViewId: parentViewId,
      targetViewId: "analysis-view",
      lifecycle: { state: "active" },
      segments:
        document.textLengthCU === 0
          ? []
          : [
              {
                source: { startCU: 0, endCU: document.textLengthCU },
                target: { startCU: 0, endCU: document.textLengthCU },
                kind: "unchanged",
                reversible: true,
              },
            ],
    },
  ];
}

function sortDiagnostics(diagnostics: readonly TextProtocolDiagnostic[]): readonly TextProtocolDiagnostic[] {
  return [...diagnostics].sort(
    (left, right) =>
      left.code.localeCompare(right.code) ||
      left.severity.localeCompare(right.severity) ||
      (left.message ?? "").localeCompare(right.message ?? ""),
  );
}

function annotationProvenance(
  source: TextDocSourceRef,
  references: readonly TextDocReferenceRef[],
) {
  return {
    source: {
      id: source.id,
      ...(source.sha256 ? { sha256: source.sha256 } : {}),
    },
    references: uniqueReferences(references),
  };
}

function documentHasLayerKind(document: TextDocDocumentV1, kind: "token" | "sentence"): boolean {
  return document.layers.some((layer) => layer.kind === kind && layer.annotations.length >= 1);
}

function dependencyNodeId(sentenceId: string, conlluId: string): string {
  return `${sentenceId}:dep-node-${conlluId}`;
}

function dependencyArcId(sentenceId: string, conlluId: string): string {
  return `${sentenceId}:dep-${conlluId}`;
}

const frozenDependencyRuleResources: readonly TextRulesDependencyRule[] = [
  {
    ruleId: "dependency:en:basic-transitive",
    language: "en",
    pattern: {
      ruleId: "dependency-pattern:en:basic-transitive",
      atoms: [
        { kind: "literal", value: "They", capture: "subject" },
        { kind: "literal", value: "buy", capture: "root" },
        { kind: "literal", value: "books", capture: "object" },
        { kind: "literal", value: ".", capture: "punct" },
      ],
    },
    nodes: [
      { id: "1", form: "They", targetCapture: "subject", head: "2", relation: "nsubj" },
      { id: "2", form: "buy", targetCapture: "root", head: "0", relation: "root" },
      { id: "3", form: "books", targetCapture: "object", head: "2", relation: "obj" },
      { id: "4", form: ".", targetCapture: "punct", head: "2", relation: "punct" },
    ],
  },
  {
    ruleId: "dependency:es:mwt-motion",
    language: "es",
    pattern: {
      ruleId: "dependency-pattern:es:mwt-motion",
      atoms: [
        { kind: "literal", value: "Vámonos", capture: "verb-mwt" },
        { kind: "literal", value: "al", capture: "case-det-mwt" },
        { kind: "literal", value: "mar", capture: "object" },
        { kind: "literal", value: ".", capture: "punct" },
      ],
    },
    nodes: [
      { id: "1", form: "Vamos", targetCapture: "verb-mwt", head: "0", relation: "root" },
      { id: "2", form: "nos", targetCapture: "verb-mwt", head: "1", relation: "obj" },
      { id: "3", form: "a", targetCapture: "case-det-mwt", head: "5", relation: "case" },
      { id: "4", form: "el", targetCapture: "case-det-mwt", head: "5", relation: "det" },
      { id: "5", form: "mar", targetCapture: "object", head: "1", relation: "obl" },
      { id: "6", form: ".", targetCapture: "punct", head: "1", relation: "punct" },
    ],
  },
  {
    ruleId: "dependency:ar:basic-transitive",
    language: "ar",
    pattern: {
      ruleId: "dependency-pattern:ar:basic-transitive",
      atoms: [
        { kind: "literal", value: "كتب", capture: "root" },
        { kind: "literal", value: "الطالب", capture: "subject" },
        { kind: "literal", value: "الدرس", capture: "object" },
        { kind: "literal", value: ".", capture: "punct" },
      ],
    },
    nodes: [
      { id: "1", form: "كتب", targetCapture: "root", head: "0", relation: "root" },
      { id: "2", form: "الطالب", targetCapture: "subject", head: "1", relation: "nsubj" },
      { id: "3", form: "الدرس", targetCapture: "object", head: "1", relation: "obj" },
      { id: "4", form: ".", targetCapture: "punct", head: "1", relation: "punct" },
    ],
  },
];

const frozenRelationRuleResources: readonly TextRulesRelationRule[] = [
  {
    ruleId: "relation:en:employment-location",
    language: "en",
    label: "employed-by",
    pattern: {
      ruleId: "relation-pattern:en:employment-location",
      atoms: [
        { kind: "literal", value: "Mira", capture: "employee" },
        { kind: "literal", value: "works", capture: "evidence-works" },
        { kind: "literal", value: "for", capture: "evidence-for" },
        { kind: "literal", value: "Northwind", capture: "employer-1" },
        { kind: "literal", value: "Labs", capture: "employer-2" },
        { kind: "literal", value: "in", capture: "evidence-in" },
        { kind: "literal", value: "Boston", capture: "place" },
        { kind: "literal", value: "." },
      ],
    },
    arguments: [
      { role: "employee", captureNames: ["employee"] },
      { role: "employer", captureNames: ["employer-1", "employer-2"] },
    ],
    evidence: [{ captureNames: ["evidence-works", "evidence-for"] }],
  },
  {
    ruleId: "relation:en:location-from-employment",
    language: "en",
    label: "located-in",
    pattern: {
      ruleId: "relation-pattern:en:employment-location",
      atoms: [
        { kind: "literal", value: "Mira" },
        { kind: "literal", value: "works" },
        { kind: "literal", value: "for" },
        { kind: "literal", value: "Northwind", capture: "entity-1" },
        { kind: "literal", value: "Labs", capture: "entity-2" },
        { kind: "literal", value: "in", capture: "evidence-in" },
        { kind: "literal", value: "Boston", capture: "place" },
        { kind: "literal", value: "." },
      ],
    },
    arguments: [
      { role: "entity", captureNames: ["entity-1", "entity-2"] },
      { role: "place", captureNames: ["place"] },
    ],
    evidence: [{ captureNames: ["evidence-in"] }],
  },
  {
    ruleId: "relation:en:cross-sentence-part-of",
    language: "en",
    label: "part-of",
    pattern: {
      ruleId: "relation-pattern:en:cross-sentence-part-of",
      atoms: [
        { kind: "literal", value: "Northwind", capture: "whole-1" },
        { kind: "literal", value: "Labs", capture: "whole-2" },
        { kind: "literal", value: "opened" },
        { kind: "literal", value: "a" },
        { kind: "literal", value: "clinic" },
        { kind: "literal", value: "." },
        { kind: "literal", value: "The" },
        { kind: "literal", value: "Boston", capture: "part-1" },
        { kind: "literal", value: "facility", capture: "part-2" },
        { kind: "literal", value: "is", capture: "evidence-1" },
        { kind: "literal", value: "part", capture: "evidence-2" },
        { kind: "literal", value: "of", capture: "evidence-3" },
        { kind: "literal", value: "the", capture: "evidence-4" },
        { kind: "literal", value: "company", capture: "evidence-5" },
        { kind: "literal", value: "." },
      ],
    },
    arguments: [
      { role: "part", captureNames: ["part-1", "part-2"] },
      { role: "whole", captureNames: ["whole-1", "whole-2"] },
    ],
    evidence: [{ captureNames: ["evidence-2", "evidence-3", "evidence-4", "evidence-5"] }],
  },
  {
    ruleId: "relation:es:location",
    language: "es",
    label: "located-in",
    pattern: {
      ruleId: "relation-pattern:es:location",
      atoms: [
        { kind: "literal", value: "El" },
        { kind: "literal", value: "archivo", capture: "entity-1" },
        { kind: "literal", value: "central", capture: "entity-2" },
        { kind: "literal", value: "está", capture: "evidence-1" },
        { kind: "literal", value: "en", capture: "evidence-2" },
        { kind: "literal", value: "Sevilla", capture: "place" },
        { kind: "literal", value: "." },
      ],
    },
    arguments: [
      { role: "entity", captureNames: ["entity-1", "entity-2"] },
      { role: "place", captureNames: ["place"] },
    ],
    evidence: [{ captureNames: ["evidence-1", "evidence-2"] }],
  },
  {
    ruleId: "relation:ar:location",
    language: "ar",
    label: "located-in",
    pattern: {
      ruleId: "relation-pattern:ar:location",
      atoms: [
        { kind: "literal", value: "يقع", capture: "evidence-1" },
        { kind: "literal", value: "المتحف", capture: "entity" },
        { kind: "literal", value: "في", capture: "evidence-2" },
        { kind: "literal", value: "الرباط", capture: "place" },
        { kind: "literal", value: "." },
      ],
    },
    arguments: [
      { role: "entity", captureNames: ["entity"] },
      { role: "place", captureNames: ["place"] },
    ],
    evidence: [{ captureNames: ["evidence-1", "entity", "evidence-2"] }],
  },
];

const negatedEmploymentPattern: TextRulesTokenPattern = {
  ruleId: "relation-pattern:negated-employment",
  atoms: [
    { kind: "literal", value: "does" },
    { kind: "literal", value: "not" },
    { kind: "literal", value: "work" },
    { kind: "literal", value: "for" },
  ],
};

const frozenCoreferenceRuleResources: readonly TextRulesCoreferenceRule[] = [
  {
    ruleId: "coreference:en:pronoun-pair",
    language: "en",
    pattern: {
      ruleId: "coreference-pattern:en:pronoun-pair",
      atoms: [
        { kind: "literal", value: "Mira", capture: "person" },
        { kind: "literal", value: "checked" },
        { kind: "literal", value: "the", capture: "object-1" },
        { kind: "literal", value: "sensor", capture: "object-2" },
        { kind: "literal", value: "because" },
        { kind: "literal", value: "she", capture: "person-pronoun" },
        { kind: "literal", value: "calibrated" },
        { kind: "literal", value: "it", capture: "object-pronoun" },
        { kind: "literal", value: "yesterday" },
        { kind: "literal", value: "." },
      ],
    },
    mentions: [
      { id: "mention-1", kind: "proper", captureNames: ["person"] },
      { id: "mention-2", kind: "nominal", captureNames: ["object-1", "object-2"] },
      { id: "mention-3", kind: "pronoun", captureNames: ["person-pronoun"] },
      { id: "mention-4", kind: "pronoun", captureNames: ["object-pronoun"] },
    ],
    chains: [
      { id: "chain-1", mentionIds: ["mention-1", "mention-3"], representativeMentionId: "mention-1" },
      { id: "chain-2", mentionIds: ["mention-2", "mention-4"], representativeMentionId: "mention-2" },
    ],
  },
  {
    ruleId: "coreference:en:nominal-company",
    language: "en",
    pattern: {
      ruleId: "coreference-pattern:en:nominal-company",
      atoms: [
        { kind: "literal", value: "Northwind", capture: "company-1" },
        { kind: "literal", value: "Labs", capture: "company-2" },
        { kind: "literal", value: "released" },
        { kind: "literal", value: "the" },
        { kind: "literal", value: "report" },
        { kind: "literal", value: "." },
        { kind: "literal", value: "The", capture: "nominal-1" },
        { kind: "literal", value: "company", capture: "nominal-2" },
        { kind: "literal", value: "archived" },
        { kind: "literal", value: "the" },
        { kind: "literal", value: "draft" },
        { kind: "literal", value: "." },
      ],
    },
    mentions: [
      { id: "mention-1", kind: "proper", captureNames: ["company-1", "company-2"] },
      { id: "mention-2", kind: "nominal", captureNames: ["nominal-1", "nominal-2"] },
    ],
    chains: [{ id: "chain-1", mentionIds: ["mention-1", "mention-2"], representativeMentionId: "mention-1" }],
  },
  {
    ruleId: "coreference:es:pronoun-pair",
    language: "es",
    pattern: {
      ruleId: "coreference-pattern:es:pronoun-pair",
      atoms: [
        { kind: "literal", value: "Lucía", capture: "person" },
        { kind: "literal", value: "encontró" },
        { kind: "literal", value: "el", capture: "object-1" },
        { kind: "literal", value: "cuaderno", capture: "object-2" },
        { kind: "literal", value: "y" },
        { kind: "literal", value: "ella", capture: "person-pronoun" },
        { kind: "literal", value: "lo", capture: "object-pronoun" },
        { kind: "literal", value: "guardó" },
        { kind: "literal", value: "." },
      ],
    },
    mentions: [
      { id: "mention-1", kind: "proper", captureNames: ["person"] },
      { id: "mention-2", kind: "nominal", captureNames: ["object-1", "object-2"] },
      { id: "mention-3", kind: "pronoun", captureNames: ["person-pronoun"] },
      { id: "mention-4", kind: "pronoun", captureNames: ["object-pronoun"] },
    ],
    chains: [
      { id: "chain-1", mentionIds: ["mention-1", "mention-3"], representativeMentionId: "mention-1" },
      { id: "chain-2", mentionIds: ["mention-2", "mention-4"], representativeMentionId: "mention-2" },
    ],
  },
  {
    ruleId: "coreference:ar:attached-pronoun",
    language: "ar",
    pattern: {
      ruleId: "coreference-pattern:ar:attached-pronoun",
      atoms: [
        { kind: "literal", value: "قرأت" },
        { kind: "literal", value: "سلمى", capture: "person" },
        { kind: "literal", value: "الرسالة", capture: "object" },
        { kind: "literal", value: "ثم" },
        { kind: "literal", value: "حفظتها", capture: "attached-pronoun" },
        { kind: "literal", value: "." },
      ],
    },
    mentions: [
      { id: "mention-1", kind: "proper", captureNames: ["person"] },
      { id: "mention-2", kind: "nominal", captureNames: ["object"] },
      {
        id: "mention-3",
        kind: "pronoun",
        captureNames: ["attached-pronoun"],
        startOffsetCU: 4,
        notes: ["attached-pronoun-suffix"],
      },
    ],
    chains: [
      { id: "chain-1", mentionIds: ["mention-1"], representativeMentionId: "mention-1", diagnostics: ["singleton-control"] },
      { id: "chain-2", mentionIds: ["mention-2", "mention-3"], representativeMentionId: "mention-2" },
    ],
  },
  {
    ruleId: "coreference:en:ambiguous-pronoun",
    language: "en",
    pattern: {
      ruleId: "coreference-pattern:en:ambiguous-pronoun",
      atoms: [
        { kind: "literal", value: "Mira", capture: "candidate-1" },
        { kind: "literal", value: "called" },
        { kind: "literal", value: "Jana", capture: "candidate-2" },
        { kind: "literal", value: "after" },
        { kind: "literal", value: "she", capture: "pronoun" },
        { kind: "literal", value: "reviewed" },
        { kind: "literal", value: "the", capture: "file-1" },
        { kind: "literal", value: "file", capture: "file-2" },
        { kind: "literal", value: "." },
      ],
    },
    mentions: [
      { id: "mention-1", kind: "proper", captureNames: ["candidate-1"] },
      { id: "mention-2", kind: "proper", captureNames: ["candidate-2"] },
      { id: "mention-3", kind: "pronoun", captureNames: ["pronoun"], notes: ["ambiguous-antecedent"] },
      { id: "mention-4", kind: "singleton", captureNames: ["file-1", "file-2"] },
    ],
    chains: [
      { id: "chain-1", mentionIds: ["mention-1"], representativeMentionId: "mention-1", diagnostics: ["candidate-antecedent-for:mention-3"] },
      { id: "chain-2", mentionIds: ["mention-2"], representativeMentionId: "mention-2", diagnostics: ["candidate-antecedent-for:mention-3"] },
      { id: "chain-3", mentionIds: ["mention-3"], diagnostics: ["ambiguous-antecedent"] },
      { id: "chain-4", mentionIds: ["mention-4"], representativeMentionId: "mention-4", diagnostics: ["singleton-control"] },
    ],
    diagnostics: [
      {
        code: "ambiguous-antecedent",
        severity: "info",
        message: "Ambiguous pronoun antecedents are preserved as singleton candidate chains for this frozen slice.",
      },
    ],
  },
];

function ruleLanguageMatches(ruleLanguage: string | undefined, languageHint: string | undefined): boolean {
  if (ruleLanguage === undefined) return true;
  return normalizeLanguageHint(languageHint).includes(normalizeSurface(ruleLanguage));
}

function capturesByName(match: TextRulesPatternMatch): ReadonlyMap<string, TextRulesPatternCapture> {
  const captures = new Map<string, TextRulesPatternCapture>();
  for (const capture of match.captures) captures.set(capture.name, capture);
  return captures;
}

function resolveCaptureSpan(
  template: TextRulesCaptureSpanTemplate,
  captures: ReadonlyMap<string, TextRulesPatternCapture>,
): Omit<TextRulesRelationSpanSpec, "role"> | undefined {
  const resolved = template.captureNames.map((name) => captures.get(name));
  if (resolved.some((capture) => capture === undefined)) return undefined;
  const captureList = resolved as readonly TextRulesPatternCapture[];
  const startCapture = captureList.reduce((left, right) => (left.startCU <= right.startCU ? left : right));
  const endCapture = captureList.reduce((left, right) => (left.endCU >= right.endCU ? left : right));
  const startCU = startCapture.startCU + (template.startOffsetCU ?? 0);
  const endCU = template.endOffsetCU === undefined ? endCapture.endCU : endCapture.startCU + template.endOffsetCU;
  return {
    text: startCapture.value.slice(0, Math.max(0, endCU - startCU)) === ""
      ? captureList.map((capture) => capture.value).join(" ")
      : startCapture.value.slice(startCU - startCapture.startCU, endCU - startCapture.startCU),
    startCU,
    endCU,
  };
}

function resolveCaptureText(inputText: string, span: Omit<TextRulesRelationSpanSpec, "role">): Omit<TextRulesRelationSpanSpec, "role"> {
  return {
    ...span,
    text: inputText.slice(span.startCU, span.endCU),
  };
}

export function applyTextRulesDependencyRules(
  tokens: readonly TextRulesTokenSpan[],
  languageHint: string | undefined,
  rules: readonly TextRulesDependencyRule[],
): readonly TextRulesDependencyNodeSpec[] {
  for (const rule of rules) {
    if (!ruleLanguageMatches(rule.language, languageHint)) continue;
    const match = matchTextRulesTokenPattern(tokens, rule.pattern)[0];
    if (match === undefined) continue;
    const captures = capturesByName(match);
    const specs: TextRulesDependencyNodeSpec[] = [];
    for (const node of rule.nodes) {
      const target = captures.get(node.targetCapture);
      if (target === undefined) {
        specs.length = 0;
        break;
      }
      specs.push({
        id: node.id,
        form: node.form,
        targetTokenId: target.tokenId,
        head: node.head,
        relation: node.relation,
      });
    }
    if (specs.length > 0) return specs;
  }
  return [];
}

export function applyTextRulesRelationRules(
  inputText: string,
  tokens: readonly TextRulesTokenSpan[],
  languageHint: string | undefined,
  rules: readonly TextRulesRelationRule[],
): readonly TextRulesRelationSpec[] {
  const specs: TextRulesRelationSpec[] = [];
  for (const rule of rules) {
    if (!ruleLanguageMatches(rule.language, languageHint)) continue;
    const match = matchTextRulesTokenPattern(tokens, rule.pattern)[0];
    if (match === undefined) continue;
    const captures = capturesByName(match);
    const argumentSpecs = rule.arguments.map((argument) => {
      const span = resolveCaptureSpan(argument, captures);
      return span === undefined ? undefined : { role: argument.role, ...resolveCaptureText(inputText, span) };
    });
    const evidenceSpecs = rule.evidence.map((evidence) => {
      const span = resolveCaptureSpan(evidence, captures);
      return span === undefined ? undefined : resolveCaptureText(inputText, span);
    });
    if (argumentSpecs.some((argument) => argument === undefined) || evidenceSpecs.some((evidence) => evidence === undefined)) {
      continue;
    }
    specs.push({
      id: `relation-${specs.length + 1}`,
      label: rule.label,
      arguments: argumentSpecs as readonly TextRulesRelationSpanSpec[],
      evidence: evidenceSpecs as readonly Omit<TextRulesRelationSpanSpec, "role">[],
    });
  }
  return specs;
}

export function applyTextRulesCoreferenceRules(
  inputText: string,
  tokens: readonly TextRulesTokenSpan[],
  languageHint: string | undefined,
  rules: readonly TextRulesCoreferenceRule[],
): TextRulesCoreferenceSpec {
  for (const rule of rules) {
    if (!ruleLanguageMatches(rule.language, languageHint)) continue;
    const match = matchTextRulesTokenPattern(tokens, rule.pattern)[0];
    if (match === undefined) continue;
    const captures = capturesByName(match);
    const mentions = rule.mentions.map((mention) => {
      const span = resolveCaptureSpan(mention, captures);
      return span === undefined
        ? undefined
        : {
            id: mention.id,
            kind: mention.kind,
            ...resolveCaptureText(inputText, span),
            ...(mention.notes ? { notes: mention.notes } : {}),
          };
    });
    if (mentions.some((mention) => mention === undefined)) continue;
    return {
      mentions: mentions as readonly TextRulesCoreferenceMentionSpec[],
      chains: rule.chains,
      diagnostics: rule.diagnostics ?? [],
    };
  }
  return {
    mentions: [],
    chains: [],
    diagnostics: [
      {
        code: "unsupported-coreference-pattern",
        severity: "warning",
        message: "No coreference rule matched the current frozen fixture scope.",
      },
    ],
  };
}

function dependencySpecsFromDeclarativeRules(
  input: TextRulesDependencyParserInput,
  tokens: readonly TextRulesTokenSpan[],
): readonly TextRulesDependencyNodeSpec[] {
  return applyTextRulesDependencyRules(tokens, input.languageHint, frozenDependencyRuleResources);
}

function relationSpecsFromDeclarativeRules(
  input: TextRulesRelationExtractionInput,
  tokens: readonly TextRulesTokenSpan[],
): readonly TextRulesRelationSpec[] {
  return applyTextRulesRelationRules(input.text, tokens, input.languageHint, frozenRelationRuleResources);
}

function relationDiagnosticsFromRules(
  tokens: readonly TextRulesTokenSpan[],
  relationCount: number,
): readonly TextProtocolDiagnostic[] {
  if (relationCount > 0) return [];
  if (matchTextRulesTokenPattern(tokens, negatedEmploymentPattern).length > 0) {
    return [
      {
        code: "negated-relation",
        severity: "info",
        message: "Negated employment wording is preserved as a no-relation control.",
      },
    ];
  }
  return [
    {
      code: "unsupported-relation-pattern",
      severity: "warning",
      message: "No relation-extraction rule matched the current frozen fixture scope.",
    },
  ];
}

function coreferenceSpecsFromDeclarativeRules(
  input: TextRulesCoreferenceInput,
  tokens: readonly TextRulesTokenSpan[],
): TextRulesCoreferenceSpec {
  return applyTextRulesCoreferenceRules(input.text, tokens, input.languageHint, frozenCoreferenceRuleResources);
}

function createDependencyNodeAnnotations(
  specs: readonly TextRulesDependencyNodeSpec[],
  sentenceId: string,
): readonly TextDocDependencyNodeAnnotation[] {
  return specs.map((spec, index) => ({
    id: dependencyNodeId(sentenceId, spec.id),
    kind: "dependency-node",
    nodeKind: "word",
    lifecycle: { state: "active" },
    targets: [{ kind: "annotation", annotationId: spec.targetTokenId }],
    sentenceId,
    sourceOrder: index,
    fields: {
      id: spec.id,
      form: spec.form,
      lemma: "_",
      upos: "_",
      xpos: "_",
      feats: "_",
      head: spec.head,
      deprel: spec.relation,
      deps: `${spec.head}:${spec.relation}`,
      misc: "_",
    },
    provenance: {
      references: [
        {
          kind: "textrules-rule",
          id: `dependency-parser:${dependencyParserRevision}`,
        },
      ],
    },
  }));
}

function createDependencyAnnotations(
  specs: readonly TextRulesDependencyNodeSpec[],
  sentenceId: string,
): readonly TextDocDependencyAnnotation[] {
  return specs.map((spec) => {
    const dependentNodeId = dependencyNodeId(sentenceId, spec.id);
    const headNodeId = spec.head === "0" ? null : dependencyNodeId(sentenceId, spec.head);
    return {
      id: dependencyArcId(sentenceId, spec.id),
      kind: "dependency",
      lifecycle: { state: "active" },
      targets: [
        { kind: "annotation", annotationId: dependentNodeId },
        ...(headNodeId ? [{ kind: "annotation" as const, annotationId: headNodeId }] : []),
      ],
      dependentNodeId,
      headNodeId,
      relation: spec.relation,
      source: {
        sentenceId,
        conlluId: spec.id,
        conlluHead: spec.head,
        conlluDeprel: spec.relation,
        conlluDeps: `${spec.head}:${spec.relation}`,
      },
    };
  });
}

function createRelationArgumentAnnotations(
  specs: readonly TextRulesRelationSpec[],
  input: TextRulesRelationExtractionInput,
): readonly TextDocEntityAnnotation[] {
  return specs.flatMap((spec) => {
    const argumentsForSpec = spec.arguments.map((argument, index): TextDocEntityAnnotation => ({
      id: `${spec.id}:arg-${index + 1}`,
      kind: "entity",
      lifecycle: {
        state: "active",
      },
      targets: [
        {
          kind: "span",
          viewId: "analysis-view",
          startCU: argument.startCU,
          endCU: argument.endCU,
        },
      ],
      label: "RELATION_ARGUMENT",
      text: argument.text,
      provenance: {
        source: {
          id: input.sourceId,
          ...(input.sourceSha256 ? { sha256: input.sourceSha256 } : {}),
        },
        references: [
          {
            kind: "textrules-rule",
            id: `relation-extraction:${relationExtractionRevision}`,
          },
        ],
      },
    }));
    const evidenceForSpec = spec.evidence.map((evidence, index): TextDocEntityAnnotation => ({
      id: `${spec.id}:evidence-${index + 1}`,
      kind: "entity",
      lifecycle: {
        state: "active",
      },
      targets: [
        {
          kind: "span",
          viewId: "analysis-view",
          startCU: evidence.startCU,
          endCU: evidence.endCU,
        },
      ],
      label: "RELATION_EVIDENCE",
      text: evidence.text,
      provenance: {
        source: {
          id: input.sourceId,
          ...(input.sourceSha256 ? { sha256: input.sourceSha256 } : {}),
        },
        references: [
          {
            kind: "textrules-rule",
            id: `relation-extraction:${relationExtractionRevision}`,
          },
        ],
      },
    }));
    return [...argumentsForSpec, ...evidenceForSpec];
  });
}

function createRelationAnnotations(
  specs: readonly TextRulesRelationSpec[],
): readonly TextDocRelationAnnotation[] {
  return specs.map((spec) => ({
    id: spec.id,
    kind: "relation",
    lifecycle: {
      state: "active",
    },
    targets: spec.evidence.map((_, index) => ({
      kind: "annotation",
      annotationId: `${spec.id}:evidence-${index + 1}`,
    })),
    relationType: spec.label,
    arguments: spec.arguments.map((argument, index) => ({
      role: argument.role,
      annotationId: `${spec.id}:arg-${index + 1}`,
    })),
    provenance: {
      references: [
        {
          kind: "textrules-rule",
          id: `relation-extraction:${relationExtractionRevision}`,
        },
      ],
    },
  }));
}

function createCoreferenceMentionAnnotations(
  specs: readonly TextRulesCoreferenceMentionSpec[],
  input: TextRulesCoreferenceInput,
): readonly TextDocCoreferenceMentionAnnotation[] {
  return specs.map((spec) => ({
    id: spec.id,
    kind: "coreference-mention",
    lifecycle: {
      state: "active",
    },
    targets: [
      {
        kind: "span",
        viewId: "analysis-view",
        startCU: spec.startCU,
        endCU: spec.endCU,
      },
    ],
    mentionType: spec.kind,
    text: spec.text,
    ...(spec.notes && spec.notes.length > 0 ? { notes: spec.notes } : {}),
    provenance: {
      source: {
        id: input.sourceId,
        ...(input.sourceSha256 ? { sha256: input.sourceSha256 } : {}),
      },
      references: [
        {
          kind: "textrules-rule",
          id: `coreference:${coreferenceRevision}`,
        },
      ],
    },
  }));
}

function createCoreferenceChainAnnotations(
  specs: readonly TextRulesCoreferenceChainSpec[],
): readonly TextDocCoreferenceChainAnnotation[] {
  return specs.map((spec) => ({
    id: spec.id,
    kind: "coreference-chain",
    lifecycle: {
      state: "active",
    },
    targets: spec.mentionIds.map((mentionId) => ({
      kind: "annotation",
      annotationId: mentionId,
    })),
    mentionIds: spec.mentionIds,
    ...(spec.representativeMentionId ? { representativeMentionId: spec.representativeMentionId } : {}),
    ...(spec.diagnostics && spec.diagnostics.length > 0 ? { notes: spec.diagnostics } : {}),
    provenance: {
      references: [
        {
          kind: "textrules-rule",
          id: `coreference:${coreferenceRevision}`,
        },
      ],
    },
  }));
}

function isBoundaryCodeUnit(value: string | undefined): boolean {
  return value === undefined || !/[\p{Letter}\p{Number}]/u.test(value);
}

function hasEntityBoundary(text: string, startCU: number, endCU: number): boolean {
  return isBoundaryCodeUnit(text[startCU - 1]) && isBoundaryCodeUnit(text[endCU]);
}

function findSurfaceMatches(
  text: string,
  searchText: string,
  entry: TextRulesEntityEntry,
  resource: TextRulesEntityResource,
  priority: number,
): readonly TextRulesEntityMatch[] {
  const matches: TextRulesEntityMatch[] = [];
  let cursor = 0;

  while (cursor <= text.length) {
    const startCU = text.indexOf(searchText, cursor);
    if (startCU < 0) break;
    const endCU = startCU + searchText.length;
    if (hasEntityBoundary(text, startCU, endCU)) {
      matches.push({
        entry,
        resource,
        startCU,
        endCU,
        text: text.slice(startCU, endCU),
        priority,
        matchedSurface: searchText,
      });
    }
    cursor = Math.max(endCU, startCU + 1);
  }

  return matches;
}

function findCaseFoldSurfaceMatches(
  text: string,
  searchText: string,
  entry: TextRulesEntityEntry,
  resource: TextRulesEntityResource,
): readonly TextRulesEntityMatch[] {
  const normalizedText = text.toLocaleLowerCase("und");
  const normalizedSearch = searchText.toLocaleLowerCase("und");
  const matches: TextRulesEntityMatch[] = [];
  let cursor = 0;

  while (cursor <= normalizedText.length) {
    const startCU = normalizedText.indexOf(normalizedSearch, cursor);
    if (startCU < 0) break;
    const endCU = startCU + normalizedSearch.length;
    if (hasEntityBoundary(text, startCU, endCU)) {
      matches.push({
        entry,
        resource,
        startCU,
        endCU,
        text: text.slice(startCU, endCU),
        priority: 1,
        matchedSurface: searchText,
      });
    }
    cursor = Math.max(endCU, startCU + 1);
  }

  return matches;
}

function compareEntityMatches(left: TextRulesEntityMatch, right: TextRulesEntityMatch): number {
  return (
    left.startCU - right.startCU ||
    left.priority - right.priority ||
    right.endCU - right.startCU - (left.endCU - left.startCU) ||
    left.entry.label.localeCompare(right.entry.label) ||
    right.resource.overlayPrecedence - left.resource.overlayPrecedence ||
    left.entry.id.localeCompare(right.entry.id) ||
    left.resource.resourceId.localeCompare(right.resource.resourceId)
  );
}

function entityMatchesOverlap(left: TextRulesEntityMatch, right: TextRulesEntityMatch): boolean {
  return left.startCU < right.endCU && right.startCU < left.endCU;
}

function collectEntityMatches(
  text: string,
  resources: readonly TextRulesEntityResource[],
): readonly TextRulesEntityMatch[] {
  const matchesByKey = new Map<string, TextRulesEntityMatch>();

  for (const resource of resources) {
    for (const entry of resource.entries) {
      const surfaces = [entry.surface, ...(entry.aliases ?? [])];
      for (const surface of surfaces) {
        if (surface.length === 0) continue;
        const exactMatches = findSurfaceMatches(text, surface, entry, resource, 0);
        const fallbackMatches =
          entry.caseFoldFallback === true
            ? findCaseFoldSurfaceMatches(text, surface, entry, resource)
            : [];
        for (const match of [...exactMatches, ...fallbackMatches]) {
          const key = `${match.startCU}:${match.endCU}:${match.entry.label}:${match.entry.id}`;
          const existing = matchesByKey.get(key);
          if (!existing || compareEntityMatches(match, existing) < 0) {
            matchesByKey.set(key, match);
          }
        }
      }
    }
  }

  return [...matchesByKey.values()].sort(compareEntityMatches);
}

function collectEntityMatchesFromTextDoc(
  document: TextDocDocumentV1,
  resources: readonly TextRulesEntityResource[],
): readonly TextRulesEntityMatch[] {
  if (document.text === undefined) {
    throw new TypeError("entity matching over textdoc tokens requires document.text");
  }
  const tokens = textRulesTokenSpansFromTextDoc(document);
  const matchesByKey = new Map<string, TextRulesEntityMatch>();

  for (const resource of resources) {
    for (const entry of resource.entries) {
      for (const surface of [entry.surface, ...(entry.aliases ?? [])]) {
        if (surface.length === 0) continue;
        const normalizedSurface = surface.toLocaleLowerCase("und");
        for (let startIndex = 0; startIndex < tokens.length; startIndex += 1) {
          const startToken = tokens[startIndex];
          if (startToken === undefined) continue;
          for (let endIndex = startIndex; endIndex < tokens.length; endIndex += 1) {
            const endToken = tokens[endIndex];
            if (endToken === undefined) continue;
            const candidateText = document.text.slice(startToken.startCU, endToken.endCU);
            if (candidateText.length > surface.length) break;
            const exactMatch = candidateText === surface;
            const caseFoldMatch =
              entry.caseFoldFallback === true &&
              candidateText.toLocaleLowerCase("und") === normalizedSurface;
            if (!exactMatch && !caseFoldMatch) continue;
            if (!hasEntityBoundary(document.text, startToken.startCU, endToken.endCU)) continue;
            const match: TextRulesEntityMatch = {
              entry,
              resource,
              startCU: startToken.startCU,
              endCU: endToken.endCU,
              text: candidateText,
              priority: exactMatch ? 0 : 1,
              matchedSurface: surface,
            };
            const key = `${match.startCU}:${match.endCU}:${match.entry.label}:${match.entry.id}`;
            const existing = matchesByKey.get(key);
            if (!existing || compareEntityMatches(match, existing) < 0) {
              matchesByKey.set(key, match);
            }
          }
        }
      }
    }
  }

  return [...matchesByKey.values()].sort(compareEntityMatches);
}

function filterEntityOverlaps(
  matches: readonly TextRulesEntityMatch[],
  allowSpanOverlap: boolean,
): {
  readonly matches: readonly TextRulesEntityMatch[];
  readonly diagnostics: readonly TextProtocolDiagnostic[];
} {
  if (allowSpanOverlap) return { matches, diagnostics: [] };

  const accepted: TextRulesEntityMatch[] = [];
  const diagnostics: TextProtocolDiagnostic[] = [];
  for (const match of matches) {
    const overlappingMatch = accepted.find((entry) => entityMatchesOverlap(entry, match));
    if (!overlappingMatch) {
      accepted.push(match);
      continue;
    }
    diagnostics.push({
      code: "entity-overlap-suppressed",
      severity: "warning",
      message: `Suppressed ${match.entry.label} span ${match.startCU}-${match.endCU} because it overlaps ${overlappingMatch.entry.label} span ${overlappingMatch.startCU}-${overlappingMatch.endCU}.`,
    });
  }

  return { matches: accepted, diagnostics };
}

function createEntityAnnotations(
  matches: readonly TextRulesEntityMatch[],
  document: TextDocDocumentV1,
): readonly TextDocEntityAnnotation[] {
  return matches.map((match, index) => ({
    id: `entity-${index + 1}`,
    kind: "entity",
    lifecycle: {
      state: "active",
    },
    targets: [
      {
        kind: "span",
        viewId: "analysis-view",
        startCU: match.startCU,
        endCU: match.endCU,
      },
    ],
    label: match.entry.label,
    text: match.text,
    ...(match.entry.normalized ? { normalized: match.entry.normalized } : {}),
    provenance: {
      ...(document.source ? { source: document.source } : {}),
      references: [
        {
          kind: "textpack-resource",
          id: `${match.resource.packId}:${match.resource.resourceId}`,
        },
        {
          kind: "textrules-rule",
          id: match.entry.id,
        },
      ],
    },
    ...(match.entry.notes
      ? { notes: [...match.entry.notes, `matched-surface:${match.matchedSurface}`] }
      : { notes: [`matched-surface:${match.matchedSurface}`] }),
  }));
}

export function isTextRulesLexiconAnalysis(value: unknown): value is TextRulesLexiconAnalysis {
  return (
    isRecord(value) &&
    isNonEmptyString(value.ruleId) &&
    isNonEmptyString(value.pos) &&
    isNonEmptyString(value.lemma) &&
    (value.morphology === undefined ||
      (Array.isArray(value.morphology) &&
        value.morphology.every(
          (feature) =>
            isRecord(feature) &&
            isNonEmptyString(feature.name) &&
            isNonEmptyString(feature.value),
        ))) &&
    (value.notes === undefined || isStringArray(value.notes))
  );
}

export function isTextRulesLexiconEntry(value: unknown): value is TextRulesLexiconEntry {
  return (
    isRecord(value) &&
    isNonEmptyString(value.surface) &&
    Array.isArray(value.analyses) &&
    value.analyses.length >= 1 &&
    value.analyses.every((analysis) => isTextRulesLexiconAnalysis(analysis))
  );
}

export function isTextRulesEntityEntry(value: unknown): value is TextRulesEntityEntry {
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.surface) &&
    isTextRulesEntityLabel(value.label) &&
    (value.normalized === undefined || isNonEmptyString(value.normalized)) &&
    (value.aliases === undefined || isStringArray(value.aliases)) &&
    (value.caseFoldFallback === undefined || typeof value.caseFoldFallback === "boolean") &&
    (value.notes === undefined || isStringArray(value.notes))
  );
}

export function isTextRulesLexiconResourceData(value: unknown): value is TextRulesLexiconResourceData {
  return (
    isRecord(value) &&
    Array.isArray(value.entries) &&
    value.entries.length >= 1 &&
    value.entries.every((entry) => isTextRulesLexiconEntry(entry))
  );
}

export function isTextRulesEntityResourceData(value: unknown): value is TextRulesEntityResourceData {
  return (
    isRecord(value) &&
    Array.isArray(value.entries) &&
    value.entries.length >= 1 &&
    value.entries.every((entry) => isTextRulesEntityEntry(entry))
  );
}

export function createTextRulesLexiconResource(
  resource: TextPackResolvedResource,
  data: TextRulesLexiconResourceData,
): TextRulesLexiconResource {
  return {
    packId: resource.packId,
    packageName: resource.packageName,
    version: resource.version,
    resourceId: resource.resourceId,
    lookupKey: resource.lookupKey,
    overlayPrecedence: resource.overlayPrecedence,
    ...(resource.language ? { language: resource.language } : {}),
    entries: data.entries.map((entry) => ({
      surface: entry.surface,
      analyses: entry.analyses.map((analysis) => ({
        ruleId: analysis.ruleId,
        pos: analysis.pos,
        lemma: analysis.lemma,
        ...(analysis.morphology === undefined ? {} : { morphology: normalizeFeatures(analysis.morphology) }),
        ...(analysis.notes ? { notes: analysis.notes } : {}),
      })),
    })),
  };
}

export function createTextRulesEntityResource(
  resource: TextPackResolvedResource,
  data: TextRulesEntityResourceData,
): TextRulesEntityResource {
  return {
    packId: resource.packId,
    packageName: resource.packageName,
    version: resource.version,
    resourceId: resource.resourceId,
    lookupKey: resource.lookupKey,
    overlayPrecedence: resource.overlayPrecedence,
    ...(resource.language ? { language: resource.language } : {}),
    entries: data.entries.map((entry) => ({
      id: entry.id,
      surface: entry.surface,
      label: entry.label,
      ...(entry.normalized ? { normalized: entry.normalized } : {}),
      ...(entry.aliases ? { aliases: [...entry.aliases].sort() } : {}),
      ...(entry.caseFoldFallback === undefined ? {} : { caseFoldFallback: entry.caseFoldFallback }),
      ...(entry.notes ? { notes: entry.notes } : {}),
    })),
  };
}

function textRulesDiagnostic(
  code: TextRulesResourceDiagnosticCode,
  resource: TextPackResolvedResource,
  message: string,
  line?: number,
): TextRulesResourceDiagnostic {
  return {
    code,
    packId: resource.packId,
    resourceId: resource.resourceId,
    ...(line === undefined ? {} : { line }),
    message,
  };
}

function parseTextRulesMorphologyAttributes(
  attributes: Readonly<Record<string, string>>,
): readonly TextDocFeature[] {
  const features: TextDocFeature[] = [];
  for (const [name, value] of Object.entries(attributes).sort(([left], [right]) => left.localeCompare(right))) {
    if (name === "lemma" || name === "pos" || name === "ruleId" || name === "notes") continue;
    if (name === "morphology") {
      for (const part of value.split("|")) {
        const [featureName, featureValue] = part.split("=");
        if (featureName && featureValue) {
          features.push({ name: featureName, value: featureValue });
        }
      }
      continue;
    }
    features.push({ name, value });
  }
  return normalizeFeatures(features);
}

function textRulesNotesFromAttributes(
  attributes: Readonly<Record<string, string>>,
): readonly string[] | undefined {
  const notes = attributes.notes;
  if (notes === undefined || notes.trim().length === 0) return undefined;
  return notes
    .split("|")
    .map((note) => note.trim())
    .filter((note) => note.length > 0);
}

export function createTextRulesLexiconResourcesFromLoadedPack(
  loadedResources: readonly TextPackLoadedResource[],
): TextRulesLoadedLexiconResources {
  const resources: TextRulesLexiconResource[] = [];
  const diagnostics: TextRulesResourceDiagnostic[] = [];

  for (const loadedResource of loadedResources) {
    const { resource } = loadedResource;
    if (resource.kind !== "lexicon") {
      diagnostics.push(
        textRulesDiagnostic(
          "unsupported-resource-kind",
          resource,
          `Resource ${resource.resourceId} has kind ${resource.kind}; expected lexicon.`,
        ),
      );
      continue;
    }

    const entriesBySurface = new Map<string, TextRulesLexiconAnalysis[]>();
    for (const entry of loadedResource.entries) {
      const pos = entry.attributes.pos;
      const lemma = entry.attributes.lemma;
      if (pos === undefined || lemma === undefined) {
        diagnostics.push(
          textRulesDiagnostic(
            "missing-lexicon-attribute",
            resource,
            `Lexicon entry ${entry.value} must declare pos and lemma attributes.`,
            entry.line,
          ),
        );
        continue;
      }
      const analyses = entriesBySurface.get(entry.value) ?? [];
      const morphology = parseTextRulesMorphologyAttributes(entry.attributes);
      const notes = textRulesNotesFromAttributes(entry.attributes);
      analyses.push({
        ruleId:
          entry.attributes.ruleId ??
          `textpack:${resource.packId}:${resource.resourceId}:${entry.line}:${pos}`,
        pos,
        lemma,
        ...(morphology.length === 0 ? {} : { morphology }),
        ...(notes === undefined ? {} : { notes }),
      });
      entriesBySurface.set(entry.value, analyses);
    }

    resources.push(
      createTextRulesLexiconResource(resource, {
        entries: [...entriesBySurface.entries()]
          .sort(([left], [right]) => normalizeSurface(left).localeCompare(normalizeSurface(right)))
          .map(([surface, analyses]) => ({
            surface,
            analyses: analyses.sort((left, right) => left.ruleId.localeCompare(right.ruleId)),
          })),
      }),
    );
  }

  return { resources, diagnostics };
}

export function createTextRulesEntityResourcesFromLoadedPack(
  loadedResources: readonly TextPackLoadedResource[],
): TextRulesLoadedEntityResources {
  const resources: TextRulesEntityResource[] = [];
  const diagnostics: TextRulesResourceDiagnostic[] = [];

  for (const loadedResource of loadedResources) {
    const { resource } = loadedResource;
    if (resource.kind !== "gazetteer") {
      diagnostics.push(
        textRulesDiagnostic(
          "unsupported-resource-kind",
          resource,
          `Resource ${resource.resourceId} has kind ${resource.kind}; expected gazetteer.`,
        ),
      );
      continue;
    }

    const entries: TextRulesEntityEntry[] = [];
    for (const entry of loadedResource.entries) {
      if (!isTextRulesEntityLabel(entry.label)) {
        diagnostics.push(
          textRulesDiagnostic(
            "unsupported-entity-label",
            resource,
            `Gazetteer entry ${entry.value} has unsupported label ${entry.label ?? "(missing)"}.`,
            entry.line,
          ),
        );
        continue;
      }
      const notes = textRulesNotesFromAttributes(entry.attributes);
      entries.push({
        id: entry.attributes.id ?? `${resource.resourceId}:${entry.line}`,
        surface: entry.value,
        label: entry.label,
        ...(entry.attributes.normalized === undefined ? {} : { normalized: entry.attributes.normalized }),
        ...(entry.attributes.aliases === undefined
          ? {}
          : {
              aliases: entry.attributes.aliases
                .split("|")
                .map((alias) => alias.trim())
                .filter((alias) => alias.length > 0),
            }),
        ...(entry.attributes.caseFoldFallback === undefined
          ? {}
          : { caseFoldFallback: entry.attributes.caseFoldFallback === "true" }),
        ...(notes === undefined ? {} : { notes }),
      });
    }

    resources.push(
      createTextRulesEntityResource(resource, {
        entries: entries.sort((left, right) => left.id.localeCompare(right.id)),
      }),
    );
  }

  return { resources, diagnostics };
}

export function analyzeRuleBackedNer(
  input: TextRulesRuleBackedNerInput,
  resources: readonly TextRulesEntityResource[],
): TextRulesRuleBackedNerResult {
  const document = input.document;
  if (document.text === undefined) {
    throw new TypeError("rule-backed NER requires document.text so offsets can be matched deterministically");
  }
  if (!documentHasLayerKind(document, "token")) {
    throw new TypeError("rule-backed NER requires an existing token layer");
  }
  if (!documentHasLayerKind(document, "sentence")) {
    throw new TypeError("rule-backed NER requires an existing sentence layer");
  }

  const selectedResources = selectEntityResources(resources, input.languageHint);
  const rawMatches = collectEntityMatchesFromTextDoc(document, selectedResources);
  const { matches, diagnostics } = filterEntityOverlaps(rawMatches, input.allowSpanOverlap === true);
  const entityAnnotations = createEntityAnnotations(matches, document);
  const entityLayer: TextRulesEntityLayer = {
    id: "entities",
    kind: "entity",
    viewId: "analysis-view",
    ...(input.allowSpanOverlap === true ? { allowSpanOverlap: true } : {}),
    annotations: entityAnnotations,
    notes: [
      "Rule-backed NER emits only the frozen PER/ORG/LOC label set for declared resources.",
    ],
  };

  return {
    document: {
      ...document,
      revision: ruleBackedNerRevision,
      views: entityDocumentViews(document),
      spanMaps: analysisDocumentSpanMaps(document),
      layers: [...document.layers.filter((layer) => layer.id !== "entities"), entityLayer],
    },
    diagnostics: sortDiagnostics(diagnostics),
  };
}

function posMorphLemmaViews(document: TextDocDocumentV1): readonly TextDocView[] {
  if (document.views.some((view) => view.id === "analysis-view")) return document.views;
  const parentViewId = document.views.some((view) => view.id === "source-view")
    ? "source-view"
    : document.views[0]?.id;
  if (parentViewId === undefined) return document.views;
  return [
    ...document.views,
    {
      id: "analysis-view",
      kind: "task",
      description: "Deterministic textrules POS, lemma, and morphology annotations.",
      parentViewId,
      spanMapIds: ["span-map-source-analysis"],
    },
  ];
}

export function analyzePosMorphLemmaDocument(
  input: TextRulesPosMorphLemmaDocumentInput,
  resources: readonly TextRulesLexiconResource[],
): TextRulesPosMorphLemmaResult {
  const selectedResources = selectResources(resources, input.languageHint);
  const entriesBySurface = buildLexiconIndex(selectedResources);
  const tokens = textRulesTokenSpansFromTextDoc(
    input.document,
    input.tokenLayerId === undefined ? {} : { tokenLayerId: input.tokenLayerId },
  );
  const source = input.document.source ?? { id: input.document.documentId };
  const posAnnotations: TextDocPosAnnotation[] = [];
  const lemmaAnnotations: TextDocLemmaAnnotation[] = [];
  const morphologyAnnotations: TextDocMorphologyAnnotation[] = [];
  const diagnostics: TextProtocolDiagnostic[] = [];

  if ((input.phenomena ?? []).includes("code-switching")) {
    diagnostics.push({
      code: "code-switching-slice",
      severity: "info",
      message: "Mixed-language slice loads lexicon resources for each declared language hint.",
    });
  }

  for (const token of tokens) {
    const { analyses, diagnostics: fallbackDiagnostics } = resolveAnalyses(token, entriesBySurface);
    diagnostics.push(...fallbackDiagnostics, ...createPhenomenonDiagnostics(token, input.phenomena));

    if (analyses.length === 0) continue;

    const references = analyses.flatMap((analysis) => [
      ...analysis.resourceRefs,
      {
        kind: "textrules-rule",
        id: analysis.ruleId,
      } satisfies TextDocReferenceRef,
    ]);
    const provenance = annotationProvenance(source, references);

    const posValues: { value: string; notes?: readonly string[] }[] = [];
    const seenPos = new Set<string>();
    for (const analysis of analyses) {
      if (seenPos.has(analysis.pos)) continue;
      seenPos.add(analysis.pos);
      posValues.push({
        value: analysis.pos,
        ...(analysis.notes ? { notes: analysis.notes } : {}),
      });
    }

    posAnnotations.push({
      id: `${token.id}:pos`,
      kind: "pos",
      lifecycle: {
        state: "active",
      },
      targets: [
        {
          kind: "annotation",
          annotationId: token.id,
        },
      ],
      tagSet: posMorphLemmaTagSet,
      alternatives: createStringAlternatives(token.id, "pos", posValues),
      provenance,
    });

    const lemmaValues: { value: string; notes?: readonly string[] }[] = [];
    const seenLemmas = new Set<string>();
    for (const analysis of analyses) {
      if (seenLemmas.has(analysis.lemma)) continue;
      seenLemmas.add(analysis.lemma);
      lemmaValues.push({
        value: analysis.lemma,
        ...(analysis.notes ? { notes: analysis.notes } : {}),
      });
    }

    lemmaAnnotations.push({
      id: `${token.id}:lemma`,
      kind: "lemma",
      lifecycle: {
        state: "active",
      },
      targets: [
        {
          kind: "annotation",
          annotationId: token.id,
        },
      ],
      alternatives: createStringAlternatives(token.id, "lemma", lemmaValues),
      provenance,
    });

    const morphologyValues: { features: readonly TextDocFeature[]; notes?: readonly string[] }[] = [];
    const seenMorphologies = new Set<string>();
    for (const analysis of analyses) {
      const morphology = analysis.morphology ?? [];
      if (morphology.length === 0) continue;
      const morphologyKey = stableMorphKey(morphology);
      if (seenMorphologies.has(morphologyKey)) continue;
      seenMorphologies.add(morphologyKey);
      morphologyValues.push({
        features: normalizeFeatures(morphology),
        ...(analysis.notes ? { notes: analysis.notes } : {}),
      });
    }

    if (morphologyValues.length > 0) {
      morphologyAnnotations.push({
        id: `${token.id}:morphology`,
        kind: "morphology",
        lifecycle: {
          state: "active",
        },
        targets: [
          {
            kind: "annotation",
            annotationId: token.id,
          },
        ],
        alternatives: createMorphologyAlternatives(token.id, morphologyValues),
        provenance,
      });
    }
  }

  const layers: TextDocLayer<TextDocAnnotation>[] = [
    ...input.document.layers.filter(
      (layer) => layer.id !== "pos" && layer.id !== "lemmas" && layer.id !== "morphology",
    ),
    {
      id: "pos",
      kind: "pos",
      viewId: "analysis-view",
      annotations: posAnnotations,
    } satisfies TextRulesPosLayer,
    {
      id: "lemmas",
      kind: "lemma",
      viewId: "analysis-view",
      annotations: lemmaAnnotations,
    } satisfies TextRulesLemmaLayer,
    {
      id: "morphology",
      kind: "morphology",
      viewId: "analysis-view",
      annotations: morphologyAnnotations,
    } satisfies TextRulesMorphologyLayer,
  ];

  return {
    document: {
      ...input.document,
      revision: input.revision ?? posMorphLemmaRevision,
      views: posMorphLemmaViews(input.document),
      spanMaps: analysisDocumentSpanMaps(input.document),
      layers,
      ...(input.phenomena && input.phenomena.length > 0
        ? {
            notes: input.phenomena.map((phenomenon) => `phenomenon:${phenomenon}`),
          }
        : {}),
    },
    diagnostics: sortDiagnostics(diagnostics),
  };
}

export function analyzePosMorphLemma(
  input: TextRulesPosMorphLemmaInput,
  resources: readonly TextRulesLexiconResource[],
): TextRulesPosMorphLemmaResult {
  const tokens = tokenizeTextRulesFixtureText(input.text);
  const sentences = segmentSentencesForRules(input.text);
  const document: TextDocDocumentV1 = {
    schemaVersion: documentSchemaVersion,
    documentId: input.documentId,
    revision: input.revision ?? posMorphLemmaRevision,
    textLengthCU: input.text.length,
    text: input.text,
    source: {
      id: input.sourceId,
      ...(input.sourceSha256 ? { sha256: input.sourceSha256 } : {}),
    },
    unicodeVersion: input.unicodeVersion ?? "17.0.0",
    units: {
      text: "utf16-code-unit",
    },
    views: createDocumentViews(),
    spanMaps: createAnalysisSpanMaps(input.text.length),
    layers: [
      {
        id: "tokens",
        kind: "token",
        viewId: "analysis-view",
        annotations: createTokenAnnotations(tokens, input.sourceId, input.sourceSha256),
      },
      {
        id: "sentences",
        kind: "sentence",
        viewId: "analysis-view",
        annotations: createSentenceAnnotations(sentences, input.sourceId, input.sourceSha256),
      },
    ],
  };
  return analyzePosMorphLemmaDocument(
    {
      document,
      revision: input.revision ?? posMorphLemmaRevision,
      ...(input.languageHint === undefined ? {} : { languageHint: input.languageHint }),
      ...(input.phenomena === undefined ? {} : { phenomena: input.phenomena }),
    },
    resources,
  );
}

export function analyzeRelationExtraction(
  input: TextRulesRelationExtractionInput,
): TextRulesRelationExtractionResult {
  const tokens = tokenizeTextForRules(input.text);
  const sentences = segmentSentencesForRules(input.text);
  const relationSpecs = relationSpecsFromDeclarativeRules(input, tokens);
  const diagnostics = relationDiagnosticsFromRules(tokens, relationSpecs.length);

  const tokenLayer: TextDocLayer<TextDocDocumentTokenAnnotation> = {
    id: "tokens",
    kind: "token",
    viewId: "analysis-view",
    annotations: createTokenAnnotations(tokens, input.sourceId, input.sourceSha256),
  };
  const sentenceLayer: TextDocLayer<TextDocDocumentSentenceAnnotation> = {
    id: "sentences",
    kind: "sentence",
    viewId: "analysis-view",
    annotations: createSentenceAnnotations(sentences, input.sourceId, input.sourceSha256),
  };
  const relationArgumentLayer: TextRulesEntityLayer = {
    id: "relation-arguments",
    kind: "entity",
    viewId: "analysis-view",
    annotations: createRelationArgumentAnnotations(relationSpecs, input),
    notes: ["Relation argument spans for frozen relation-extraction fixture scope."],
  };
  const relationLayer: TextRulesRelationLayer = {
    id: "relations",
    kind: "relation",
    viewId: "analysis-view",
    annotations: createRelationAnnotations(relationSpecs),
    notes: ["Deterministic relation annotations for frozen fixture scope."],
  };

  return {
    document: {
      schemaVersion: documentSchemaVersion,
      documentId: input.documentId,
      revision: input.revision ?? relationExtractionRevision,
      textLengthCU: input.text.length,
      text: input.text,
      source: {
        id: input.sourceId,
        ...(input.sourceSha256 ? { sha256: input.sourceSha256 } : {}),
      },
      unicodeVersion: input.unicodeVersion ?? "17.0.0",
      units: {
        text: "utf16-code-unit",
      },
      views: createRelationExtractionViews(),
      spanMaps: createAnalysisSpanMaps(input.text.length),
      layers: [tokenLayer, sentenceLayer, relationArgumentLayer, relationLayer],
      notes: [
        "Relation extraction behavior is limited to declared frozen fixtures and deterministic rules.",
      ],
    },
    diagnostics: sortDiagnostics(diagnostics),
  };
}

export function analyzeCoreference(input: TextRulesCoreferenceInput): TextRulesCoreferenceResult {
  const tokens = tokenizeTextForRules(input.text);
  const sentences = segmentSentencesForRules(input.text);
  const coreferenceSpec = coreferenceSpecsFromDeclarativeRules(input, tokens);

  const tokenLayer: TextDocLayer<TextDocDocumentTokenAnnotation> = {
    id: "tokens",
    kind: "token",
    viewId: "analysis-view",
    annotations: createTokenAnnotations(tokens, input.sourceId, input.sourceSha256),
  };
  const sentenceLayer: TextDocLayer<TextDocDocumentSentenceAnnotation> = {
    id: "sentences",
    kind: "sentence",
    viewId: "analysis-view",
    annotations: createSentenceAnnotations(sentences, input.sourceId, input.sourceSha256),
  };
  const mentionLayer: TextRulesCoreferenceMentionLayer = {
    id: "coreference-mentions",
    kind: "coreference-mention",
    viewId: "analysis-view",
    annotations: createCoreferenceMentionAnnotations(coreferenceSpec.mentions, input),
    notes: ["Coreference mention spans for frozen coreference fixture scope."],
  };
  const chainLayer: TextRulesCoreferenceChainLayer = {
    id: "coreference-chains",
    kind: "coreference-chain",
    viewId: "analysis-view",
    annotations: createCoreferenceChainAnnotations(coreferenceSpec.chains),
    notes: ["Deterministic coreference chains for frozen fixture scope."],
  };
  const layers: TextDocLayer<TextDocAnnotation>[] = [
    tokenLayer,
    sentenceLayer,
    ...(coreferenceSpec.mentions.length > 0 ? [mentionLayer, chainLayer] : []),
  ];

  return {
    document: {
      schemaVersion: documentSchemaVersion,
      documentId: input.documentId,
      revision: input.revision ?? coreferenceRevision,
      textLengthCU: input.text.length,
      text: input.text,
      source: {
        id: input.sourceId,
        ...(input.sourceSha256 ? { sha256: input.sourceSha256 } : {}),
      },
      unicodeVersion: input.unicodeVersion ?? "17.0.0",
      units: {
        text: "utf16-code-unit",
      },
      views: createCoreferenceViews(),
      spanMaps: createAnalysisSpanMaps(input.text.length),
      layers,
      notes: [
        "Coreference behavior is limited to declared frozen fixtures and deterministic rules.",
      ],
    },
    diagnostics: sortDiagnostics(coreferenceSpec.diagnostics),
  };
}

export function analyzeDependencyParser(
  input: TextRulesDependencyParserInput,
): TextRulesDependencyParserResult {
  const tokens = tokenizeTextForRules(input.text);
  const sentences = segmentSentencesForRules(input.text);
  const sentence = sentences[0];
  const dependencySpecs =
    sentence === undefined ? [] : dependencySpecsFromDeclarativeRules(input, tokens);
  const diagnostics: TextProtocolDiagnostic[] = [];

  if (dependencySpecs.length === 0) {
    diagnostics.push({
      code: "unsupported-dependency-pattern",
      severity: "warning",
      message: "No dependency-parser rule matched the current frozen fixture scope.",
    });
  }

  const tokenLayer: TextDocLayer<TextDocDocumentTokenAnnotation> = {
    id: "tokens",
    kind: "token",
    viewId: "analysis-view",
    annotations: createTokenAnnotations(tokens, input.sourceId, input.sourceSha256),
  };
  const sentenceLayer: TextDocLayer<TextDocDocumentSentenceAnnotation> = {
    id: "sentences",
    kind: "sentence",
    viewId: "analysis-view",
    annotations: createSentenceAnnotations(sentences, input.sourceId, input.sourceSha256),
  };
  const dependencyNodeLayer: TextRulesDependencyNodeLayer = {
    id: "dependency-nodes",
    kind: "dependency-node",
    viewId: "analysis-view",
    annotations:
      sentence === undefined
        ? []
        : createDependencyNodeAnnotations(dependencySpecs, sentence.id),
    notes: ["Deterministic dependency-parser nodes for frozen fixture scope."],
  };
  const dependencyLayer: TextRulesDependencyLayer = {
    id: "dependencies",
    kind: "dependency",
    viewId: "analysis-view",
    annotations:
      sentence === undefined ? [] : createDependencyAnnotations(dependencySpecs, sentence.id),
    notes: ["Deterministic dependency-parser arcs for frozen fixture scope."],
  };
  const layers: TextDocLayer<TextDocAnnotation>[] = [
    tokenLayer,
    sentenceLayer,
    ...(dependencySpecs.length > 0 ? [dependencyNodeLayer, dependencyLayer] : []),
  ];

  return {
    document: {
      schemaVersion: documentSchemaVersion,
      documentId: input.documentId,
      revision: input.revision ?? dependencyParserRevision,
      textLengthCU: input.text.length,
      text: input.text,
      source: {
        id: input.sourceId,
        ...(input.sourceSha256 ? { sha256: input.sourceSha256 } : {}),
      },
      unicodeVersion: input.unicodeVersion ?? "17.0.0",
      units: {
        text: "utf16-code-unit",
      },
      views: createDependencyParserViews(),
      spanMaps: createAnalysisSpanMaps(input.text.length),
      layers,
      notes: [
        "Dependency parser behavior is limited to declared frozen fixtures and deterministic rules.",
      ],
    },
    diagnostics: sortDiagnostics(diagnostics),
  };
}

export function createPosMorphLemmaResultEnvelope(
  result: TextRulesPosMorphLemmaResult,
  options: TextRulesResultEnvelopeOptions,
): TextProtocolResultEnvelopeV1<TextDocDocumentV1, typeof textDocDocumentPayloadKind> {
  return {
    schemaId: resultEnvelopeSchemaId,
    schemaVersion: resultEnvelopeSchemaVersion,
    producer: {
      package: packageName,
      version: options.producerVersion,
    },
    payloadKind: textDocDocumentPayloadKind,
    payload: result.document,
    provenance: {
      ...(result.document.source ? { source: result.document.source } : {}),
      references: [
        {
          kind: "textdoc-document-v1",
          id: result.document.documentId,
        },
        ...(options.referenceId
          ? [
              {
                kind: "fixture-slice",
                id: options.referenceId,
              } as const,
            ]
          : []),
      ],
    },
    ...(result.diagnostics.length > 0 ? { diagnostics: result.diagnostics } : {}),
  };
}

function conformanceStatus(matchesExpected: boolean): TextRulesConformanceCheckStatus {
  return matchesExpected ? "pass" : "fail";
}

export function createPosMorphLemmaConformanceReport(
  envelope: TextProtocolResultEnvelopeV1<TextDocDocumentV1, typeof textDocDocumentPayloadKind>,
  options: TextRulesConformanceReportOptions,
): TextRulesConformanceReportV1 {
  const expectedStatus = conformanceStatus(options.matchesExpected);

  return {
    schemaId: textRulesConformanceReportSchemaId,
    schemaVersion: textRulesConformanceReportSchemaVersion,
    reportId: `pos-morph-lemma:${envelope.payload.documentId}`,
    subject: {
      kind: "textprotocol-result-envelope",
      id: envelope.payload.documentId,
      schemaId: envelope.schemaId,
    },
    generatedAt: options.generatedAt ?? "2026-04-21T00:00:00.000Z",
    summary: {
      pass: options.matchesExpected ? 3 : 2,
      fail: options.matchesExpected ? 0 : 1,
      notRun: 0,
    },
    checks: [
      {
        checkId: "textdoc-document-shape",
        status: "pass",
        message: "POS, lemma, and morphology output is stored as a textdoc document.",
        evidenceRefs: ["schemas/textdoc-document-v1.schema.json"],
      },
      {
        checkId: "textprotocol-envelope-shape",
        status: "pass",
        message: "textdoc output is wrapped in the public result envelope.",
        evidenceRefs: ["schemas/textprotocol-result-envelope-v1.schema.json"],
      },
      {
        checkId: "expected-output-match",
        status: expectedStatus,
        message: options.matchesExpected
          ? "Generated output matches the recorded expected artifact."
          : "Generated output diverges from the recorded expected artifact.",
        evidenceRefs: [options.expectedArtifactPath],
      },
    ],
    ...(options.notes && options.notes.length > 0 ? { notes: options.notes } : {}),
  };
}

export function createRuleBackedNerResultEnvelope(
  result: TextRulesRuleBackedNerResult,
  options: TextRulesResultEnvelopeOptions,
): TextProtocolResultEnvelopeV1<TextDocDocumentV1, typeof textDocDocumentPayloadKind> {
  return {
    schemaId: resultEnvelopeSchemaId,
    schemaVersion: resultEnvelopeSchemaVersion,
    producer: {
      package: packageName,
      version: options.producerVersion,
    },
    payloadKind: textDocDocumentPayloadKind,
    payload: result.document,
    provenance: {
      ...(result.document.source ? { source: result.document.source } : {}),
      references: [
        {
          kind: "textdoc-document-v1",
          id: result.document.documentId,
        },
        ...(options.referenceId
          ? [
              {
                kind: "fixture-slice",
                id: options.referenceId,
              } as const,
            ]
          : []),
      ],
    },
    ...(result.diagnostics.length > 0 ? { diagnostics: result.diagnostics } : {}),
  };
}

export function createRuleBackedNerConformanceReport(
  envelope: TextProtocolResultEnvelopeV1<TextDocDocumentV1, typeof textDocDocumentPayloadKind>,
  options: TextRulesConformanceReportOptions,
): TextRulesConformanceReportV1 {
  const expectedStatus = conformanceStatus(options.matchesExpected);

  return {
    schemaId: textRulesConformanceReportSchemaId,
    schemaVersion: textRulesConformanceReportSchemaVersion,
    reportId: `rule-backed-ner:${envelope.payload.documentId}`,
    subject: {
      kind: "textprotocol-result-envelope",
      id: envelope.payload.documentId,
      schemaId: envelope.schemaId,
    },
    generatedAt: options.generatedAt ?? "2026-04-23T00:00:00.000Z",
    summary: {
      pass: options.matchesExpected ? 3 : 2,
      fail: options.matchesExpected ? 0 : 1,
      notRun: 0,
    },
    checks: [
      {
        checkId: "textdoc-document-shape",
        status: "pass",
        message: "Rule-backed NER output is stored as a textdoc entity layer.",
        evidenceRefs: ["schemas/textdoc-document-v1.schema.json"],
      },
      {
        checkId: "textprotocol-envelope-shape",
        status: "pass",
        message: "Rule-backed NER output is wrapped in the public result envelope.",
        evidenceRefs: ["schemas/textprotocol-result-envelope-v1.schema.json"],
      },
      {
        checkId: "expected-output-match",
        status: expectedStatus,
        message: options.matchesExpected
          ? "Generated entity output matches the recorded expected artifact."
          : "Generated entity output diverges from the recorded expected artifact.",
        evidenceRefs: [options.expectedArtifactPath],
      },
    ],
    ...(options.notes && options.notes.length > 0 ? { notes: options.notes } : {}),
  };
}

export function createRelationExtractionResultEnvelope(
  result: TextRulesRelationExtractionResult,
  options: TextRulesResultEnvelopeOptions,
): TextProtocolResultEnvelopeV1<TextDocDocumentV1, typeof textDocDocumentPayloadKind> {
  return {
    schemaId: resultEnvelopeSchemaId,
    schemaVersion: resultEnvelopeSchemaVersion,
    producer: {
      package: packageName,
      version: options.producerVersion,
    },
    payloadKind: textDocDocumentPayloadKind,
    payload: result.document,
    provenance: {
      ...(result.document.source ? { source: result.document.source } : {}),
      references: [
        {
          kind: "textdoc-document-v1",
          id: result.document.documentId,
        },
        ...(options.referenceId
          ? [
              {
                kind: "fixture-slice",
                id: options.referenceId,
              } as const,
            ]
          : []),
      ],
    },
    ...(result.diagnostics.length > 0 ? { diagnostics: result.diagnostics } : {}),
  };
}

export function createRelationExtractionConformanceReport(
  envelope: TextProtocolResultEnvelopeV1<TextDocDocumentV1, typeof textDocDocumentPayloadKind>,
  options: TextRulesConformanceReportOptions,
): TextRulesConformanceReportV1 {
  const expectedStatus = conformanceStatus(options.matchesExpected);

  return {
    schemaId: textRulesConformanceReportSchemaId,
    schemaVersion: textRulesConformanceReportSchemaVersion,
    reportId: `relation-extraction:${envelope.payload.documentId}`,
    subject: {
      kind: "textprotocol-result-envelope",
      id: envelope.payload.documentId,
      schemaId: envelope.schemaId,
    },
    generatedAt: options.generatedAt ?? "2026-05-16T00:00:00.000Z",
    summary: {
      pass: options.matchesExpected ? 3 : 2,
      fail: options.matchesExpected ? 0 : 1,
      notRun: 0,
    },
    checks: [
      {
        checkId: "textdoc-document-shape",
        status: "pass",
        message: "Relation extraction output is stored as textdoc relation annotations.",
        evidenceRefs: ["schemas/textdoc-document-v1.schema.json"],
      },
      {
        checkId: "textprotocol-envelope-shape",
        status: "pass",
        message: "Relation extraction output is wrapped in the public result envelope.",
        evidenceRefs: ["schemas/textprotocol-result-envelope-v1.schema.json"],
      },
      {
        checkId: "expected-output-match",
        status: expectedStatus,
        message: options.matchesExpected
          ? "Generated relation output matches the recorded expected artifact."
          : "Generated relation output diverges from the recorded expected artifact.",
        evidenceRefs: [options.expectedArtifactPath],
      },
    ],
    ...(options.notes && options.notes.length > 0 ? { notes: options.notes } : {}),
  };
}

export function createCoreferenceResultEnvelope(
  result: TextRulesCoreferenceResult,
  options: TextRulesResultEnvelopeOptions,
): TextProtocolResultEnvelopeV1<TextDocDocumentV1, typeof textDocDocumentPayloadKind> {
  return {
    schemaId: resultEnvelopeSchemaId,
    schemaVersion: resultEnvelopeSchemaVersion,
    producer: {
      package: packageName,
      version: options.producerVersion,
    },
    payloadKind: textDocDocumentPayloadKind,
    payload: result.document,
    provenance: {
      ...(result.document.source ? { source: result.document.source } : {}),
      references: [
        {
          kind: "textdoc-document-v1",
          id: result.document.documentId,
        },
        ...(options.referenceId
          ? [
              {
                kind: "fixture-slice",
                id: options.referenceId,
              } as const,
            ]
          : []),
      ],
    },
    ...(result.diagnostics.length > 0 ? { diagnostics: result.diagnostics } : {}),
  };
}

export function createCoreferenceConformanceReport(
  envelope: TextProtocolResultEnvelopeV1<TextDocDocumentV1, typeof textDocDocumentPayloadKind>,
  options: TextRulesConformanceReportOptions,
): TextRulesConformanceReportV1 {
  const expectedStatus = conformanceStatus(options.matchesExpected);

  return {
    schemaId: textRulesConformanceReportSchemaId,
    schemaVersion: textRulesConformanceReportSchemaVersion,
    reportId: `coreference:${envelope.payload.documentId}`,
    subject: {
      kind: "textprotocol-result-envelope",
      id: envelope.payload.documentId,
      schemaId: envelope.schemaId,
    },
    generatedAt: options.generatedAt ?? "2026-05-16T00:00:00.000Z",
    summary: {
      pass: options.matchesExpected ? 3 : 2,
      fail: options.matchesExpected ? 0 : 1,
      notRun: 0,
    },
    checks: [
      {
        checkId: "textdoc-document-shape",
        status: "pass",
        message: "Coreference output is stored as textdoc mention and chain annotations.",
        evidenceRefs: ["schemas/textdoc-document-v1.schema.json"],
      },
      {
        checkId: "textprotocol-envelope-shape",
        status: "pass",
        message: "Coreference output is wrapped in the public result envelope.",
        evidenceRefs: ["schemas/textprotocol-result-envelope-v1.schema.json"],
      },
      {
        checkId: "expected-output-match",
        status: expectedStatus,
        message: options.matchesExpected
          ? "Generated coreference output matches the recorded expected artifact."
          : "Generated coreference output diverges from the recorded expected artifact.",
        evidenceRefs: [options.expectedArtifactPath],
      },
    ],
    ...(options.notes && options.notes.length > 0 ? { notes: options.notes } : {}),
  };
}

export function createDependencyParserResultEnvelope(
  result: TextRulesDependencyParserResult,
  options: TextRulesResultEnvelopeOptions,
): TextProtocolResultEnvelopeV1<TextDocDocumentV1, typeof textDocDocumentPayloadKind> {
  return {
    schemaId: resultEnvelopeSchemaId,
    schemaVersion: resultEnvelopeSchemaVersion,
    producer: {
      package: packageName,
      version: options.producerVersion,
    },
    payloadKind: textDocDocumentPayloadKind,
    payload: result.document,
    provenance: {
      ...(result.document.source ? { source: result.document.source } : {}),
      references: [
        {
          kind: "textdoc-document-v1",
          id: result.document.documentId,
        },
        ...(options.referenceId
          ? [
              {
                kind: "fixture-slice",
                id: options.referenceId,
              } as const,
            ]
          : []),
      ],
    },
    ...(result.diagnostics.length > 0 ? { diagnostics: result.diagnostics } : {}),
  };
}

export function createDependencyParserConformanceReport(
  envelope: TextProtocolResultEnvelopeV1<TextDocDocumentV1, typeof textDocDocumentPayloadKind>,
  options: TextRulesConformanceReportOptions,
): TextRulesConformanceReportV1 {
  const expectedStatus = conformanceStatus(options.matchesExpected);

  return {
    schemaId: textRulesConformanceReportSchemaId,
    schemaVersion: textRulesConformanceReportSchemaVersion,
    reportId: `dependency-parser:${envelope.payload.documentId}`,
    subject: {
      kind: "textprotocol-result-envelope",
      id: envelope.payload.documentId,
      schemaId: envelope.schemaId,
    },
    generatedAt: options.generatedAt ?? "2026-05-16T00:00:00.000Z",
    summary: {
      pass: options.matchesExpected ? 3 : 2,
      fail: options.matchesExpected ? 0 : 1,
      notRun: 0,
    },
    checks: [
      {
        checkId: "textdoc-document-shape",
        status: "pass",
        message: "Dependency parser output is stored as textdoc dependency layers.",
        evidenceRefs: ["schemas/textdoc-document-v1.schema.json"],
      },
      {
        checkId: "textprotocol-envelope-shape",
        status: "pass",
        message: "Dependency parser output is wrapped in the public result envelope.",
        evidenceRefs: ["schemas/textprotocol-result-envelope-v1.schema.json"],
      },
      {
        checkId: "expected-output-match",
        status: expectedStatus,
        message: options.matchesExpected
          ? "Generated dependency arcs match the recorded expected artifact."
          : "Generated dependency arcs diverge from the recorded expected artifact.",
        evidenceRefs: [options.expectedArtifactPath],
      },
    ],
    ...(options.notes && options.notes.length > 0 ? { notes: options.notes } : {}),
  };
}
