import { rm } from "node:fs/promises";

const target = process.argv[2];

if (
	target === undefined ||
	target.length === 0 ||
	target === "/" ||
	target === "."
) {
	throw new Error("refusing to remove unsafe build target");
}

await rm(target, { force: true, recursive: true });
