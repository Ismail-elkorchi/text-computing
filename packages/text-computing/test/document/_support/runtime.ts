import type * as Textdoc from "../../../src/document/mod.ts";

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

export async function importTextdoc(): Promise<TextdocModule> {
	return (await importTextdocSubpath("")) as TextdocModule;
}

export async function importTextdocSubpath(
	subpath: TextdocSubpath,
): Promise<unknown> {
	return import(
		`@ismail-elkorchi/text-computing/document${subpath ? `/${subpath}` : ""}`
	);
}
