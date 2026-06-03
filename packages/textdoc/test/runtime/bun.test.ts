import { assertDeepEqual, assertEqual, assertOk } from "../_support/assert.ts";
import { registerTests } from "../suite.ts";

// @ts-expect-error Bun provides this module at runtime; package source stays ambient-free.
const { test: bunTest } = (await import("bun:test")) as {
	test: (name: string, fn: () => void | Promise<void>) => void;
};

registerTests({
	test: bunTest,
	assertEqual,
	assertDeepEqual,
	assertOk,
});
