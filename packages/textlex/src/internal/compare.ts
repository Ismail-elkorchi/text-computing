export function compareString(left: string, right: string): number {
	return left.localeCompare(right);
}

export function compareNumber(left: number, right: number): number {
	return left < right ? -1 : left > right ? 1 : 0;
}

export function compareOptionalString(
	left: string | undefined,
	right: string | undefined,
): number {
	if (left === undefined && right === undefined) return 0;
	if (left === undefined) return 1;
	if (right === undefined) return -1;
	return compareString(left, right);
}

export function uniqueSorted(values: Iterable<string>): readonly string[] {
	return Object.freeze([...new Set(values)].sort(compareString));
}
