#!/usr/bin/env node

import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);
const worker = new URL("./nlp-cold-worker.mjs", import.meta.url);
const budgets = {
	core: { durationMs: 1_500, maxRssMiB: 140 },
	lookup: { durationMs: 5_000, maxRssMiB: 300 },
};
const results = [];
const failures = [];

for (const languageTag of ["en", "fr", "ar"]) {
	for (const preset of ["core", "lookup"]) {
		const { stdout } = await run(
			process.execPath,
			[worker.pathname, languageTag, preset],
			{
				maxBuffer: 1024 * 1024,
			},
		);
		const result = JSON.parse(stdout);
		results.push(result);
		const budget = budgets[preset];
		if (result.durationMs > budget.durationMs) {
			failures.push(
				`${languageTag}/${preset} cold latency ${Math.round(result.durationMs)}ms exceeds ${budget.durationMs}ms`,
			);
		}
		if (result.maxRssMiB > budget.maxRssMiB) {
			failures.push(
				`${languageTag}/${preset} peak RSS ${Math.round(result.maxRssMiB)}MiB exceeds ${budget.maxRssMiB}MiB`,
			);
		}
	}
}

process.stdout.write(
	`${JSON.stringify({ schemaVersion: "1", budgets, results }, null, 2)}\n`,
);
for (const failure of failures)
	process.stderr.write(`Cold NLP benchmark failure: ${failure}\n`);
if (failures.length > 0) process.exitCode = 1;
