import { assertEquals } from "jsr:@std/assert";
import { packageName } from "../../dist/index.js";
import { matchRules } from "../../dist/match/mod.js";

Deno.test("textrules deno import", () => {
	assertEquals(packageName, "@ismail-elkorchi/textrules");
	assertEquals(typeof matchRules, "function");
});
