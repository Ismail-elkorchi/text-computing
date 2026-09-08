import { TextfactsError } from "../../../internal/error.ts";

const FNV_OFFSET = 0xcbf29ce484222325n;
const FNV_PRIME = 0x100000001b3n;
const MASK_64 = 0xffffffffffffffffn;

function clamp64(value: bigint): bigint {
  return value & MASK_64;
}

/**
 * Hash a UTF-16 code unit span with FNV-1a 64.
 * Units: UTF-16 code units.
 */
export function fnv1a64Utf16Span(text: string, startCU: number, endCU: number): bigint {
  let hash = FNV_OFFSET;
  const start = Math.max(0, startCU);
  const end = Math.min(endCU, text.length);
  for (let index = start; index < end; index += 1) {
    const codeUnit = text.charCodeAt(index);
    const lowByte = codeUnit & 0xff;
    const highByte = codeUnit >> 8;
    hash ^= BigInt(lowByte);
    hash = clamp64(hash * FNV_PRIME);
    hash ^= BigInt(highByte);
    hash = clamp64(hash * FNV_PRIME);
  }
  return hash;
}

/**
 * FNV-1a 64-bit over raw bytes.
 * Units: bytes (binary).
 */
export function fnv1a64Bytes(bytes: Uint8Array): bigint {
  let hash = FNV_OFFSET;
  for (const byte of bytes) {
    hash ^= BigInt(byte);
    hash = clamp64(hash * FNV_PRIME);
  }
  return hash;
}

export function formatUint64Hex(value: bigint): string {
  if (value < 0n || value > MASK_64) {
    throw new TextfactsError("HASH64_INVALID_HEX", "Value is outside uint64 range", {
      value: value.toString(),
    });
  }
  return value.toString(16).padStart(16, "0");
}
