import {
  caseFold as caseFoldImpl,
  caseFoldCodePoint,
  nfkcCaseFold as nfkcCaseFoldImpl,
} from "./casefold.ts";

export { caseFoldCodePoint };

export function caseFold(text: string): string {
  return caseFoldImpl(text);
}

export function nfkcCaseFold(text: string): string {
  return nfkcCaseFoldImpl(text);
}
