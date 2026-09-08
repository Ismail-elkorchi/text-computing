import {
  confusableSkeleton as confusableSkeletonImpl,
  type ConfusableOptions,
} from "./confusables.ts";
export type { ConfusableOptions };
import type { ScannedToken, TokenScanOptions } from "./scan.ts";
import { hasMixedScriptToken, scanTokens } from "./scan.ts";

export interface MixedScriptOptions {
  maxTokens?: number;
  wordFilter?: "all" | "word-like";
}

export type MixedScriptTokenFact = ScannedToken;

export type ScriptTokenFact = ScannedToken;

export { hasMixedScriptToken };

export function confusableSkeleton(text: string, options: ConfusableOptions = {}): string {
  return confusableSkeletonImpl(text, options);
}

export function* scriptTokenFacts(
  text: string,
  options: MixedScriptOptions = {},
): Iterable<ScriptTokenFact> {
  const scanOptions: TokenScanOptions = {
    tokenizer: "uax29-word",
    canonicalize: "none",
    wordFilter: options.wordFilter ?? "word-like",
  };
  if (options.maxTokens !== undefined) {
    scanOptions.maxTokens = options.maxTokens;
  }
  yield* scanTokens(text, scanOptions);
}

export function* mixedScriptTokenFacts(
  text: string,
  options: MixedScriptOptions = {},
): Iterable<MixedScriptTokenFact> {
  for (const token of scriptTokenFacts(text, options)) {
    if (token.hasMixedScript) yield token;
  }
}
