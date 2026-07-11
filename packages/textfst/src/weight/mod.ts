export type SemiringName = "boolean" | "tropical" | "log";

export interface Semiring {
	readonly name: SemiringName;
	readonly zero: number;
	readonly one: number;
	readonly plus: (left: number, right: number) => number;
	readonly times: (left: number, right: number) => number;
	readonly compare: (left: number, right: number) => number;
}

const booleanSemiring: Semiring = Object.freeze({
	name: "boolean",
	zero: Number.POSITIVE_INFINITY,
	one: 0,
	plus: (left: number, right: number) => Math.min(left, right),
	times: (left: number, right: number) => left + right,
	compare: (left: number, right: number) => left - right,
});

const tropicalSemiring: Semiring = Object.freeze({
	name: "tropical",
	zero: Number.POSITIVE_INFINITY,
	one: 0,
	plus: (left: number, right: number) => Math.min(left, right),
	times: (left: number, right: number) => left + right,
	compare: (left: number, right: number) => left - right,
});

const logSemiring: Semiring = Object.freeze({
	name: "log",
	zero: Number.POSITIVE_INFINITY,
	one: 0,
	plus: (left: number, right: number) => {
		if (left === Number.POSITIVE_INFINITY) return right;
		if (right === Number.POSITIVE_INFINITY) return left;
		const minimum = Math.min(left, right);
		return (
			minimum - Math.log(Math.exp(minimum - left) + Math.exp(minimum - right))
		);
	},
	times: (left: number, right: number) => left + right,
	compare: (left: number, right: number) => left - right,
});

export function getSemiring(name: SemiringName): Semiring {
	if (name === "boolean") return booleanSemiring;
	if (name === "tropical") return tropicalSemiring;
	return logSemiring;
}

export function assertWeight(
	value: number | undefined,
	semiring: SemiringName,
): number {
	const weight = value ?? 0;
	if (!Number.isFinite(weight) || (semiring !== "log" && weight < 0)) {
		throw new TypeError(
			semiring === "log"
				? "log weights must be finite real numbers."
				: `${semiring} weights must be finite non-negative numbers.`,
		);
	}
	return weight;
}

export function combineWeights(
	semiringName: SemiringName,
	left: number | undefined,
	right: number | undefined,
): number | undefined {
	const semiring = getSemiring(semiringName);
	const combined = semiring.times(left ?? semiring.one, right ?? semiring.one);
	return semiringName === "boolean" ? undefined : combined;
}

export function compareWeights(
	semiringName: SemiringName,
	left: number | undefined,
	right: number | undefined,
): number {
	const semiring = getSemiring(semiringName);
	return semiring.compare(left ?? semiring.one, right ?? semiring.one);
}

export interface WeightedPath {
	readonly weight?: number;
}

export function rankWeightedPaths<T extends WeightedPath>(
	semiring: SemiringName,
	paths: readonly T[],
): T[] {
	return [...paths].sort((left, right) =>
		compareWeights(semiring, left.weight, right.weight),
	);
}
