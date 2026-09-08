export function compareStrings(left: string, right: string): number {
	return left < right ? -1 : left > right ? 1 : 0;
}

export function compareNumbers(left: number, right: number): number {
	return left < right ? -1 : left > right ? 1 : 0;
}

export function compareStringArrays(
	left: readonly string[],
	right: readonly string[],
): number {
	const length = Math.min(left.length, right.length);
	for (let index = 0; index < length; index += 1) {
		const leftValue = left[index];
		const rightValue = right[index];
		if (leftValue === undefined || rightValue === undefined) break;
		const compared = compareStrings(leftValue, rightValue);
		if (compared !== 0) return compared;
	}
	return compareNumbers(left.length, right.length);
}

export function uniqueSorted(values: Iterable<string>): string[] {
	return [...new Set(values)].sort(compareStrings);
}

export function stableEntries<T>(
	record: Readonly<Record<string, T>>,
): [string, T][] {
	return Object.entries(record).sort(([left], [right]) =>
		compareStrings(left, right),
	);
}
