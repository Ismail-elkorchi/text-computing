import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const { stdout } = await execFileAsync("npm", ["pack", "--dry-run", "--json"], {
	maxBuffer: 1024 * 1024 * 8,
});
const packs = JSON.parse(stdout);
const files = packs[0].files.map((entry) => entry.path).sort();

for (const forbiddenPath of [
	"dist-test/",
	"dist/smoke/",
	"src/",
	"test/",
	"scripts/",
	"schemas/",
	"coverage/",
]) {
	if (files.some((file) => file.startsWith(forbiddenPath))) {
		throw new Error(`pack includes forbidden path: ${forbiddenPath}`);
	}
}

for (const forbiddenName of [
	"legacy",
	"compat",
	"loadTextPackFromFileSystem",
	"packages/textpack-",
	"normalization.*",
]) {
	for (const file of files.filter(
		(entry) => entry.endsWith(".d.ts") || entry.endsWith(".js"),
	)) {
		const content = await readFile(file, "utf8");
		if (content.includes(forbiddenName)) {
			throw new Error(
				`pack artifact ${file} contains forbidden name ${forbiddenName}`,
			);
		}
	}
}
