import type { TextfactsProfileInput } from "../internal/profile.ts";
import type { SegmentIterable, Span } from "../internal/types.ts";
import { segmentGraphemes as segmentGraphemesImpl } from "./grapheme.ts";
import { segmentSentencesDefault } from "./sentence.ts";
import { segmentWordsDefault } from "./word.ts";

export type { Span };

export interface SegmentOptions {
  algorithmRevision?: string;
  profile?: TextfactsProfileInput;
}

export function segmentGraphemes(text: string, options: SegmentOptions = {}): SegmentIterable {
  return segmentGraphemesImpl(text, options);
}

export function segmentWords(text: string, options: SegmentOptions = {}): SegmentIterable {
  return segmentWordsDefault(text, options);
}

export function segmentSentences(text: string, options: SegmentOptions = {}): SegmentIterable {
  return segmentSentencesDefault(text, options);
}
