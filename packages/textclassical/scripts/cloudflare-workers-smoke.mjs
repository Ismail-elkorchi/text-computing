import { build } from "esbuild";

await build({
	entryPoints: ["test/runtime/cloudflare-workers-smoke.ts"],
	outfile: "dist-test/cloudflare-workers-smoke.js",
	bundle: true,
	format: "esm",
	platform: "browser",
	target: "es2024",
	logLevel: "silent",
});
