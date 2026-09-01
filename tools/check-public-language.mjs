import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const INCLUDED_ROOTS = [
	"README.md",
	"CONTRIBUTING.md",
	"docs",
	"schemas",
	"fixtures",
	"packages",
	".github",
];
const SKIPPED_DIRS = new Set([
	".git",
	"dist",
	"dist-test",
	"node_modules",
	"testdata",
]);
const SCANNED_EXTENSIONS = new Set([
	".json",
	".md",
	".mjs",
	".ts",
	".yml",
	".yaml",
]);
const BLOCKED_PUBLIC_LANGUAGE_TERMS = [
	["b", "est"].join(""),
	["b", "etter"].join(""),
	["sup", "erior"].join(""),
	["world", "-", "class"].join(""),
	["world", " ", "class"].join(""),
	["state", "-", "of", "-", "the", "-", "art"].join(""),
	["state", " ", "of", " ", "the", " ", "art"].join(""),
	["sur", "pass"].join(""),
];
const EXTERNAL_TEXT_FIXTURES = new Set([
	"fixtures/nlp-benchmarks/external-tatoeba-v1.json",
]);

function normalizePath(filePath) {
	return filePath.split(path.sep).join("/");
}

function termPattern(term) {
	const escaped = term
		.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
		.replace(/\\ /g, "\\s+");
	return new RegExp(`(^|[^a-z0-9-])${escaped}([^a-z0-9-]|$)`, "giu");
}

async function collectFiles(entryPath, output) {
	const absolutePath = path.join(ROOT, entryPath);
	const statEntries = await readdir(absolutePath, { withFileTypes: true });
	for (const entry of statEntries) {
		if (entry.isDirectory() && SKIPPED_DIRS.has(entry.name)) continue;
		const relativePath = path.join(entryPath, entry.name);
		if (entry.isDirectory()) {
			await collectFiles(relativePath, output);
			continue;
		}
		if (!entry.isFile()) continue;
		if (!SCANNED_EXTENSIONS.has(path.extname(entry.name))) continue;
		output.push(normalizePath(relativePath));
	}
}

async function collectIncludedFiles() {
	const files = [];
	for (const root of INCLUDED_ROOTS) {
		const absolutePath = path.join(ROOT, root);
		const entry = await readdir(path.dirname(absolutePath), {
			withFileTypes: true,
		}).then((entries) =>
			entries.find((candidate) => candidate.name === path.basename(root)),
		);
		if (entry === undefined) continue;
		if (entry.isFile()) {
			files.push(root);
		} else if (entry.isDirectory()) {
			await collectFiles(root, files);
		}
	}
	return files.sort();
}

function authoredText(file, text) {
	if (!EXTERNAL_TEXT_FIXTURES.has(file)) return text;
	const fixture = JSON.parse(text);
	for (const language of fixture.languages ?? []) {
		for (const document of language.documents ?? []) document.text = "";
	}
	return JSON.stringify(fixture);
}

const blockedTerms = BLOCKED_PUBLIC_LANGUAGE_TERMS;
const patterns = blockedTerms.map((term) => [term, termPattern(term)]);
const files = await collectIncludedFiles();
const errors = [];

for (const file of files) {
	const text = authoredText(
		file,
		await readFile(path.join(ROOT, file), "utf8"),
	);
	for (const [term, pattern] of patterns) {
		for (const match of text.matchAll(pattern)) {
			errors.push(
				`${file}: blocked public language term "${term}" near index ${match.index}`,
			);
		}
	}
}

if (errors.length > 0) {
	for (const error of errors) console.error(error);
	process.exit(1);
}

console.log(`Public language scan OK (${files.length} files).`);
