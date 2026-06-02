import {
  charNgrams,
  confusableSkeleton,
  normalize,
  readText,
  segmentGraphemes,
  stableHash64,
  wordFrequencies,
} from "../../mod.ts";

if (readText(new TextEncoder().encode("Café")).text !== "Café") {
  throw new Error("Browser readText UTF-8 mismatch");
}

if (normalize("Cafe\u0301", "NFC") !== "Café") {
  throw new Error("Browser normalization mismatch");
}

if ([...segmentGraphemes("Cafe\u0301")].length !== 4) {
  throw new Error("Browser grapheme segmentation mismatch");
}

if (wordFrequencies("a a b").items[0]?.value !== "a") {
  throw new Error("Browser word frequency mismatch");
}

if (charNgrams("abcd", { n: 2 }).total !== 3) {
  throw new Error("Browser ngram mismatch");
}

if (confusableSkeleton("paypal") !== confusableSkeleton("раураl")) {
  throw new Error("Browser confusable skeleton mismatch");
}

if (stableHash64("abc").length !== 16) {
  throw new Error("Browser stable hash mismatch");
}
