/**
 * TextfactsErrorCode defines an exported type contract.
 */
export type TextfactsErrorCode =
  | "JCS_NON_FINITE_NUMBER"
  | "JCS_LONE_SURROGATE"
  | "JCS_NONCHARACTER"
  | "JCS_UNSUPPORTED_TYPE"
  | "HASH64_INVALID_HEX"
  | "HASH64_UNSUPPORTED_ALGO"
  | "HASH64_UNSUPPORTED_SEED"
  | "HASH128_INVALID_HEX"
  | "COLLATION_ILL_FORMED"
  | "CUSTOM_TOKENIZER_REQUIRED"
  | "PROFILE_UNSUPPORTED"
  | "PROFILE_REVISION_MISMATCH";

/**
 * TextfactsError provides an exported class contract.
 */
export class TextfactsError extends Error {
  readonly code: TextfactsErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(code: TextfactsErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "TextfactsError";
    this.code = code;
    if (details) this.details = details;
  }
}
