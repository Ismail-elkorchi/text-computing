import {
  compareRootCollation,
  normalize,
  readText,
  rootCollationKey,
  scanIntegrityFindings,
  stableHash128,
} from "../../mod.ts";

if (typeof process !== "undefined") {
  throw new Error("Cloudflare Workers smoke must not rely on process");
}

if (typeof Buffer !== "undefined") {
  throw new Error("Cloudflare Workers smoke must not rely on Buffer");
}

if (readText("abc").text !== "abc") {
  throw new Error("Workers readText mismatch");
}

if (normalize("Cafe\u0301", "NFC") !== "Café") {
  throw new Error("Workers normalization mismatch");
}

if (scanIntegrityFindings("a\u200Db", { include: ["join-control"] }).length !== 1) {
  throw new Error("Workers integrity mismatch");
}

if (compareRootCollation("abc", "abc") !== 0 || rootCollationKey("abc").length === 0) {
  throw new Error("Workers collation mismatch");
}

if (stableHash128("abc").length !== 32) {
  throw new Error("Workers stable hash mismatch");
}
