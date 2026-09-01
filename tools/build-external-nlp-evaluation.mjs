#!/usr/bin/env node

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createInterface } from "node:readline";

const inputDirectory = process.argv[2];
const outputPath = process.argv[3];
if (inputDirectory === undefined || outputPath === undefined) {
	throw new TypeError(
		"usage: node tools/build-external-nlp-evaluation.mjs <input-directory> <output-json>",
	);
}

const cutoff = "2026-06-07";
const caseCount = 100;
const sources = [
	{
		languageTag: "en",
		file: "eng.tsv.bz2",
		checksum:
			"7569850570d434b58fdbdc95415dee526fd349c3878ad98267ddac172a76e38e",
		url: "https://downloads.tatoeba.org/exports/per_language/eng/eng_sentences_detailed.tsv.bz2",
	},
	{
		languageTag: "fr",
		file: "fra.tsv.bz2",
		checksum:
			"c30cdbc1a1df461593664aed477c04305a94a0433cba5b08181da709f790eeee",
		url: "https://downloads.tatoeba.org/exports/per_language/fra/fra_sentences_detailed.tsv.bz2",
	},
	{
		languageTag: "ar",
		file: "ara.tsv.bz2",
		checksum:
			"b21453e5d213194311e0662c93701673254d1c2888d5a7a35426410a1c037c6f",
		url: "https://downloads.tatoeba.org/exports/per_language/ara/ara_sentences_detailed.tsv.bz2",
	},
];

function sha256(value) {
	return createHash("sha256").update(value).digest("hex");
}

function hasDisallowedControl(text) {
	for (let index = 0; index < text.length; index += 1) {
		const codeUnit = text.charCodeAt(index);
		if (
			codeUnit < 0x20 &&
			codeUnit !== 0x09 &&
			codeUnit !== 0x0a &&
			codeUnit !== 0x0d
		) {
			return true;
		}
	}
	return false;
}

async function verifyFile(path, expected) {
	const actual = sha256(await readFile(path));
	if (actual !== expected) {
		throw new Error(`source checksum mismatch for ${path}: ${actual}`);
	}
}

async function selectedRows(source) {
	const path = resolve(inputDirectory, source.file);
	await verifyFile(path, source.checksum);
	const decompressor = spawn("bzip2", ["-dc"], {
		stdio: ["pipe", "pipe", "inherit"],
	});
	const exitPromise = new Promise((resolveExit, reject) => {
		decompressor.once("error", reject);
		decompressor.once("close", resolveExit);
	});
	createReadStream(path).pipe(decompressor.stdin);
	const rows = [];
	const lines = createInterface({
		input: decompressor.stdout,
		crlfDelay: Infinity,
	});
	for await (const line of lines) {
		const [sentenceId, language, text, contributor, addedAt, modifiedAt] =
			line.split("\t");
		if (
			language !== { en: "eng", fr: "fra", ar: "ara" }[source.languageTag] ||
			sentenceId === undefined ||
			text === undefined ||
			contributor === undefined ||
			addedAt === undefined ||
			!/^\d{4}-\d{2}-\d{2} /u.test(addedAt) ||
			addedAt < cutoff ||
			text.length < 20 ||
			text.length > 280 ||
			hasDisallowedControl(text)
		) {
			continue;
		}
		rows.push({
			id: `tatoeba-${source.languageTag}-${sentenceId}`,
			sentenceId,
			text,
			contributor,
			addedAt,
			modifiedAt: modifiedAt === "\\N" ? null : (modifiedAt ?? null),
			rank: sha256(`${source.languageTag}:${sentenceId}`),
		});
	}
	const exitCode = await exitPromise;
	if (exitCode !== 0) throw new Error(`bzip2 exited with ${String(exitCode)}`);
	return rows
		.sort((left, right) => left.rank.localeCompare(right.rank))
		.slice(0, caseCount)
		.map(({ rank: _rank, ...row }) => row);
}

const languages = [];
for (const source of sources) {
	const documents = await selectedRows(source);
	if (documents.length !== caseCount) {
		throw new Error(
			`${source.languageTag} produced ${String(documents.length)} evaluation rows`,
		);
	}
	languages.push({
		languageTag: source.languageTag,
		source: {
			url: source.url,
			checksum: `sha256:${source.checksum}`,
		},
		documents,
	});
}

const fixture = {
	schemaVersion: "1",
	description:
		"External real-text robustness sample selected from Tatoeba detailed sentence exports.",
	licenseExpression: "CC-BY-2.0-FR",
	citation:
		"Tatoeba sentence exports; individual contributors are retained per row.",
	retrievedAt: "2026-08-31",
	selection: {
		minimumAddedAt: cutoff,
		minimumCodeUnits: 20,
		maximumCodeUnits: 280,
		ranking: "ascending SHA-256 of <languageTag>:<sentenceId>",
		countPerLanguage: caseCount,
		separation:
			"Rows added after the 2026-06-06 forge snapshot cutoff; fixture text is not a forge input.",
	},
	languages,
};

await writeFile(resolve(outputPath), `${JSON.stringify(fixture, null, 2)}\n`);
