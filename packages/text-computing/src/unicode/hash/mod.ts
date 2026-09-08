import { computeStableHash128Value, formatHash128Hex } from "./internal/hash128/hash128.ts";
import { formatUint64Hex } from "./internal/hash64/fnv1a64.ts";
import { computeStableHash64Value } from "./internal/hash64/hash64.ts";
import type { StableHash64Algorithm } from "./internal/hash64/types.ts";

export type { StableHash64Algorithm } from "./internal/hash64/types.ts";

export interface StableHash64Options {
  algorithm?: StableHash64Algorithm;
}

export interface StableHash128Options {
  left?: StableHash64Algorithm;
  right?: StableHash64Algorithm;
}

export function stableHash64(text: string, options: StableHash64Options = {}): string {
  const algorithm = options.algorithm ?? "xxh64-utf8";
  return formatUint64Hex(computeStableHash64Value(text, { algorithm }));
}

export function stableHash128(text: string, options: StableHash128Options = {}): string {
  return formatHash128Hex(
    computeStableHash128Value(text, {
      left: options.left ?? "fnv1a64-utf16le",
      right: options.right ?? "xxh64-utf8",
    }),
  );
}
