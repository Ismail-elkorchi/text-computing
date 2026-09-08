import { hasBidiControls as hasBidiControlsImpl, resolveBidi as resolveBidiImpl } from "./bidi.ts";
export type { BidiOptions, BidiResolution, BidiRun } from "./types.ts";
export { BidiClass, bidiClassAt } from "../unicode/bidi.ts";
import type { BidiOptions, BidiResolution } from "./types.ts";

export function resolveBidi(text: string, options: BidiOptions = {}): BidiResolution {
  return resolveBidiImpl(text, options);
}

export function hasBidiControls(text: string): boolean {
  return hasBidiControlsImpl(text);
}
