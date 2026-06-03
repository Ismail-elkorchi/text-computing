export const packageName = "@ismail-elkorchi/textdoc" as const;

export type PackageName = typeof packageName;

export * from "./annotation/mod.ts";
export * from "./document/mod.ts";
export * from "./graph/mod.ts";
export * from "./layer/mod.ts";
export * from "./query/mod.ts";
export * from "./selection/mod.ts";
export * from "./serialize/mod.ts";
export * from "./span/mod.ts";
export * from "./view/mod.ts";
