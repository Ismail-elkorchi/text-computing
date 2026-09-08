import { spawn } from "node:child_process";
import { mkdir, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { build } from "esbuild";

async function collect(dir) {
	const files = [];
	for (const entry of await readdir(dir, { withFileTypes: true })) {
		const file = path.join(dir, entry.name);
		if (entry.isDirectory()) files.push(...(await collect(file)));
		else files.push(file);
	}
	return files.sort();
}

function run(command, args) {
	return new Promise((resolve, reject) => {
		const child = spawn(command, args, { stdio: "inherit" });
		child.on("error", reject);
		child.on("exit", (code) =>
			code === 0
				? resolve()
				: reject(new Error(`${command} exited with ${code}`)),
		);
	});
}

const runtime = process.argv[2];
const files = await collect("test");
if (runtime === "node") {
	const tests = files.filter(
		(file) =>
			(file.endsWith(".test.ts") ||
				path.basename(file) === "suite.ts" ||
				file.startsWith("test/consumer/")) &&
			!/runtime\/(?:deno|bun)\.test\.ts$/.test(file),
	);
	await run(process.execPath, ["--test", "--test-concurrency=2", ...tests]);
} else if (runtime === "deno" || runtime === "bun") {
	await run(
		runtime,
		runtime === "deno"
			? [
					"test",
					"--no-lock",
					"--no-check",
					"--allow-read",
					...files.filter((file) => file.endsWith("/deno.test.ts")),
				]
			: ["test", ...files.filter((file) => file.endsWith("/bun.test.ts"))],
	);
} else if (runtime === "browser" || runtime === "workers") {
	await mkdir("dist-test", { recursive: true });
	const suffix =
		runtime === "browser"
			? "/browser-smoke.ts"
			: "/cloudflare-workers-smoke.ts";
	for (const file of files.filter((file) => file.endsWith(suffix))) {
		const outfile = `dist-test/${file.replaceAll("/", "-").replace(/\.ts$/, ".js")}`;
		await build({
			entryPoints: [file],
			outfile,
			bundle: true,
			format: "esm",
			platform: "browser",
			target: "es2024",
			logLevel: "silent",
			define: {
				"import.meta.url": JSON.stringify(
					`https://text-computing.invalid/${outfile}`,
				),
			},
		});
		const source = await readFile(outfile, "utf8");
		const webGlobals = {
			Blob,
			structuredClone,
			console,
			TextEncoder,
			TextDecoder,
			URL,
			URLSearchParams,
			Request,
			Response,
			Headers,
			AbortController,
			AbortSignal,
			CompressionStream,
			DecompressionStream,
			ReadableStream,
			WritableStream,
			TransformStream,
			performance,
			setTimeout,
			clearTimeout,
			atob,
			btoa,
			crypto: globalThis.crypto,
			ArrayBuffer,
			DataView,
			Uint8Array,
			Uint16Array,
			Uint32Array,
			Int8Array,
			Int16Array,
			Int32Array,
			BigInt64Array,
			BigUint64Array,
			Float32Array,
			Float64Array,
			fetch: () => {
				throw new Error("Smoke test attempted an undeclared network request.");
			},
		};
		const module = new vm.SourceTextModule(source, {
			context: vm.createContext(webGlobals),
			identifier: outfile,
		});
		await module.link((specifier) => {
			throw new Error(
				`Smoke bundle contains an unresolved import: ${specifier}`,
			);
		});
		await module.evaluate();
		const handler = module.namespace.default;
		if (runtime === "workers" && typeof handler?.fetch === "function") {
			const response = await handler.fetch(
				new Request("https://text-computing.invalid/"),
			);
			if (!(response instanceof Response) || !response.ok) {
				throw new Error(`Worker smoke handler failed: ${file}`);
			}
			await response.text();
		}
		console.log(`${runtime}: ${file}`);
	}
} else throw new Error("Expected node, deno, bun, browser, or workers.");
