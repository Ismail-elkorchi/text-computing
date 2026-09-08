export function compareCodePointStrings(left: string, right: string): number {
	const leftPoints = Array.from(left);
	const rightPoints = Array.from(right);
	const length = Math.min(leftPoints.length, rightPoints.length);
	for (let index = 0; index < length; index += 1) {
		const leftPoint = leftPoints[index]?.codePointAt(0) ?? 0;
		const rightPoint = rightPoints[index]?.codePointAt(0) ?? 0;
		if (leftPoint !== rightPoint) return leftPoint - rightPoint;
	}
	return leftPoints.length - rightPoints.length;
}

export function compareNumbers(left: number, right: number): number {
	return left === right ? 0 : left < right ? -1 : 1;
}

export function orderedEntries<T>(
	record: Readonly<Record<string, T>>,
): [string, T][] {
	return Object.entries(record).sort(([left], [right]) =>
		compareCodePointStrings(left, right),
	);
}

export function orderedRecord<T>(
	record: Readonly<Record<string, T>>,
): Readonly<Record<string, T>> {
	return Object.fromEntries(orderedEntries(record));
}
