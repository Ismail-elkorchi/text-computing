import { expect, test } from "bun:test";
import { applyDown, compileRewrite } from "../../dist/index.js";

test("textfst final API works in Bun", () => {
	expect(applyDown(compileRewrite("bun -> bun"), "bun")[0]?.output).toBe("bun");
});
