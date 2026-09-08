import { assertEquals } from "jsr:@std/assert";
import { packageName } from "@ismail-elkorchi/text-computing/rules";
import { matchRules } from "@ismail-elkorchi/text-computing/rules/match";

Deno.test("textrules deno import", () => {
	assertEquals(packageName, "@ismail-elkorchi/text-computing");
	assertEquals(typeof matchRules, "function");
});
