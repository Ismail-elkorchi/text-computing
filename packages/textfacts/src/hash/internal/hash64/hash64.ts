import { TextfactsError } from "../../../internal/error.ts";
import { utf8Bytes } from "./encoding.ts";
import { fnv1a64Bytes, fnv1a64Utf16Span } from "./fnv1a64.ts";
import type { StableHash64Algorithm } from "./types.ts";
import { xxh64Bytes } from "./xxh64.ts";

function unsupportedAlgorithm(algorithm: string): never {
  throw new TextfactsError("HASH64_UNSUPPORTED_ALGO", "Unsupported hash64 algorithm", {
    algorithm,
  });
}

export function computeStableHash64Value(
  text: string,
  opts: { algorithm: StableHash64Algorithm },
): bigint {
  switch (opts.algorithm) {
    case "fnv1a64-utf16le":
      return fnv1a64Utf16Span(text, 0, text.length);
    case "fnv1a64-utf8":
      return fnv1a64Bytes(utf8Bytes(text));
    case "xxh64-utf8":
      return xxh64Bytes(utf8Bytes(text));
    default:
      return unsupportedAlgorithm(opts.algorithm);
  }
}
