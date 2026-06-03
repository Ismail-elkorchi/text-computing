export const packageName = "@ismail-elkorchi/textfst" as const;
export type PackageName = typeof packageName;

export * from "./apply/mod.js";
export * from "./automaton/mod.js";
export * from "./compile/mod.js";
export * from "./lexc/mod.js";
export * from "./morph/mod.js";
export * from "./regex/mod.js";
export * from "./resource/mod.js";
export * from "./rewrite/mod.js";
export * from "./spell/mod.js";
export * from "./transducer/mod.js";
export * from "./twol/mod.js";
export * from "./weight/mod.js";
