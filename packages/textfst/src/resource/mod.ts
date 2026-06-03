import { buildFst, type Fst } from "../automaton/mod.js";
import { compileLexicon, type LexcSource } from "../lexc/mod.js";
import { compileRewrite, type RewriteRule } from "../rewrite/mod.js";
import { compileTwol, type TwolInput } from "../twol/mod.js";

export type FstResourceKind = "fst" | "morphology" | "rewrite" | "twol";

export interface FstResourceDescriptor {
	readonly id: string;
	readonly kind: string;
	readonly format?: string | undefined;
	readonly metadata?: Readonly<Record<string, unknown>> | undefined;
}

export interface StructuralTextPack {
	readonly manifest: {
		readonly resources: readonly FstResourceDescriptor[];
	};
	readonly resources: Readonly<Record<string, unknown>>;
}

export interface FstResourceQuery {
	readonly id?: string | undefined;
	readonly kind?: FstResourceKind | readonly FstResourceKind[] | undefined;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFst(value: unknown): value is Fst {
	return (
		isRecord(value) &&
		Array.isArray(value.states) &&
		Array.isArray(value.arcs) &&
		typeof value.id === "string"
	);
}

function kinds(query: FstResourceQuery): readonly string[] {
	if (query.kind === undefined) return ["fst", "morphology", "rewrite", "twol"];
	return Object.freeze(
		Array.isArray(query.kind) ? [...query.kind] : [query.kind],
	);
}

export function parseFstResource(value: unknown): Fst {
	if (isFst(value)) return buildFst(value);
	if (typeof value === "string") {
		const parsed = JSON.parse(value) as unknown;
		if (isFst(parsed)) return buildFst(parsed);
		throw new TypeError(
			"String FST resources must contain serialized Fst JSON.",
		);
	}
	if (isRecord(value) && value.kind === "rewrite" && isRecord(value.rule)) {
		return compileRewrite(value.rule as unknown as RewriteRule);
	}
	if (isRecord(value) && value.kind === "twol") {
		return compileTwol(value as unknown as TwolInput);
	}
	if (
		isRecord(value) &&
		(value.kind === "morphology" || Array.isArray(value.entries))
	) {
		return compileLexicon(value as unknown as LexcSource);
	}
	throw new TypeError("Resource value is not a supported textfst resource.");
}

export function fstFromPack(
	pack: StructuralTextPack,
	query: string | FstResourceQuery,
): Fst {
	const normalizedQuery = typeof query === "string" ? { id: query } : query;
	const allowedKinds = new Set(kinds(normalizedQuery));
	const descriptor = pack.manifest.resources.find(
		(resource) =>
			(normalizedQuery.id === undefined ||
				resource.id === normalizedQuery.id) &&
			allowedKinds.has(resource.kind),
	);
	if (descriptor === undefined)
		throw new Error("No matching FST resource was found in the pack.");
	const value = pack.resources[descriptor.id];
	return parseFstResource(value);
}
