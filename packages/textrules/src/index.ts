import {
  documentSchemaVersion,
  textDocDocumentPayloadKind,
  type TextDocAnnotation,
  type TextDocDocumentSentenceAnnotation,
  type TextDocDocumentTokenAnnotation,
  type TextDocDocumentV1,
  type TextDocFeature,
  type TextDocLayer,
  type TextDocLemmaAnnotation,
  type TextDocMorphologyAlternative,
  type TextDocMorphologyAnnotation,
  type TextDocPosAnnotation,
  type TextDocReferenceRef,
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

export type PackageName = typeof packageName;
export type TextRulesPosMorphLemmaRevision = typeof posMorphLemmaRevision;
export type TextRulesPosMorphLemmaTagSet = typeof posMorphLemmaTagSet;

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

interface TextRulesResolvedAnalysis extends TextRulesLexiconAnalysis {
  readonly resourceRefs: readonly TextDocReferenceRef[];
}

type TextRulesPosLayer = TextDocLayer<TextDocPosAnnotation>;
type TextRulesLemmaLayer = TextDocLayer<TextDocLemmaAnnotation>;
type TextRulesMorphologyLayer = TextDocLayer<TextDocMorphologyAnnotation>;

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

export function isTextRulesLexiconResourceData(value: unknown): value is TextRulesLexiconResourceData {
  return (
    isRecord(value) &&
    Array.isArray(value.entries) &&
    value.entries.length >= 1 &&
    value.entries.every((entry) => isTextRulesLexiconEntry(entry))
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
