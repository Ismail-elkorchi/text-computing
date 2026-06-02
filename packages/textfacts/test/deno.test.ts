import { assertDeepEqual, assertEqual, assertOk } from "./_support/assert.ts";
import { registerTests } from "./suite.ts";

const deno = (
  globalThis as { Deno?: { test: (name: string, fn: () => void | Promise<void>) => void } }
).Deno;
if (!deno) throw new Error("Deno runtime not available");

registerTests({
  test: (name, fn) => deno.test(name, fn),
  assertEqual,
  assertDeepEqual,
  assertOk,
});
