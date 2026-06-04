import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { build } from "esbuild";

const outputDir = await mkdtemp(join(tmpdir(), "textrules-workers-"));
const outputFile = join(outputDir, "cloudflare-workers-smoke.js");

try {
	await build({
		entryPoints: ["test/runtime/cloudflare-workers-smoke.ts"],
		bundle: true,
		format: "esm",
		platform: "browser",
		outfile: outputFile,
		logLevel: "silent",
	});
	const worker = await import(new URL(`file://${outputFile}`));
	const response = await worker.default.fetch();
	if (!response.ok) throw new Error("workers smoke response was not ok");
} finally {
	await rm(outputDir, { force: true, recursive: true });
}
