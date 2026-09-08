export function finite(value: number): number {
	return Number.isFinite(value) ? value : 0;
}

export function safeDivide(numerator: number, denominator: number): number {
	return denominator === 0 ? 0 : finite(numerator / denominator);
}

export function log2(value: number): number {
	return value <= 0 ? 0 : Math.log2(value);
}

export function logLikelihood(
	observedA: number,
	totalA: number,
	observedB: number,
	totalB: number,
): number {
	const total = totalA + totalB;
	const observed = observedA + observedB;
	if (total === 0 || observed === 0) return 0;
	const expectedA = (totalA * observed) / total;
	const expectedB = (totalB * observed) / total;
	const absent = total - observed;
	const expectedAbsentA = (totalA * absent) / total;
	const expectedAbsentB = (totalB * absent) / total;
	const absentA = Math.max(0, totalA - observedA);
	const absentB = Math.max(0, totalB - observedB);
	const term = (observedValue: number, expectedValue: number) =>
		observedValue <= 0 || expectedValue <= 0
			? 0
			: observedValue * Math.log(observedValue / expectedValue);
	return finite(
		2 *
			(term(observedA, expectedA) +
				term(observedB, expectedB) +
				term(absentA, expectedAbsentA) +
				term(absentB, expectedAbsentB)),
	);
}

export function chiSquare(
	observedA: number,
	totalA: number,
	observedB: number,
	totalB: number,
): number {
	const grandTotal = totalA + totalB;
	if (grandTotal === 0) return 0;
	const presentTotal = observedA + observedB;
	const absentA = Math.max(0, totalA - observedA);
	const absentB = Math.max(0, totalB - observedB);
	const absentTotal = absentA + absentB;
	const cells = [
		[observedA, (totalA * presentTotal) / grandTotal],
		[observedB, (totalB * presentTotal) / grandTotal],
		[absentA, (totalA * absentTotal) / grandTotal],
		[absentB, (totalB * absentTotal) / grandTotal],
	] as const;
	return finite(
		cells.reduce(
			(sum, [observed, expected]) =>
				expected <= 0 ? sum : sum + (observed - expected) ** 2 / expected,
			0,
		),
	);
}

export function associationScore(
	measure:
		| "mi"
		| "mi3"
		| "t-score"
		| "z-score"
		| "chi-square"
		| "log-likelihood"
		| "dice"
		| "logdice"
		| "raw-frequency"
		| "relative-frequency",
	pairCount: number,
	leftCount: number,
	rightCount: number,
	totalWindows: number,
	corpusTokenCount: number,
): number {
	const expected = safeDivide(totalWindows * rightCount, corpusTokenCount);
	if (measure === "raw-frequency") return pairCount;
	if (measure === "relative-frequency")
		return safeDivide(pairCount, totalWindows);
	if (measure === "dice")
		return safeDivide(2 * pairCount, leftCount + rightCount);
	if (measure === "logdice") {
		const dice = safeDivide(2 * pairCount, leftCount + rightCount);
		return dice <= 0 ? 0 : 14 + log2(dice);
	}
	if (measure === "mi") return log2(safeDivide(pairCount, expected));
	if (measure === "mi3") return log2(safeDivide(pairCount ** 3, expected));
	if (measure === "t-score") {
		return pairCount === 0
			? 0
			: safeDivide(pairCount - expected, Math.sqrt(pairCount));
	}
	if (measure === "z-score") {
		return expected === 0
			? 0
			: safeDivide(pairCount - expected, Math.sqrt(expected));
	}
	if (measure === "chi-square") {
		return chiSquare(pairCount, totalWindows, rightCount, corpusTokenCount);
	}
	return logLikelihood(pairCount, totalWindows, rightCount, corpusTokenCount);
}

export function cosineSimilarity(
	left: Readonly<Record<string, number>>,
	right: Readonly<Record<string, number>>,
): number {
	let dot = 0;
	let leftNorm = 0;
	let rightNorm = 0;
	for (const value of Object.values(left)) leftNorm += value * value;
	for (const value of Object.values(right)) rightNorm += value * value;
	for (const [key, value] of Object.entries(left)) {
		dot += value * (right[key] ?? 0);
	}
	return safeDivide(dot, Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
}
