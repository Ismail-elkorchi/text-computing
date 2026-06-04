import { stableHash64 } from "@ismail-elkorchi/textfacts/hash";
import { stableStringify } from "./json.js";

export function compareText(left: string, right: string): number {
	if (left < right) return -1;
	if (left > right) return 1;
	return 0;
}

export function compareNumber(left: number, right: number): number {
	return left === right ? 0 : left < right ? -1 : 1;
}

export function stableHashValue(value: unknown): string {
	return stableHash64(stableStringify(value));
}

export function sortedUnique(values: Iterable<string>): readonly string[] {
	return Object.freeze([...new Set(values)].sort(compareText));
}

export function orderedRecord<T>(
	record: Readonly<Record<string, T>>,
): Readonly<Record<string, T>> {
	return Object.freeze(
		Object.fromEntries(
			Object.entries(record).sort(([left], [right]) =>
				compareText(left, right),
			),
		),
	);
}
