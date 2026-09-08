import type * as Textfacts from "../../../src/unicode/index.ts";

export type TextfactsModule = typeof Textfacts;
export type TextfactsSubpath =
  | ""
  | "input"
  | "unicode"
  | "normalize"
  | "casefold"
  | "segment"
  | "linebreak"
  | "bidi"
  | "security"
  | "integrity"
  | "collation"
  | "facts"
  | "hash"
  | "idna";

export async function importTextfacts(): Promise<TextfactsModule> {
  return (await importTextfactsSubpath("")) as TextfactsModule;
}

export async function importTextfactsSubpath(subpath: TextfactsSubpath): Promise<unknown> {
  return import(`@ismail-elkorchi/text-computing/unicode${subpath ? `/${subpath}` : ""}`);
}
