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
	"dist/store/mod.js",
	"dist/query/mod.js",
	"dist/concordance/mod.js",
	"dist/frequency/mod.js",
	"dist/ngram/mod.js",
	"dist/collocation/mod.js",
	"dist/keyness/mod.js",
	"dist/dispersion/mod.js",
	"dist/terms/mod.js",
	"dist/lexicography/mod.js",
	"dist/stylometry/mod.js",
	"dist/reuse/mod.js",
	"dist/diachronic/mod.js",
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
	"fixtures/",
	"coverage/",
]) {
	if (files.some((file) => file.startsWith(forbiddenPath))) {
		throw new Error(`pack includes forbidden path: ${forbiddenPath}`);
	}
}
