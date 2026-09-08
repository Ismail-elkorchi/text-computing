#!/usr/bin/env node

import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
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

await run("npm", ["--prefix", "packages/text-computing", "run", "-s", "build"]);
for (const packageDir of await generatedTextpackPackageDirs()) {
	await run("npm", ["--prefix", packageDir, "run", "-s", "build"]);
}
