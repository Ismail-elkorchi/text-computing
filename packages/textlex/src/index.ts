export const packageName = "@ismail-elkorchi/textlex" as const;
export type PackageName = typeof packageName;

export * from "./abbreviation/mod.js";
export * from "./affix/mod.js";
export * from "./annotate/mod.js";
export * from "./fuzzy/mod.js";
export * from "./gazetteer/mod.js";
export * from "./lexicon/mod.js";
export * from "./phrase/mod.js";
export * from "./pronunciation/mod.js";
export * from "./resource/mod.js";
export * from "./term/mod.js";
export * from "./trie/mod.js";
export * from "./wordlist/mod.js";
