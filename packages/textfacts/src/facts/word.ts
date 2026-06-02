import { compareByCodePoint } from "../internal/compare.ts";
import { createProvenance } from "../internal/provenance.ts";
import { sliceBySpan } from "../internal/span.ts";
import type { Provenance, Span } from "../internal/types.ts";
import { IMPLEMENTATION_ID } from "../internal/version.ts";
import { segmentGraphemes } from "../segment/grapheme.ts";
import { segmentSentencesDefault } from "../segment/sentence.ts";
import { segmentWordsDefault } from "../segment/word.ts";
import { generalCategoryAt } from "../unicode/general-category.ts";
import { scriptNameAt } from "../unicode/script.ts";
import { WordBreakPropertyId, getWordBreakPropertyId } from "../unicode/word.ts";

export type TokenFilter = "all" | "word-like";
export type NgramUnit = "scalar" | "grapheme" | "word";

export interface SurfaceProfileOptions {
  wordFilter?: TokenFilter;
  ngramSize?: number;
  maxRepeatedSpans?: number;
}

export interface WordFrequencyOptions {
  filter?: TokenFilter;
}

export interface NgramOptions {
  n: number;
  unit?: NgramUnit;
  filter?: TokenFilter;
}

export interface FrequencyItem {
  value: string;
  count: number;
}

export interface FrequencyTable {
  unit: "scalar" | "word";
  items: FrequencyItem[];
  total: number;
  provenance: Provenance;
}

export interface NgramItem {
  values: string[];
  count: number;
}

export interface NgramTable {
  unit: NgramUnit;
  n: number;
  items: NgramItem[];
  total: number;
  provenance: Provenance;
}

export interface RepeatedSpan {
  value: string;
  count: number;
  spans: Span[];
}

export interface SurfaceProfile {
  counts: {
    codeUnits: number;
    scalars: number;
    graphemes: number;
    words: number;
    sentences: number;
    lines: number;
    punctuation: number;
    whitespace: number;
    symbols: number;
    digits: number;
    marks: number;
  };
  scripts: FrequencyItem[];
  characterFrequencies: FrequencyTable;
  wordFrequencies: FrequencyTable;
  repeatedSpans: RepeatedSpan[];
  provenance: Provenance;
}

const DEFAULT_REVISION = "Unicode 17.0.0";
const FACTS_SPEC = "textfacts:single-text-facts";

const WORDLIKE_PROPS = new Set<number>([
  WordBreakPropertyId.ALetter,
  WordBreakPropertyId.Hebrew_Letter,
  WordBreakPropertyId.Numeric,
  WordBreakPropertyId.Katakana,
  WordBreakPropertyId.ExtendNumLet,
]);

function provenance(name: string, options: unknown, token?: string): Provenance {
  return createProvenance(
    {
      name,
      spec: FACTS_SPEC,
      revisionOrDate: DEFAULT_REVISION,
      implementationId: IMPLEMENTATION_ID,
    },
    options,
    token ? { text: "utf16-code-unit", token } : { text: "utf16-code-unit" },
  );
}

function normalizePositiveInteger(value: number, name: string): number {
  if (!Number.isFinite(value) || value < 1) {
    throw new RangeError(`${name} must be a positive finite integer`);
  }
  return Math.floor(value);
}

function sortFrequencyItems(items: FrequencyItem[]): FrequencyItem[] {
  return items.sort((left, right) => {
    if (left.count !== right.count) return right.count - left.count;
    return compareByCodePoint(left.value, right.value);
  });
}

function sortNgramItems(items: NgramItem[]): NgramItem[] {
  return items.sort((left, right) => {
    if (left.count !== right.count) return right.count - left.count;
    const length = Math.min(left.values.length, right.values.length);
    for (let index = 0; index < length; index += 1) {
      const compare = compareByCodePoint(left.values[index] ?? "", right.values[index] ?? "");
      if (compare !== 0) return compare;
    }
    return left.values.length - right.values.length;
  });
}

function isWordLikeToken(token: string): boolean {
  for (let codeUnitIndex = 0; codeUnitIndex < token.length; ) {
    const codePoint = token.codePointAt(codeUnitIndex) ?? 0;
    if (WORDLIKE_PROPS.has(getWordBreakPropertyId(codePoint))) return true;
    codeUnitIndex += codePoint > 0xffff ? 2 : 1;
  }
  return false;
}

function wordTokens(text: string, filter: TokenFilter): { value: string; span: Span }[] {
  const tokens: { value: string; span: Span }[] = [];
  for (const span of segmentWordsDefault(text)) {
    const value = sliceBySpan(text, span);
    if (filter === "word-like" && !isWordLikeToken(value)) continue;
    tokens.push({ value, span });
  }
  return tokens;
}

function scalarTokens(text: string): { value: string; span: Span }[] {
  const tokens: { value: string; span: Span }[] = [];
  for (let codeUnitIndex = 0; codeUnitIndex < text.length; ) {
    const codePoint = text.codePointAt(codeUnitIndex) ?? 0;
    const endCU = codeUnitIndex + (codePoint > 0xffff ? 2 : 1);
    tokens.push({
      value: text.slice(codeUnitIndex, endCU),
      span: { startCU: codeUnitIndex, endCU },
    });
    codeUnitIndex = endCU;
  }
  return tokens;
}

function graphemeTokens(text: string): { value: string; span: Span }[] {
  return [...segmentGraphemes(text)].map((span) => ({ value: sliceBySpan(text, span), span }));
}

function tokensForUnit(
  text: string,
  unit: NgramUnit,
  filter: TokenFilter,
): { value: string; span: Span }[] {
  if (unit === "word") return wordTokens(text, filter);
  if (unit === "grapheme") return graphemeTokens(text);
  return scalarTokens(text);
}

function frequencyTable(
  unit: "scalar" | "word",
  items: { value: string }[],
  options: unknown,
): FrequencyTable {
  const counts = new Map<string, number>();
  for (const item of items) {
    counts.set(item.value, (counts.get(item.value) ?? 0) + 1);
  }
  return {
    unit,
    total: items.length,
    items: sortFrequencyItems(
      Array.from(counts.entries()).map(([value, count]) => ({ value, count })),
    ),
    provenance: provenance(
      unit === "word" ? "TextFacts.WordFrequencies" : "TextFacts.CharacterFrequencies",
      options,
      unit,
    ),
  };
}

function repeatedSpans(
  tokens: { value: string; span: Span }[],
  maxRepeatedSpans: number,
): RepeatedSpan[] {
  const groups = new Map<string, Span[]>();
  for (const token of tokens) {
    const spans = groups.get(token.value);
    if (spans) {
      spans.push(token.span);
    } else {
      groups.set(token.value, [token.span]);
    }
  }
  const repeated = Array.from(groups.entries())
    .filter(([, spans]) => spans.length > 1)
    .map(([value, spans]) => ({ value, count: spans.length, spans }))
    .sort((left, right) => {
      if (left.count !== right.count) return right.count - left.count;
      return compareByCodePoint(left.value, right.value);
    });
  return repeated.slice(0, maxRepeatedSpans);
}

export function wordFrequencies(text: string, options: WordFrequencyOptions = {}): FrequencyTable {
  const filter = options.filter ?? "word-like";
  return frequencyTable("word", wordTokens(text, filter), { filter });
}

export function charNgrams(text: string, options: NgramOptions): NgramTable {
  const n = normalizePositiveInteger(options.n, "n");
  const unit = options.unit ?? "scalar";
  const filter = options.filter ?? "word-like";
  const tokens = tokensForUnit(text, unit, filter).map((token) => token.value);
  const counts = new Map<string, { values: string[]; count: number }>();

  for (let index = 0; index + n <= tokens.length; index += 1) {
    const values = tokens.slice(index, index + n);
    const key = JSON.stringify(values);
    const entry = counts.get(key);
    if (entry) {
      entry.count += 1;
    } else {
      counts.set(key, { values, count: 1 });
    }
  }

  return {
    unit,
    n,
    total: Math.max(0, tokens.length - n + 1),
    items: sortNgramItems(Array.from(counts.values())),
    provenance: provenance("TextFacts.CharacterNgrams", { n, unit, filter }, unit),
  };
}

export function wordNgrams(text: string, options: NgramOptions): NgramTable {
  const n = normalizePositiveInteger(options.n, "n");
  const filter = options.filter ?? "word-like";
  const tokens = wordTokens(text, filter).map((token) => token.value);
  const counts = new Map<string, { values: string[]; count: number }>();

  for (let index = 0; index + n <= tokens.length; index += 1) {
    const values = tokens.slice(index, index + n);
    const key = JSON.stringify(values);
    const entry = counts.get(key);
    if (entry) {
      entry.count += 1;
    } else {
      counts.set(key, { values, count: 1 });
    }
  }

  return {
    unit: "word",
    n,
    total: Math.max(0, tokens.length - n + 1),
    items: sortNgramItems(Array.from(counts.values())),
    provenance: provenance("TextFacts.WordNgrams", { n, filter }, "word"),
  };
}

export function surfaceProfile(text: string, options: SurfaceProfileOptions = {}): SurfaceProfile {
  const wordFilter = options.wordFilter ?? "word-like";
  const maxRepeatedSpans = options.maxRepeatedSpans ?? 20;
  const scalars = scalarTokens(text);
  const words = wordTokens(text, wordFilter);
  const scripts = new Map<string, number>();
  let punctuation = 0;
  let whitespace = 0;
  let symbols = 0;
  let digits = 0;
  let marks = 0;

  for (const scalar of scalars) {
    const codePoint = scalar.value.codePointAt(0) ?? 0;
    const category = generalCategoryAt(codePoint);
    const script = scriptNameAt(codePoint);
    scripts.set(script, (scripts.get(script) ?? 0) + 1);
    if (category.startsWith("P")) punctuation += 1;
    if (category.startsWith("Z") || /\s/u.test(scalar.value)) whitespace += 1;
    if (category.startsWith("S")) symbols += 1;
    if (category === "Nd") digits += 1;
    if (category.startsWith("M")) marks += 1;
  }

  return {
    counts: {
      codeUnits: text.length,
      scalars: scalars.length,
      graphemes: [...segmentGraphemes(text)].length,
      words: words.length,
      sentences: [...segmentSentencesDefault(text)].length,
      lines: text.length === 0 ? 0 : text.split(/\r\n|\r|\n/u).length,
      punctuation,
      whitespace,
      symbols,
      digits,
      marks,
    },
    scripts: sortFrequencyItems(
      Array.from(scripts.entries()).map(([value, count]) => ({ value, count })),
    ),
    characterFrequencies: frequencyTable("scalar", scalars, { unit: "scalar" }),
    wordFrequencies: wordFrequencies(text, { filter: wordFilter }),
    repeatedSpans: repeatedSpans(words, maxRepeatedSpans),
    provenance: provenance("TextFacts.SurfaceProfile", { wordFilter, maxRepeatedSpans }, "profile"),
  };
}
