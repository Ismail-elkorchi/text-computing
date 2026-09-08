import { expect, test } from "bun:test";
import { packageName } from "@ismail-elkorchi/text-computing/rules";
import { rewriteView } from "@ismail-elkorchi/text-computing/rules/rewrite";

test("textrules bun import", () => {
	expect(packageName).toBe("@ismail-elkorchi/text-computing");
	expect(typeof rewriteView).toBe("function");
});
