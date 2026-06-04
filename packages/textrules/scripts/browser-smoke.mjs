import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { build } from "esbuild";

const outputDir = await mkdtemp(join(tmpdir(), "textrules-browser-"));
const outputFile = join(outputDir, "browser-smoke.js");

try {
	await build({
		entryPoints: ["test/runtime/browser-smoke.ts"],
		bundle: true,
		format: "esm",
		platform: "browser",
		outfile: outputFile,
		logLevel: "silent",
	});
	await import(new URL(`file://${outputFile}`));
} finally {
	await rm(outputDir, { force: true, recursive: true });
}
