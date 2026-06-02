import type * as Textfacts from "../../mod.ts";

export type Runtime = "node" | "deno" | "bun";
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

export function detectRuntime(): Runtime {
  if (typeof (globalThis as { Deno?: unknown }).Deno !== "undefined") return "deno";
  if (typeof (globalThis as { Bun?: unknown }).Bun !== "undefined") return "bun";
  return "node";
}

export function getRepoRootUrl(): URL {
  const moduleUrl = new URL(import.meta.url);
  const isCompiled = moduleUrl.pathname.includes("/dist-test/");
  return isCompiled ? new URL("../../../", moduleUrl) : new URL("../../", moduleUrl);
}

function fileUrlToPath(url: URL): string {
  let path = url.pathname;
  if (path.startsWith("/") && path.length > 3 && path[2] === ":") {
    path = path.slice(1);
  }
  return decodeURIComponent(path);
}

export async function readTextFile(pathOrUrl: string | URL): Promise<string> {
  const runtime = detectRuntime();
  const path = typeof pathOrUrl === "string" ? pathOrUrl : fileUrlToPath(pathOrUrl);
  if (runtime === "deno") {
    const deno = (globalThis as { Deno?: { readTextFile: (path: string) => Promise<string> } })
      .Deno;
    if (!deno) throw new Error("Deno runtime not available");
    return await deno.readTextFile(path);
  }
  if (runtime === "bun") {
    const bun = (
      globalThis as { Bun?: { file: (path: string) => { text: () => Promise<string> } } }
    ).Bun;
    if (!bun) throw new Error("Bun runtime not available");
    return await bun.file(path).text();
  }
  const nodeFsPromises = await import("node:fs/promises");
  return await nodeFsPromises.readFile(path, "utf8");
}

export async function importTextfacts(): Promise<TextfactsModule> {
  return (await importTextfactsSubpath("")) as TextfactsModule;
}

export async function importTextfactsSubpath(subpath: TextfactsSubpath): Promise<unknown> {
  const runtime = detectRuntime();
  const rootUrl = getRepoRootUrl();
  const moduleUrl =
    runtime === "node"
      ? new URL(subpath ? `dist/src/${subpath}/mod.js` : "dist/mod.js", rootUrl)
      : new URL(subpath ? `src/${subpath}/mod.ts` : "mod.ts", rootUrl);
  return import(moduleUrl.href);
}
