import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const { stdout } = await execFileAsync("npm", ["pack", "--dry-run", "--json"], {
	maxBuffer: 1024 * 1024 * 8,
});
const files = JSON.parse(stdout)[0].files.map((entry) => entry.path).sort();

for (const forbiddenPath of ["test/", "dist-test/", "dist/smoke/"]) {
	if (files.some((file) => file.startsWith(forbiddenPath))) {
		throw new Error(`reference pack must not publish ${forbiddenPath}`);
	}
}

for (const forbidden of [
	"TextPackManifestV1",
	"manifestVersion",
	"provides",
	"textPackResourceFamilies",
	"createTextPackResourceRegistry",
	"queryTextPackResourceRegistry",
]) {
	for (const file of files.filter(
		(entry) =>
			entry.endsWith(".js") ||
			entry.endsWith(".d.ts") ||
			entry.endsWith(".json"),
	)) {
		const content = await readFile(file, "utf8");
		if (content.includes(forbidden)) {
			throw new Error(`published artifact ${file} contains ${forbidden}`);
		}
	}
}
