import nodeAssert from "node:assert/strict";

export function assertEqual<T>(actual: T, expected: T, message?: string): void {
	nodeAssert.equal(actual, expected, message);
}

export function assertDeepEqual(
	actual: unknown,
	expected: unknown,
	message?: string,
): void {
	nodeAssert.deepEqual(actual, expected, message);
}

export function assertOk(value: unknown, message?: string): asserts value {
	nodeAssert.ok(value, message);
}
