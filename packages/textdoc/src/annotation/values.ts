import type { Score } from "./mod.ts";

export interface TokenValue {
	readonly index: number;
	readonly text: string;
	readonly normalized?: string;
}

export interface MorphAnalysisValue {
	readonly lemma?: string;
	readonly stem?: string;
	readonly pos?: string;
	readonly features?: Readonly<Record<string, string | readonly string[]>>;
	readonly analysis?: string;
}

export interface DependencyEdgeValue {
	readonly head: string;
	readonly dependent: string;
	readonly relation: string;
}

export interface ParseTreeValue {
	readonly label: string;
	readonly children: ReadonlyArray<ParseTreeValue | string>;
}

export interface EntityValue {
	readonly label: string;
	readonly canonical?: string;
	readonly kbId?: string;
}

export interface TermCandidateValue {
	readonly term: string;
	readonly head?: string;
	readonly score?: Score;
	readonly domain?: string;
}

export interface QualityFindingValue {
	readonly kind: string;
	readonly severity?: "info" | "notice" | "warning" | "error";
	readonly message?: string;
}
