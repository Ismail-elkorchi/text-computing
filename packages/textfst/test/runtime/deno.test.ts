/// <reference lib="deno.ns" />

import { applyDown, compileRegex } from "../../dist/index.js";

Deno.test("textfst final API works in Deno", () => {
	if (applyDown(compileRegex("deno"), "deno")[0]?.output !== "deno") {
		throw new Error("deno runtime smoke failed");
	}
});
