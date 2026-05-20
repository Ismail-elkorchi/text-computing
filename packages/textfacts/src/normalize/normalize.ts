import { normalizeInput } from "../core/input.ts";
import { createProvenance } from "../core/provenance.ts";
import type { Provenance, Span, TextInput } from "../core/types.ts";
import { IMPLEMENTATION_ID } from "../core/version.ts";
import { lookupProperty } from "../unicode/lookup.ts";
import { CCC_RANGES } from "./generated/ccc.ts";
import { COMPOSE_DATA, COMPOSE_INDEX, COMPOSE_STARTERS } from "./generated/composition.ts";
import { DECOMP_CODEPOINTS, DECOMP_COMPAT, DECOMP_DATA, DECOMP_INDEX } from "./generated/decomp.ts";

/**
 * NormalizationForm defines an exported type contract.
 */
export type NormalizationForm = "NFC" | "NFD" | "NFKC" | "NFKD";

/**
 * NormalizationExplanation defines an exported structural contract.
 */
export interface NormalizationExplanation {
  form: NormalizationForm;
  input: string;
  output: string;
  provenance: Provenance;
  isReversible: boolean;
  transformMap: NormalizationTransform[];
  stages: {
    decomposed: number[];
    reordered: number[];
    composed: number[];
  };
}

/**
 * NormalizationTransform defines a source/output span mapping for diagnostics.
 */
export interface NormalizationTransform {
  sourceSpanCU: Span;
  outputSpanCU: Span;
  source: string;
  output: string;
  kind: "unchanged" | "normalized" | "inserted" | "deleted";
  reversible: boolean;
}

const TR15_SPEC = "https://unicode.org/reports/tr15/";
const DEFAULT_ALGORITHM_REVISION = "Unicode 17.0.0";

const SBase = 0xac00;
const LBase = 0x1100;
const VBase = 0x1161;
const TBase = 0x11a7;
const LCount = 19;
const VCount = 21;
const TCount = 28;
const NCount = VCount * TCount;
const SCount = LCount * NCount;

function getCombiningClass(codePoint: number): number {
  return lookupProperty(CCC_RANGES, codePoint);
}

function isHangulSyllable(codePoint: number): boolean {
  return codePoint >= SBase && codePoint < SBase + SCount;
}

function decomposeHangul(codePoint: number, out: number[]): void {
  const sIndex = codePoint - SBase;
  const lIndex = Math.floor(sIndex / NCount);
  const vIndex = Math.floor((sIndex % NCount) / TCount);
  const tIndex = sIndex % TCount;
  out.push(LBase + lIndex, VBase + vIndex);
  if (tIndex > 0) out.push(TBase + tIndex);
}

function composeHangul(starter: number, combining: number): number | null {
  const lIndex = starter - LBase;
  if (lIndex >= 0 && lIndex < LCount) {
    const vIndex = combining - VBase;
    if (vIndex >= 0 && vIndex < VCount) {
      return SBase + (lIndex * VCount + vIndex) * TCount;
    }
  }
  const sIndex = starter - SBase;
  if (sIndex >= 0 && sIndex < SCount && sIndex % TCount === 0) {
    const tIndex = combining - TBase;
    if (tIndex > 0 && tIndex < TCount) {
      return starter + tIndex;
    }
  }
  return null;
}

function findDecompositionIndex(codePoint: number): number {
  let lo = 0;
  let hi = DECOMP_CODEPOINTS.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const value = DECOMP_CODEPOINTS[mid] ?? 0;
    if (codePoint < value) {
      hi = mid - 1;
    } else if (codePoint > value) {
      lo = mid + 1;
    } else {
      return mid;
    }
  }
  return -1;
}

function decomposeCodePoint(codePoint: number, compatibility: boolean, out: number[]): void {
  if (isHangulSyllable(codePoint)) {
    decomposeHangul(codePoint, out);
    return;
  }
  const index = findDecompositionIndex(codePoint);
  if (index < 0) {
    out.push(codePoint);
    return;
  }
  const isCompat = (DECOMP_COMPAT[index] ?? 0) === 1;
  if (isCompat && !compatibility) {
    out.push(codePoint);
    return;
  }
  const start = DECOMP_INDEX[index] ?? 0;
  const end = DECOMP_INDEX[index + 1] ?? start;
  for (let i = start; i < end; i += 1) {
    const next = DECOMP_DATA[i] ?? 0;
    decomposeCodePoint(next, compatibility, out);
  }
}

function decomposeText(text: string, compatibility: boolean): number[] {
  const out: number[] = [];
  for (let i = 0; i < text.length; ) {
    const codePoint = text.codePointAt(i) ?? 0;
    decomposeCodePoint(codePoint, compatibility, out);
    i += codePoint > 0xffff ? 2 : 1;
  }
  return out;
}

function reorderCanonical(codePoints: number[]): number[] {
  const out: number[] = [];
  let lastStarterIndex = -1;
  for (const codePoint of codePoints) {
    const ccc = getCombiningClass(codePoint);
    if (ccc === 0) {
      out.push(codePoint);
      lastStarterIndex = out.length - 1;
      continue;
    }
    let insertIndex = out.length;
    out.push(codePoint);
    while (
      insertIndex > lastStarterIndex + 1 &&
      getCombiningClass(out[insertIndex - 1] ?? 0) > ccc
    ) {
      out[insertIndex] = out[insertIndex - 1] ?? 0;
      insertIndex -= 1;
    }
    out[insertIndex] = codePoint;
  }
  return out;
}

function findComposeStarterIndex(codePoint: number): number {
  let lo = 0;
  let hi = COMPOSE_STARTERS.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const value = COMPOSE_STARTERS[mid] ?? 0;
    if (codePoint < value) {
      hi = mid - 1;
    } else if (codePoint > value) {
      lo = mid + 1;
    } else {
      return mid;
    }
  }
  return -1;
}

function composePair(starter: number, combining: number): number | null {
  const starterIndex = findComposeStarterIndex(starter);
  if (starterIndex < 0) return null;
  const start = COMPOSE_INDEX[starterIndex] ?? 0;
  const end = COMPOSE_INDEX[starterIndex + 1] ?? start;
  const pairCount = (end - start) / 2;
  let lo = 0;
  let hi = pairCount - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const index = start + mid * 2;
    const comb = COMPOSE_DATA[index] ?? 0;
    if (comb === combining) {
      return COMPOSE_DATA[index + 1] ?? null;
    }
    if (comb < combining) {
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return null;
}

function composeCanonical(codePoints: number[]): number[] {
  if (codePoints.length === 0) return [];
  const out: number[] = [];
  let starterIndex = -1;
  let starter = 0;
  let lastCCC = 0;

  for (const codePoint of codePoints) {
    const ccc = getCombiningClass(codePoint);
    if (starterIndex >= 0) {
      const hangul = composeHangul(starter, codePoint);
      if (hangul !== null && lastCCC === 0) {
        out[starterIndex] = hangul;
        starter = hangul;
        continue;
      }
      const composed = composePair(starter, codePoint);
      if (composed !== null && (lastCCC < ccc || lastCCC === 0)) {
        out[starterIndex] = composed;
        starter = composed;
        continue;
      }
    }
    if (ccc === 0) {
      starterIndex = out.length;
      starter = codePoint;
      lastCCC = 0;
    } else {
      lastCCC = ccc;
    }
    out.push(codePoint);
  }
  return out;
}

function codePointsToString(codePoints: number[]): string {
  if (codePoints.length === 0) return "";
  const chunks: string[] = [];
  const chunkSize = 2048;
  for (let i = 0; i < codePoints.length; i += chunkSize) {
    const slice = codePoints.slice(i, i + chunkSize);
    chunks.push(String.fromCodePoint(...slice));
  }
  return chunks.join("");
}

function nextCodePointOffset(text: string, index: number): number {
  const codePoint = text.codePointAt(index) ?? 0;
  return index + (codePoint > 0xffff ? 2 : 1);
}

function previousCodePointOffset(text: string, index: number): number {
  if (index <= 0) return 0;
  const previous = index - 1;
  const codeUnit = text.charCodeAt(previous);
  if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff && previous > 0) {
    const lead = text.charCodeAt(previous - 1);
    if (lead >= 0xd800 && lead <= 0xdbff) return previous - 1;
  }
  return previous;
}

function buildTransformMap(input: string, output: string): NormalizationTransform[] {
  if (input === output) {
    return [
      {
        sourceSpanCU: { startCU: 0, endCU: input.length },
        outputSpanCU: { startCU: 0, endCU: output.length },
        source: input,
        output,
        kind: "unchanged",
        reversible: true,
      },
    ];
  }

  let prefixCU = 0;
  let outputPrefixCU = 0;
  while (prefixCU < input.length && outputPrefixCU < output.length) {
    const nextInput = nextCodePointOffset(input, prefixCU);
    const nextOutput = nextCodePointOffset(output, outputPrefixCU);
    if (input.slice(prefixCU, nextInput) !== output.slice(outputPrefixCU, nextOutput)) break;
    prefixCU = nextInput;
    outputPrefixCU = nextOutput;
  }

  let inputSuffixStart = input.length;
  let outputSuffixStart = output.length;
  while (inputSuffixStart > prefixCU && outputSuffixStart > outputPrefixCU) {
    const nextInput = previousCodePointOffset(input, inputSuffixStart);
    const nextOutput = previousCodePointOffset(output, outputSuffixStart);
    if (input.slice(nextInput, inputSuffixStart) !== output.slice(nextOutput, outputSuffixStart)) {
      break;
    }
    inputSuffixStart = nextInput;
    outputSuffixStart = nextOutput;
  }

  const transforms: NormalizationTransform[] = [];
  if (prefixCU > 0 || outputPrefixCU > 0) {
    const source = input.slice(0, prefixCU);
    const normalized = output.slice(0, outputPrefixCU);
    transforms.push({
      sourceSpanCU: { startCU: 0, endCU: prefixCU },
      outputSpanCU: { startCU: 0, endCU: outputPrefixCU },
      source,
      output: normalized,
      kind: "unchanged",
      reversible: true,
    });
  }

  const source = input.slice(prefixCU, inputSuffixStart);
  const normalized = output.slice(outputPrefixCU, outputSuffixStart);
  transforms.push({
    sourceSpanCU: { startCU: prefixCU, endCU: inputSuffixStart },
    outputSpanCU: { startCU: outputPrefixCU, endCU: outputSuffixStart },
    source,
    output: normalized,
    kind: source.length === 0 ? "inserted" : normalized.length === 0 ? "deleted" : "normalized",
    reversible: false,
  });

  if (inputSuffixStart < input.length || outputSuffixStart < output.length) {
    transforms.push({
      sourceSpanCU: { startCU: inputSuffixStart, endCU: input.length },
      outputSpanCU: { startCU: outputSuffixStart, endCU: output.length },
      source: input.slice(inputSuffixStart),
      output: output.slice(outputSuffixStart),
      kind: "unchanged",
      reversible: true,
    });
  }

  return transforms;
}

function normalizeToCodePoints(text: string, form: NormalizationForm): number[] {
  const compatibility = form === "NFKC" || form === "NFKD";
  const compose = form === "NFC" || form === "NFKC";
  const decomposed = decomposeText(text, compatibility);
  const reordered = reorderCanonical(decomposed);
  return compose ? composeCanonical(reordered) : reordered;
}

/**
 * Normalize text to NFC/NFD/NFKC/NFKD.
 * Units: bytes (UTF-8).
 */
export function normalize(input: TextInput, form: NormalizationForm): string {
  const { text } = normalizeInput(input);
  const codePoints = normalizeToCodePoints(text, form);
  return codePointsToString(codePoints);
}

/**
 * Check if text is normalized to the requested form.
 * Units: bytes (UTF-8).
 */
export function isNormalized(input: TextInput, form: NormalizationForm): boolean {
  const { text } = normalizeInput(input);
  const normalized = normalize(text, form);
  return normalized === text;
}

/**
 * Iterate normalization steps for diagnostics.
 * Units: bytes (UTF-8).
 */
export async function* normalizeIter(
  chunks: Iterable<TextInput> | AsyncIterable<TextInput>,
  form: NormalizationForm,
): AsyncIterable<string> {
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let buffer = "";
  let usedDecoder = false;

  const flushBuffer = (text: string) => {
    const normalized = normalize(text, form);
    let lastStarterIndex = -1;
    for (let i = 0; i < normalized.length; ) {
      const cp = normalized.codePointAt(i) ?? 0;
      const ccc = getCombiningClass(cp);
      if (ccc === 0) lastStarterIndex = i;
      i += cp > 0xffff ? 2 : 1;
    }
    if (lastStarterIndex <= 0) {
      return { emit: "", carry: normalized };
    }
    return {
      emit: normalized.slice(0, lastStarterIndex),
      carry: normalized.slice(lastStarterIndex),
    };
  };

  for await (const chunk of chunks) {
    if (typeof chunk === "string") {
      buffer += chunk;
    } else {
      usedDecoder = true;
      buffer += decoder.decode(chunk, { stream: true });
    }
    const { emit, carry } = flushBuffer(buffer);
    if (emit) yield emit;
    buffer = carry;
  }

  if (usedDecoder) {
    buffer += decoder.decode();
  }

  if (buffer) {
    yield normalize(buffer, form);
  }
}

/**
 * Explain normalization changes for diagnostics.
 * Units: bytes (UTF-8).
 */
export function explainNormalization(
  input: TextInput,
  form: NormalizationForm,
): NormalizationExplanation {
  const { text } = normalizeInput(input);
  const compatibility = form === "NFKC" || form === "NFKD";
  const compose = form === "NFC" || form === "NFKC";
  const decomposed = decomposeText(text, compatibility);
  const reordered = reorderCanonical(decomposed);
  const composed = compose ? composeCanonical(reordered) : reordered;
  const output = codePointsToString(composed);
  const transformMap = buildTransformMap(text, output);
  return {
    form,
    input: text,
    output,
    provenance: createProvenance(
      {
        name: "UAX15.Normalize",
        spec: TR15_SPEC,
        revisionOrDate: DEFAULT_ALGORITHM_REVISION,
        implementationId: IMPLEMENTATION_ID,
      },
      { form },
      { text: "utf16-code-unit", codePoint: "unicode-code-point" },
    ),
    isReversible: transformMap.every((item) => item.reversible),
    transformMap,
    stages: {
      decomposed,
      reordered,
      composed,
    },
  };
}
