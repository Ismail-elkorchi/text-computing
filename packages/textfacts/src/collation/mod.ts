import type {
  CollationAlternate,
  CollationIllFormed,
  CollationNormalization,
  CollationOptions,
  CollationStrength,
} from "./types.ts";
import { buildRootCollationKey, compareRootCollationInternal } from "./uca.ts";

export type {
  CollationAlternate,
  CollationIllFormed,
  CollationNormalization,
  CollationOptions,
  CollationStrength,
};

export function rootCollationKey(text: string, options?: CollationOptions): Uint8Array {
  return buildRootCollationKey(text, options);
}

export function compareRootCollation(
  left: string,
  right: string,
  options?: CollationOptions,
): -1 | 0 | 1 {
  return compareRootCollationInternal(left, right, options);
}
