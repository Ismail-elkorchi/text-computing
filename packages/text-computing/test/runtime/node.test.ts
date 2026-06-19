import test from "node:test";
import { runTextComputingFileBackedSmoke } from "./file-backed-smoke.ts";

test("text-computing file-backed gzip resources materialize in Node with a fetch-style reader", async () => {
	await runTextComputingFileBackedSmoke("node");
});
