export function compareText(left: string, right: string): number {
	if (left === right) return 0;
	return left < right ? -1 : 1;
}

export function compareOptionalText(
	left: string | undefined,
	right: string | undefined,
): number {
	if (left === right) return 0;
	if (left === undefined) return -1;
	if (right === undefined) return 1;
	return compareText(left, right);
}

export function uniqueSorted(values: readonly string[]): readonly string[] {
	return Object.freeze([...new Set(values)].sort(compareText));
}

export function entriesSortedByKey<T>(
	record: Readonly<Record<string, T>>,
): readonly (readonly [string, T])[] {
	return Object.freeze(
		Object.entries(record).sort(([left], [right]) => compareText(left, right)),
	);
}
