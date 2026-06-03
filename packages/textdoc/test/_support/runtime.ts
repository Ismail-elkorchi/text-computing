import type * as Textdoc from "../../src/mod.ts";

export type Runtime = "node" | "deno" | "bun";
export type TextdocModule = typeof Textdoc;
export type TextdocSubpath =
	| ""
	| "document"
	| "view"
	| "span"
	| "layer"
	| "annotation"
	| "graph"
	| "query"
	| "selection"
	| "serialize";

export function detectRuntime(): Runtime {
	if (typeof (globalThis as { Deno?: unknown }).Deno !== "undefined")
		return "deno";
	if (typeof (globalThis as { Bun?: unknown }).Bun !== "undefined")
		return "bun";
	return "node";
}

export function getPackageRootUrl(): URL {
	const moduleUrl = new URL(import.meta.url);
	const isCompiled = moduleUrl.pathname.includes("/dist-test/");
	return isCompiled
		? new URL("../../../", moduleUrl)
		: new URL("../../", moduleUrl);
}

export async function importTextdoc(): Promise<TextdocModule> {
	return (await importTextdocSubpath("")) as TextdocModule;
}

export async function importTextdocSubpath(
	subpath: TextdocSubpath,
): Promise<unknown> {
	const runtime = detectRuntime();
	const rootUrl = getPackageRootUrl();
	const moduleUrl =
		runtime === "node"
			? new URL(subpath ? `dist/${subpath}/mod.js` : "dist/mod.js", rootUrl)
			: new URL(subpath ? `src/${subpath}/mod.ts` : "src/mod.ts", rootUrl);
	return import(moduleUrl.href);
}
