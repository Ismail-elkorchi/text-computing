import { iterateCodePoints } from "../core/codepoint.ts";
import type { Span } from "../core/types.ts";

export interface CodePointArray {
  codePoints: number[];
  codeUnitStarts: number[];
}

export function collectCodePoints(text: string): CodePointArray {
  const codePoints: number[] = [];
  const codeUnitStarts: number[] = [];
  for (const cp of iterateCodePoints(text)) {
    codePoints.push(cp.codePoint);
    codeUnitStarts.push(cp.indexCU);
  }
  return { codePoints, codeUnitStarts };
}

export function collectCodePointProperties(
  codePoints: readonly number[],
  getPropertyId: (codePoint: number) => number,
): Int32Array {
  const props = new Int32Array(codePoints.length);
  for (let index = 0; index < codePoints.length; index += 1) {
    props[index] = getPropertyId(codePoints[index] ?? 0);
  }
  return props;
}

export function collectCodePointFlags(
  codePoints: readonly number[],
  predicate: (codePoint: number) => boolean,
): Uint8Array {
  const flags = new Uint8Array(codePoints.length);
  for (let index = 0; index < codePoints.length; index += 1) {
    flags[index] = predicate(codePoints[index] ?? 0) ? 1 : 0;
  }
  return flags;
}

export interface SkipIndexes {
  readonly prevNonSkip: Int32Array;
  readonly nextNonSkip: Int32Array;
}

export function collectSkipIndexes(
  props: Int32Array,
  isSkippable: (property: number) => boolean,
): SkipIndexes {
  const prevNonSkip = new Int32Array(props.length);
  let last = -1;
  for (let index = 0; index < props.length; index += 1) {
    const prop = props[index] ?? 0;
    if (!isSkippable(prop)) last = index;
    prevNonSkip[index] = last;
  }

  const nextNonSkip = new Int32Array(props.length);
  let next = -1;
  for (let index = props.length - 1; index >= 0; index -= 1) {
    const prop = props[index] ?? 0;
    if (!isSkippable(prop)) next = index;
    nextNonSkip[index] = next;
  }

  return { prevNonSkip, nextNonSkip };
}

export function collectSkipAwareRunCounts(
  props: Int32Array,
  prevNonSkip: Int32Array,
  targetProperty: number,
): Int32Array {
  const counts = new Int32Array(props.length);
  for (let index = 0; index < props.length; index += 1) {
    const prop = props[index] ?? 0;
    if (prop !== targetProperty) {
      counts[index] = 0;
      continue;
    }

    const prevIndex = index > 0 ? (prevNonSkip[index - 1] ?? -1) : -1;
    counts[index] =
      prevIndex >= 0 && (props[prevIndex] ?? 0) === targetProperty
        ? (counts[prevIndex] ?? 0) + 1
        : 1;
  }
  return counts;
}

export function* segmentSpansByCodePointBoundaries(
  text: string,
  codeUnitStarts: readonly number[],
  count: number,
  shouldBreak: (index: number) => boolean,
): Iterable<Span> {
  if (text.length === 0 || count === 0) return;

  let startCU = 0;
  for (let index = 1; index < count; index += 1) {
    if (shouldBreak(index)) {
      const boundary = codeUnitStarts[index] ?? text.length;
      yield { startCU, endCU: boundary };
      startCU = boundary;
    }
  }

  yield { startCU, endCU: text.length };
}
