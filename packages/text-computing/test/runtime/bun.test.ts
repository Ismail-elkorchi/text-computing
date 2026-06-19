import { test } from "bun:test";
import { runTextComputingFileBackedSmoke } from "./file-backed-smoke.ts";

test("text-computing file-backed gzip resources materialize in Bun with a fetch-style reader", async () => {
	await runTextComputingFileBackedSmoke("bun");
});
