import { rm } from "node:fs/promises";

const target = process.argv[2];

if (target === undefined || target.length === 0) {
	throw new Error("clean-build-output requires a target path.");
}

await rm(target, { force: true, recursive: true });
