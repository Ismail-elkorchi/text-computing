/**
 * CollationStrength defines an exported type contract.
 */
export type CollationStrength = 1 | 2 | 3 | 4;
/**
 * CollationAlternate defines an exported type contract.
 */
export type CollationAlternate = "non-ignorable" | "shifted";
/**
 * CollationNormalization defines an exported type contract.
 */
export type CollationNormalization = "nfd" | "none";
/**
 * CollationIllFormed defines an exported type contract.
 */
export type CollationIllFormed = "error" | "replace" | "implicit";

/**
 * CollationOptions defines an exported structural contract.
 */
export interface CollationOptions {
  strength?: CollationStrength;
  alternate?: CollationAlternate;
  normalization?: CollationNormalization;
  illFormed?: CollationIllFormed;
  includeIdenticalLevel?: boolean;
}
