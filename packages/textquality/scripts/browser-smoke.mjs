import { build } from "esbuild";

await build({
	entryPoints: ["test/runtime/browser-smoke.ts"],
	outfile: "dist-test/browser-smoke.js",
	bundle: true,
	format: "esm",
	platform: "browser",
	target: "es2024",
	logLevel: "silent",
});
