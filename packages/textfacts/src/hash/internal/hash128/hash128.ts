import { TextfactsError } from "../../../internal/error.ts";
import { computeStableHash64Value } from "../hash64/hash64.ts";
import type { StableHash64Algorithm } from "../hash64/types.ts";

/**
 * Hash128 defines an exported type contract.
 */
export type Hash128 = readonly [bigint, bigint];

export function computeStableHash128Value(
  text: string,
  opts: { left: StableHash64Algorithm; right: StableHash64Algorithm },
): Hash128 {
  const left = computeStableHash64Value(text, { algorithm: opts.left });
  const right = computeStableHash64Value(text, { algorithm: opts.right });
  return [left, right];
}

/**
 * formatHash128Hex executes a deterministic operation in this module.
 */
export function formatHash128Hex(hash: Hash128): string {
  const [left, right] = hash;
  return `${left.toString(16).padStart(16, "0")}${right.toString(16).padStart(16, "0")}`.toLowerCase();
}

/**
 * parseHash128Hex executes a deterministic operation in this module.
 */
export function parseHash128Hex(hex: string): Hash128 {
  if (!/^[0-9a-fA-F]{32}$/.test(hex)) {
    throw new TextfactsError("HASH128_INVALID_HEX", "Expected 32 hex characters", { hex });
  }
  const left = BigInt(`0x${hex.slice(0, 16)}`);
  const right = BigInt(`0x${hex.slice(16)}`);
  return [left, right];
}
