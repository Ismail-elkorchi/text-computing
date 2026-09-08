/// <reference lib="deno.ns" />

import { runCompositionSmoke } from "./composition-smoke.ts";
import { runTextComputingFileBackedSmoke } from "./file-backed-smoke.ts";

Deno.test(
	"direct and pipeline composition share portable contracts",
	runCompositionSmoke,
);

Deno.test("text-computing file-backed gzip resources materialize in Deno with a fetch-style reader", async () => {
	await runTextComputingFileBackedSmoke("deno");
});
