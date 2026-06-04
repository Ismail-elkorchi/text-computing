import { expect, test } from "bun:test";
import { packageName } from "../../dist/index.js";
import { rewriteView } from "../../dist/rewrite/mod.js";

test("textrules bun import", () => {
	expect(packageName).toBe("@ismail-elkorchi/textrules");
	expect(typeof rewriteView).toBe("function");
});
