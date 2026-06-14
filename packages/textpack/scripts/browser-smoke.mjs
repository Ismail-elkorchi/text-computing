import { build } from "esbuild";

const outfile = "dist-test/browser-smoke.js";
await build({
	entryPoints: ["test/runtime/browser-smoke.ts"],
	outfile,
	bundle: true,
	format: "esm",
	platform: "browser",
	target: "es2024",
	logLevel: "silent",
});
await import(new URL(`../${outfile}`, import.meta.url));
