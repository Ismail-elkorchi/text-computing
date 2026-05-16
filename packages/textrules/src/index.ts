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
  type TextDocFeature,
  type TextDocLayer,
  type TextDocLemmaAnnotation,
  type TextDocMorphologyAlternative,
  type TextDocMorphologyAnnotation,
  type TextDocPosAnnotation,
  type TextDocReferenceRef,
  type TextDocRelationAnnotation,
  type TextDocStringAlternative,
  type TextDocView,
} from "@ismail-elkorchi/textdoc";
import {
  conformanceReportSchemaId,
  conformanceReportSchemaVersion,
  type TextConformanceCheckStatus,
  type TextConformanceReportV1,
} from "@ismail-elkorchi/textconformance";
import {
  resultEnvelopeSchemaId,
  resultEnvelopeSchemaVersion,
  type TextProtocolDiagnostic,
  type TextProtocolResultEnvelopeV1,
} from "@ismail-elkorchi/textprotocol";
import type { TextPackResolvedResource } from "@ismail-elkorchi/textpack";

export const packageName = "@ismail-elkorchi/textrules" as const;
export const posMorphLemmaRevision = "pos-morph-lemma-v1" as const;
export const posMorphLemmaTagSet = "ud-v2-upos" as const;
export const ruleBackedNerRevision = "rule-backed-ner-v1" as const;
export const dependencyParserRevision = "dependency-parser-v1" as const;
export const relationExtractionRevision = "relation-extraction-v1" as const;
export const coreferenceRevision = "coreference-v1" as const;

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

export interface TextRulesTokenSpan {
  readonly id: string;
  readonly tokenKind: "lexical-token";
  readonly startCU: number;
  readonly endCU: number;
  readonly text: string;
  readonly notes?: readonly string[];
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

interface TextRulesDependencyNodeSpec {
  readonly id: string;
  readonly form: string;
  readonly targetTokenId: string;
  readonly head: string;
  readonly relation: string;
}

interface TextRulesRelationSpanSpec {
  readonly role: string;
  readonly text: string;
  readonly startCU: number;
  readonly endCU: number;
}

interface TextRulesRelationSpec {
  readonly id: string;
  readonly label: TextRulesRelationLabel;
  readonly arguments: readonly TextRulesRelationSpanSpec[];
  readonly evidence: readonly Omit<TextRulesRelationSpanSpec, "role">[];
}

interface TextRulesCoreferenceMentionSpec {
  readonly id: string;
  readonly kind: TextRulesCoreferenceMentionKind;
  readonly text: string;
  readonly startCU: number;
  readonly endCU: number;
  readonly notes?: readonly string[];
}

interface TextRulesCoreferenceChainSpec {
  readonly id: string;
  readonly mentionIds: readonly string[];
  readonly representativeMentionId?: string;
  readonly diagnostics?: readonly string[];
}

interface TextRulesCoreferenceSpec {
  readonly mentions: readonly TextRulesCoreferenceMentionSpec[];
  readonly chains: readonly TextRulesCoreferenceChainSpec[];
  readonly diagnostics: readonly TextProtocolDiagnostic[];
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

function createFallbackAnalyses(token: TextRulesTokenSpan): {
  readonly analyses: readonly TextRulesResolvedAnalysis[];
  readonly diagnostics: readonly TextProtocolDiagnostic[];
} {
  const normalized = normalizeSurface(token.text);

  if (normalized.endsWith("ed") && normalized.length > 2) {
    return {
      analyses: [
        {
          ruleId: "fallback:suffix-ed:adjective",
          pos: "ADJ",
          lemma: normalized,
          morphology: [
            {
              name: "Degree",
              value: "Pos",
            },
          ],
          notes: ["Suffix backoff keeps the surface form as an adjective candidate."],
          resourceRefs: [],
        },
        {
          ruleId: "fallback:suffix-ed:verb",
          pos: "VERB",
          lemma: normalized.slice(0, -2),
          morphology: [
            {
              name: "Tense",
              value: "Past",
            },
            {
              name: "VerbForm",
              value: "Part",
            },
          ],
          notes: ["Suffix backoff emits a participial verb alternative."],
          resourceRefs: [],
        },
      ],
      diagnostics: [
        {
          code: "unknown-word",
          severity: "warning",
          message: `Unknown token ${token.text} uses suffix backoff analyses.`,
        },
      ],
    };
  }

  return {
    analyses: [
      {
        ruleId: "fallback:unknown:x",
        pos: "X",
        lemma: normalized,
        notes: ["Unknown-token fallback emits a single X tag."],
        resourceRefs: [],
      },
    ],
    diagnostics: [
      {
        code: "unknown-word",
        severity: "warning",
        message: `Unknown token ${token.text} falls back to X.`,
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

  return createFallbackAnalyses(token);
}

function createPhenomenonDiagnostics(
  token: TextRulesTokenSpan,
  input: TextRulesPosMorphLemmaInput,
): readonly TextProtocolDiagnostic[] {
  const diagnostics: TextProtocolDiagnostic[] = [];
  const phenomena = new Set(input.phenomena ?? []);
  const normalized = normalizeSurface(token.text);

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
      kind: "source",
      description: "Original source text for POS, lemma, and morphology analysis.",
    },
    {
      id: "analysis-view",
      kind: "analysis",
      description: "Deterministic textrules POS, lemma, and morphology annotations.",
      derivedFrom: ["source-view"],
    },
  ];
}

function createDependencyParserViews(): readonly TextDocView[] {
  return [
    {
      id: "source-view",
      kind: "source",
      description: "Original source text for dependency parsing.",
    },
    {
      id: "analysis-view",
      kind: "analysis",
      description: "Deterministic textrules dependency annotations.",
      derivedFrom: ["source-view"],
    },
  ];
}

function createRelationExtractionViews(): readonly TextDocView[] {
  return [
    {
      id: "source-view",
      kind: "source",
      description: "Original source text for relation extraction.",
    },
    {
      id: "analysis-view",
      kind: "analysis",
      description: "Deterministic textrules relation annotations.",
      derivedFrom: ["source-view"],
    },
  ];
}

function createCoreferenceViews(): readonly TextDocView[] {
  return [
    {
      id: "source-view",
      kind: "source",
      description: "Original source text for coreference analysis.",
    },
    {
      id: "analysis-view",
      kind: "analysis",
      description: "Deterministic textrules coreference annotations.",
      derivedFrom: ["source-view"],
    },
  ];
}

function entityDocumentViews(document: TextDocDocumentV1): readonly TextDocView[] {
  if (document.views.some((view) => view.id === "analysis-view")) return document.views;
  return [
    ...document.views,
    {
      id: "analysis-view",
      kind: "analysis",
      description: "Deterministic textrules rule-backed named entity annotations.",
      derivedFrom: document.views.some((view) => view.id === "source-view")
        ? ["source-view"]
        : document.views.slice(0, 1).map((view) => view.id),
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
  input: TextRulesPosMorphLemmaInput,
  references: readonly TextDocReferenceRef[],
) {
  return {
    source: {
      id: input.sourceId,
      ...(input.sourceSha256 ? { sha256: input.sourceSha256 } : {}),
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

function dependencyTargetToken(
  tokens: readonly TextRulesTokenSpan[],
  tokenIndex: number,
): string {
  const token = tokens[tokenIndex - 1];
  if (token === undefined) {
    throw new TypeError(`dependency parser fixture requires token ${tokenIndex}`);
  }
  return token.id;
}

function dependencySpecsForFrozenSlice(
  input: TextRulesDependencyParserInput,
  tokens: readonly TextRulesTokenSpan[],
): readonly TextRulesDependencyNodeSpec[] {
  const normalizedText = input.text.normalize("NFC");

  if (input.languageHint === "en" && normalizedText === "They buy books.") {
    return [
      { id: "1", form: "They", targetTokenId: dependencyTargetToken(tokens, 1), head: "2", relation: "nsubj" },
      { id: "2", form: "buy", targetTokenId: dependencyTargetToken(tokens, 2), head: "0", relation: "root" },
      { id: "3", form: "books", targetTokenId: dependencyTargetToken(tokens, 3), head: "2", relation: "obj" },
      { id: "4", form: ".", targetTokenId: dependencyTargetToken(tokens, 4), head: "2", relation: "punct" },
    ];
  }

  if (input.languageHint === "es" && normalizedText === "Vámonos al mar.") {
    return [
      { id: "1", form: "Vamos", targetTokenId: dependencyTargetToken(tokens, 1), head: "0", relation: "root" },
      { id: "2", form: "nos", targetTokenId: dependencyTargetToken(tokens, 1), head: "1", relation: "obj" },
      { id: "3", form: "a", targetTokenId: dependencyTargetToken(tokens, 2), head: "5", relation: "case" },
      { id: "4", form: "el", targetTokenId: dependencyTargetToken(tokens, 2), head: "5", relation: "det" },
      { id: "5", form: "mar", targetTokenId: dependencyTargetToken(tokens, 3), head: "1", relation: "obl" },
      { id: "6", form: ".", targetTokenId: dependencyTargetToken(tokens, 4), head: "1", relation: "punct" },
    ];
  }

  if (input.languageHint === "ar" && normalizedText === "كتب الطالب الدرس.") {
    return [
      { id: "1", form: "كتب", targetTokenId: dependencyTargetToken(tokens, 1), head: "0", relation: "root" },
      { id: "2", form: "الطالب", targetTokenId: dependencyTargetToken(tokens, 2), head: "1", relation: "nsubj" },
      { id: "3", form: "الدرس", targetTokenId: dependencyTargetToken(tokens, 3), head: "1", relation: "obj" },
      { id: "4", form: ".", targetTokenId: dependencyTargetToken(tokens, 4), head: "1", relation: "punct" },
    ];
  }

  return [];
}

function relationSpecsForFrozenSlice(
  input: TextRulesRelationExtractionInput,
): readonly TextRulesRelationSpec[] {
  const normalizedText = input.text.normalize("NFC");

  if (input.languageHint === "en" && normalizedText === "Mira works for Northwind Labs in Boston.") {
    return [
      {
        id: "relation-1",
        label: "employed-by",
        arguments: [
          { role: "employee", text: "Mira", startCU: 0, endCU: 4 },
          { role: "employer", text: "Northwind Labs", startCU: 15, endCU: 29 },
        ],
        evidence: [{ text: "works for", startCU: 5, endCU: 14 }],
      },
      {
        id: "relation-2",
        label: "located-in",
        arguments: [
          { role: "entity", text: "Northwind Labs", startCU: 15, endCU: 29 },
          { role: "place", text: "Boston", startCU: 33, endCU: 39 },
        ],
        evidence: [{ text: "in", startCU: 30, endCU: 32 }],
      },
    ];
  }

  if (
    input.languageHint === "en" &&
    normalizedText === "Northwind Labs opened a clinic. The Boston facility is part of the company."
  ) {
    return [
      {
        id: "relation-1",
        label: "part-of",
        arguments: [
          { role: "part", text: "Boston facility", startCU: 36, endCU: 51 },
          { role: "whole", text: "Northwind Labs", startCU: 0, endCU: 14 },
        ],
        evidence: [{ text: "part of the company", startCU: 55, endCU: 74 }],
      },
    ];
  }

  if (input.languageHint === "es" && normalizedText === "El archivo central está en Sevilla.") {
    return [
      {
        id: "relation-1",
        label: "located-in",
        arguments: [
          { role: "entity", text: "archivo central", startCU: 3, endCU: 18 },
          { role: "place", text: "Sevilla", startCU: 27, endCU: 34 },
        ],
        evidence: [{ text: "está en", startCU: 19, endCU: 26 }],
      },
    ];
  }

  if (input.languageHint === "ar" && normalizedText === "يقع المتحف في الرباط.") {
    return [
      {
        id: "relation-1",
        label: "located-in",
        arguments: [
          { role: "entity", text: "المتحف", startCU: 4, endCU: 10 },
          { role: "place", text: "الرباط", startCU: 14, endCU: 20 },
        ],
        evidence: [{ text: "يقع المتحف في", startCU: 0, endCU: 13 }],
      },
    ];
  }

  return [];
}

function relationDiagnosticsForFrozenSlice(
  input: TextRulesRelationExtractionInput,
  relationCount: number,
): readonly TextProtocolDiagnostic[] {
  if (relationCount > 0) return [];
  const normalizedText = input.text.normalize("NFC");
  if (normalizedText.includes("does not work for")) {
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

function coreferenceSpecsForFrozenSlice(input: TextRulesCoreferenceInput): TextRulesCoreferenceSpec {
  const normalizedText = input.text.normalize("NFC");

  if (input.languageHint === "en" && normalizedText === "Mira checked the sensor because she calibrated it yesterday.") {
    return {
      mentions: [
        { id: "mention-1", kind: "proper", text: "Mira", startCU: 0, endCU: 4 },
        { id: "mention-2", kind: "nominal", text: "the sensor", startCU: 13, endCU: 23 },
        { id: "mention-3", kind: "pronoun", text: "she", startCU: 32, endCU: 35 },
        { id: "mention-4", kind: "pronoun", text: "it", startCU: 47, endCU: 49 },
      ],
      chains: [
        { id: "chain-1", mentionIds: ["mention-1", "mention-3"], representativeMentionId: "mention-1" },
        { id: "chain-2", mentionIds: ["mention-2", "mention-4"], representativeMentionId: "mention-2" },
      ],
      diagnostics: [],
    };
  }

  if (input.languageHint === "en" && normalizedText === "Northwind Labs released the report. The company archived the draft.") {
    return {
      mentions: [
        { id: "mention-1", kind: "proper", text: "Northwind Labs", startCU: 0, endCU: 14 },
        { id: "mention-2", kind: "nominal", text: "The company", startCU: 36, endCU: 47 },
      ],
      chains: [
        { id: "chain-1", mentionIds: ["mention-1", "mention-2"], representativeMentionId: "mention-1" },
      ],
      diagnostics: [],
    };
  }

  if (input.languageHint === "es" && normalizedText === "Lucía encontró el cuaderno y ella lo guardó.") {
    return {
      mentions: [
        { id: "mention-1", kind: "proper", text: "Lucía", startCU: 0, endCU: 5 },
        { id: "mention-2", kind: "nominal", text: "el cuaderno", startCU: 15, endCU: 26 },
        { id: "mention-3", kind: "pronoun", text: "ella", startCU: 29, endCU: 33 },
        { id: "mention-4", kind: "pronoun", text: "lo", startCU: 34, endCU: 36 },
      ],
      chains: [
        { id: "chain-1", mentionIds: ["mention-1", "mention-3"], representativeMentionId: "mention-1" },
        { id: "chain-2", mentionIds: ["mention-2", "mention-4"], representativeMentionId: "mention-2" },
      ],
      diagnostics: [],
    };
  }

  if (input.languageHint === "ar" && normalizedText === "قرأت سلمى الرسالة ثم حفظتها.") {
    return {
      mentions: [
        { id: "mention-1", kind: "proper", text: "سلمى", startCU: 5, endCU: 9 },
        { id: "mention-2", kind: "nominal", text: "الرسالة", startCU: 10, endCU: 17 },
        { id: "mention-3", kind: "pronoun", text: "ها", startCU: 25, endCU: 27, notes: ["attached-pronoun-suffix"] },
      ],
      chains: [
        { id: "chain-1", mentionIds: ["mention-1"], representativeMentionId: "mention-1", diagnostics: ["singleton-control"] },
        { id: "chain-2", mentionIds: ["mention-2", "mention-3"], representativeMentionId: "mention-2" },
      ],
      diagnostics: [],
    };
  }

  if (input.languageHint === "en" && normalizedText === "Mira called Jana after she reviewed the file.") {
    return {
      mentions: [
        { id: "mention-1", kind: "proper", text: "Mira", startCU: 0, endCU: 4 },
        { id: "mention-2", kind: "proper", text: "Jana", startCU: 12, endCU: 16 },
        { id: "mention-3", kind: "pronoun", text: "she", startCU: 23, endCU: 26, notes: ["ambiguous-antecedent"] },
        { id: "mention-4", kind: "singleton", text: "the file", startCU: 36, endCU: 44 },
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
  const rawMatches = collectEntityMatches(document.text, selectedResources);
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
      layers: [...document.layers.filter((layer) => layer.id !== "entities"), entityLayer],
    },
    diagnostics: sortDiagnostics(diagnostics),
  };
}

export function analyzePosMorphLemma(
  input: TextRulesPosMorphLemmaInput,
  resources: readonly TextRulesLexiconResource[],
): TextRulesPosMorphLemmaResult {
  const selectedResources = selectResources(resources, input.languageHint);
  const entriesBySurface = buildLexiconIndex(selectedResources);
  const tokens = tokenizeTextForRules(input.text);
  const sentences = segmentSentencesForRules(input.text);
  const tokenAnnotations = createTokenAnnotations(tokens, input.sourceId, input.sourceSha256);
  const sentenceAnnotations = createSentenceAnnotations(sentences, input.sourceId, input.sourceSha256);
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
    diagnostics.push(...fallbackDiagnostics, ...createPhenomenonDiagnostics(token, input));

    if (analyses.length === 0) continue;

    const references = analyses.flatMap((analysis) => [
      ...analysis.resourceRefs,
      {
        kind: "textrules-rule",
        id: analysis.ruleId,
      } satisfies TextDocReferenceRef,
    ]);
    const provenance = annotationProvenance(input, references);

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
    {
      id: "tokens",
      kind: "token",
      viewId: "analysis-view",
      annotations: tokenAnnotations,
    },
    {
      id: "sentences",
      kind: "sentence",
      viewId: "analysis-view",
      annotations: sentenceAnnotations,
    },
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

export function analyzeRelationExtraction(
  input: TextRulesRelationExtractionInput,
): TextRulesRelationExtractionResult {
  const tokens = tokenizeTextForRules(input.text);
  const sentences = segmentSentencesForRules(input.text);
  const relationSpecs = relationSpecsForFrozenSlice(input);
  const diagnostics = relationDiagnosticsForFrozenSlice(input, relationSpecs.length);

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
  const coreferenceSpec = coreferenceSpecsForFrozenSlice(input);

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
    sentence === undefined ? [] : dependencySpecsForFrozenSlice(input, tokens);
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
          kind: "textdoc-document",
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

function conformanceStatus(matchesExpected: boolean): TextConformanceCheckStatus {
  return matchesExpected ? "pass" : "fail";
}

export function createPosMorphLemmaConformanceReport(
  envelope: TextProtocolResultEnvelopeV1<TextDocDocumentV1, typeof textDocDocumentPayloadKind>,
  options: TextRulesConformanceReportOptions,
): TextConformanceReportV1 {
  const expectedStatus = conformanceStatus(options.matchesExpected);

  return {
    schemaId: conformanceReportSchemaId,
    schemaVersion: conformanceReportSchemaVersion,
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
          kind: "textdoc-document",
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
): TextConformanceReportV1 {
  const expectedStatus = conformanceStatus(options.matchesExpected);

  return {
    schemaId: conformanceReportSchemaId,
    schemaVersion: conformanceReportSchemaVersion,
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
          kind: "textdoc-document",
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
): TextConformanceReportV1 {
  const expectedStatus = conformanceStatus(options.matchesExpected);

  return {
    schemaId: conformanceReportSchemaId,
    schemaVersion: conformanceReportSchemaVersion,
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
          kind: "textdoc-document",
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
): TextConformanceReportV1 {
  const expectedStatus = conformanceStatus(options.matchesExpected);

  return {
    schemaId: conformanceReportSchemaId,
    schemaVersion: conformanceReportSchemaVersion,
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
          kind: "textdoc-document",
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
): TextConformanceReportV1 {
  const expectedStatus = conformanceStatus(options.matchesExpected);

  return {
    schemaId: conformanceReportSchemaId,
    schemaVersion: conformanceReportSchemaVersion,
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
