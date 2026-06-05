import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const { stdout } = await execFileAsync("npm", ["pack", "--dry-run", "--json"], {
	maxBuffer: 1024 * 1024 * 8,
});
const packs = JSON.parse(stdout);
const files = packs[0].files.map((entry) => entry.path).sort();

const required = [
	"dist/index.js",
	"dist/document/mod.js",
	"dist/corpus/mod.js",
	"dist/ocr/mod.js",
	"dist/noisy/mod.js",
	"dist/readability/mod.js",
	"dist/style/mod.js",
	"dist/annotation/mod.js",
	"dist/report/mod.js",
	"README.md",
	"CHANGELOG.md",
];

for (const file of required) {
	if (!files.includes(file)) {
		throw new Error(`pack is missing required file: ${file}`);
	}
}

for (const forbiddenPath of [
	"dist-test/",
	"dist/smoke/",
	"dist/tmp/",
	"src/",
	"test/",
	"scripts/",
	"resources/",
	"fixtures/",
	"profiles/",
	"dashboard/",
	"coverage/",
]) {
	if (files.some((file) => file.startsWith(forbiddenPath))) {
		throw new Error(`pack includes forbidden path: ${forbiddenPath}`);
	}
}
