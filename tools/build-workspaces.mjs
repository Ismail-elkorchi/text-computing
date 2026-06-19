#!/usr/bin/env node

import { spawn } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const INVENTORY_PATH = path.join(
	ROOT,
	"docs/textpacks/generated-inventory.json",
);

function run(command, args, options = {}) {
	return new Promise((resolve, reject) => {
		const child = spawn(command, args, {
			cwd: ROOT,
			stdio: "inherit",
			...options,
		});
		child.on("error", reject);
		child.on("exit", (code, signal) => {
			if (code === 0) {
				resolve();
				return;
			}
			reject(
				new Error(
					`${command} ${args.join(" ")} failed with ${signal ?? `exit ${code}`}`,
				),
			);
		});
	});
}

async function generatedTextpackPackageDirs() {
	const inventory = JSON.parse(await readFile(INVENTORY_PATH, "utf8"));
	return inventory.packages.map((entry) =>
		path.join(ROOT, "packages/textpacks", entry.packageId),
	);
}

async function readJson(filePath) {
	return JSON.parse(await readFile(filePath, "utf8"));
}

function localDependencyNames(packageJson) {
	const dependencyBlocks = [
		packageJson.dependencies,
		packageJson.peerDependencies,
		packageJson.optionalDependencies,
		packageJson.devDependencies,
	];
	const names = new Set();
	for (const block of dependencyBlocks) {
		for (const name of Object.keys(block ?? {})) {
			if (name.startsWith("@ismail-elkorchi/")) names.add(name);
		}
	}
	return [...names].sort((left, right) => left.localeCompare(right));
}

async function packageWorkspaceRecords() {
	const packageRoot = path.join(ROOT, "packages");
	const entries = await readdir(packageRoot, { withFileTypes: true });
	const records = [];
	for (const entry of entries) {
		if (!entry.isDirectory() || entry.name === "textpacks") continue;
		const dir = path.join(packageRoot, entry.name);
		const packageJson = await readJson(path.join(dir, "package.json"));
		if (typeof packageJson.scripts?.build !== "string") continue;
		records.push({
			dir,
			name: packageJson.name,
			dependencies: localDependencyNames(packageJson),
		});
	}
	return records;
}

function orderedPackageDirs(records, label) {
	const byName = new Map(records.map((record) => [record.name, record]));
	const ordered = [];
	const visiting = new Set();
	const visited = new Set();

	function visit(record) {
		if (visited.has(record.name)) return;
		if (visiting.has(record.name)) {
			throw new Error(`${label} dependency cycle at ${record.name}`);
		}
		visiting.add(record.name);
		for (const dependency of record.dependencies) {
			const dependencyRecord = byName.get(dependency);
			if (dependencyRecord !== undefined) visit(dependencyRecord);
		}
		visiting.delete(record.name);
		visited.add(record.name);
		ordered.push(record.dir);
	}

	for (const record of records.sort((left, right) =>
		left.name.localeCompare(right.name),
	)) {
		visit(record);
	}

	return ordered;
}

async function orderedGeneratedTextpackPackageDirs() {
	const packageDirs = await generatedTextpackPackageDirs();
	const records = [];
	for (const packageDir of packageDirs) {
		const packageJson = await readJson(path.join(packageDir, "package.json"));
		records.push({
			dir: packageDir,
			name: packageJson.name,
			dependencies: Object.keys(packageJson.dependencies ?? {}),
		});
	}

	return orderedPackageDirs(records, "Generated textpack");
}

await run("npm", ["run", "-s", "forge:build"]);

for (const packageDir of orderedPackageDirs(
	await packageWorkspaceRecords(),
	"Workspace",
)) {
	await run("npm", ["--prefix", packageDir, "run", "-s", "build"]);
}

for (const packageDir of await orderedGeneratedTextpackPackageDirs()) {
	await run("npm", ["--prefix", packageDir, "run", "-s", "build"]);
}
