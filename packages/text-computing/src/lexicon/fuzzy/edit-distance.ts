export function boundedEditDistance(
	left: string,
	right: string,
	maxDistance: number,
): number | undefined {
	if (!Number.isInteger(maxDistance) || maxDistance < 0) {
		throw new TypeError("maxDistance must be a non-negative integer.");
	}
	const leftChars = Array.from(left);
	const rightChars = Array.from(right);
	if (Math.abs(leftChars.length - rightChars.length) > maxDistance) {
		return undefined;
	}
	let previous = Array.from(
		{ length: rightChars.length + 1 },
		(_value, index) => index,
	);
	for (let leftIndex = 0; leftIndex < leftChars.length; leftIndex += 1) {
		const current = [leftIndex + 1];
		let rowMin = current[0] ?? 0;
		for (let rightIndex = 0; rightIndex < rightChars.length; rightIndex += 1) {
			const cost = leftChars[leftIndex] === rightChars[rightIndex] ? 0 : 1;
			const insertion = (current[rightIndex] ?? 0) + 1;
			const deletion = (previous[rightIndex + 1] ?? 0) + 1;
			const substitution = (previous[rightIndex] ?? 0) + cost;
			const value = Math.min(insertion, deletion, substitution);
			current[rightIndex + 1] = value;
			rowMin = Math.min(rowMin, value);
		}
		if (rowMin > maxDistance) return undefined;
		previous = current;
	}
	const distance = previous[rightChars.length] ?? 0;
	return distance <= maxDistance ? distance : undefined;
}
