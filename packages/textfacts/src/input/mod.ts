import { TextfactsError } from "../internal/error.ts";
import type { TextInput as InternalTextInput } from "../internal/types.ts";
import { scanIntegrityFindings } from "../integrity/integrity.ts";

export type TextInput = InternalTextInput;

export interface ReadTextOptions {
  allowIllFormed?: boolean;
}

export interface TextSource {
  text: string;
  sourceType: "string" | "utf8";
  byteLength?: number;
  wellFormed: boolean;
}

const utf8Decoder = new TextDecoder("utf-8", { fatal: true });

export function readText(input: TextInput, options: ReadTextOptions = {}): TextSource {
  if (typeof input === "string") {
    const loneSurrogates = scanIntegrityFindings(input, {
      include: ["lone-surrogate"],
      maxFindings: 1,
    });
    const wellFormed = loneSurrogates.length === 0;
    if (!wellFormed && options.allowIllFormed !== true) {
      throw new TextfactsError("INPUT_ILL_FORMED_UNICODE", "Input contains lone surrogates", {
        sourceType: "string",
        firstFinding: loneSurrogates[0],
      });
    }
    return { text: input, sourceType: "string", wellFormed };
  }

  const text = utf8Decoder.decode(input);
  const loneSurrogates = scanIntegrityFindings(text, {
    include: ["lone-surrogate"],
    maxFindings: 1,
  });
  const wellFormed = loneSurrogates.length === 0;

  if (!wellFormed && options.allowIllFormed !== true) {
    throw new TextfactsError("INPUT_ILL_FORMED_UNICODE", "Input contains lone surrogates", {
      sourceType: "utf8",
      firstFinding: loneSurrogates[0],
    });
  }

  return { text, sourceType: "utf8", byteLength: input.byteLength, wellFormed };
}
