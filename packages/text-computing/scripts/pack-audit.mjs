import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { build } from "esbuild";

const manifest = JSON.parse(await readFile("package.json", "utf8"));
assert.equal(manifest.name, "@ismail-elkorchi/text-computing");
assert.deepEqual(Object.keys(manifest.dependencies ?? {}), []);
const directory = await mkdtemp(
	path.join(tmpdir(), "text-computing-consumer-"),
);
try {
	const [packed] = JSON.parse(
		execFileSync(
			"npm",
			["pack", "--json", "--ignore-scripts", "--pack-destination", directory],
			{ encoding: "utf8" },
		),
	);
	const files = new Set(packed.files.map((file) => file.path));
	for (const [key, value] of Object.entries(manifest.exports)) {
		assert.ok(!key.includes("internal"), key);
		assert.ok(
			files.has(value.import.slice(2)),
			`Missing implementation for ${key}`,
		);
		assert.ok(
			files.has(value.types.slice(2)),
			`Missing declarations for ${key}`,
		);
	}
	const installed = path.join(
		directory,
		"node_modules/@ismail-elkorchi/text-computing",
	);
	await mkdir(installed, { recursive: true });
	execFileSync("tar", [
		"-xzf",
		path.join(directory, packed.filename),
		"--strip-components=1",
		"-C",
		installed,
	]);
	await writeFile(
		path.join(directory, "package.json"),
		JSON.stringify({ type: "module" }),
	);
	const subpaths = Object.keys(manifest.exports).filter(
		(key) => !key.startsWith("./onnx/"),
	);
	const consumer = subpaths
		.map(
			(key, index) =>
				`import * as module${index} from ${JSON.stringify(manifest.name + (key === "." ? "" : key.slice(1)))};\nvoid module${index};`,
		)
		.join("\n");
	await writeFile(path.join(directory, "consumer.ts"), consumer);
	execFileSync(process.execPath, ["consumer.ts"], {
		cwd: directory,
		stdio: "inherit",
	});
	execFileSync(
		process.execPath,
		[
			path.resolve("../../node_modules/typescript/bin/tsc"),
			"--noEmit",
			"--strict",
			"--target",
			"ES2024",
			"--module",
			"NodeNext",
			"--moduleResolution",
			"NodeNext",
			"consumer.ts",
		],
		{ cwd: directory, stdio: "inherit" },
	);
	for (const [specifier, symbol, limit] of [
		["unicode/hash", "stableHash64", 12_000],
		["document", "createDocument", 80_000],
		["learning/classify", "trainClassifier", 250_000],
	]) {
		const result = await build({
			stdin: {
				contents: `export { ${symbol} } from "${manifest.name}/${specifier}";`,
				resolveDir: directory,
			},
			bundle: true,
			platform: "browser",
			format: "esm",
			target: "es2024",
			minify: true,
			metafile: true,
			write: false,
		});
		const bytes = result.outputFiles[0].contents.length;
		assert.ok(bytes <= limit, `${specifier}: ${bytes} bytes exceeds ${limit}`);
		assert.ok(
			Object.keys(result.metafile.inputs).every(
				(file) => !/onnxruntime|textpacks|onnx-(node|web)/.test(file),
			),
			`${specifier} imports an unrelated backend or pack`,
		);
		console.log(
			`${specifier}: ${bytes} bundled bytes; no model runtime or pack dependency`,
		);
	}
	console.log(
		`Package audit OK (${subpaths.length} isolated public imports and declarations).`,
	);
} finally {
	await rm(directory, { recursive: true, force: true });
}
