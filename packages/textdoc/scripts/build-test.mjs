import { promises as fs } from "node:fs";
import path from "node:path";
import { build } from "esbuild";

const workspaceRoot = process.cwd();
const testRootDir = path.join(workspaceRoot, "test");
const buildEntryPaths = [
	path.join(testRootDir, "runtime", "node.test.ts"),
	path.join(testRootDir, "suite.ts"),
];

async function collectTypeScriptEntryPathsRecursive(dirPath) {
	const exists = await fs
		.access(dirPath)
		.then(() => true)
		.catch(() => false);
	if (!exists) return;
	const entries = await fs.readdir(dirPath, { withFileTypes: true });
	for (const entry of entries) {
		const entryPath = path.join(dirPath, entry.name);
		if (entry.isDirectory()) {
			await collectTypeScriptEntryPathsRecursive(entryPath);
		} else if (entry.isFile() && entry.name.endsWith(".ts")) {
			buildEntryPaths.push(entryPath);
		}
	}
}

await collectTypeScriptEntryPathsRecursive(path.join(testRootDir, "_support"));
await collectTypeScriptEntryPathsRecursive(path.join(testRootDir, "runtime"));
await collectTypeScriptEntryPathsRecursive(path.join(testRootDir, "types"));

await build({
	entryPoints: buildEntryPaths,
	outdir: path.join(workspaceRoot, "dist-test"),
	outbase: workspaceRoot,
	platform: "neutral",
	format: "esm",
	target: "es2024",
	sourcemap: true,
	bundle: false,
});
