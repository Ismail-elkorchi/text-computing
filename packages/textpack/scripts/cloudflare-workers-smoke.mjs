import { build } from "esbuild";

const outfile = "dist-test/cloudflare-workers-smoke.js";
await build({
	entryPoints: ["test/runtime/cloudflare-workers-smoke.ts"],
	outfile,
	bundle: true,
	format: "esm",
	platform: "browser",
	target: "es2024",
	logLevel: "silent",
});
await import(new URL(`../${outfile}`, import.meta.url));
