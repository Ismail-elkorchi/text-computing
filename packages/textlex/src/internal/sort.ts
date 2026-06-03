import { compareNumber, compareString } from "./compare.js";

export interface OrderedEntry {
	readonly id: string;
	readonly source?: string;
}

export function compareEntries(
	left: OrderedEntry,
	right: OrderedEntry,
): number {
	return (
		compareOptional(left.source, right.source) ||
		compareString(left.id, right.id)
	);
}

function compareOptional(
	left: string | undefined,
	right: string | undefined,
): number {
	if (left === undefined && right === undefined) return 0;
	if (left === undefined) return 1;
	if (right === undefined) return -1;
	return compareString(left, right);
}

export interface RankedMatch {
	readonly score: number;
	readonly rank: number;
	readonly entryId: string;
	readonly form: string;
}

export function compareRankedMatch(
	left: RankedMatch,
	right: RankedMatch,
): number {
	return (
		compareNumber(right.score, left.score) ||
		compareNumber(left.rank, right.rank) ||
		compareString(left.entryId, right.entryId) ||
		compareString(left.form, right.form)
	);
}
