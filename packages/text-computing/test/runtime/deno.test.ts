/// <reference lib="deno.ns" />

import { runTextComputingFileBackedSmoke } from "./file-backed-smoke.ts";

Deno.test("text-computing file-backed gzip resources materialize in Deno with a fetch-style reader", async () => {
	await runTextComputingFileBackedSmoke("deno");
});
