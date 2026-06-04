import { rm } from "node:fs/promises";

const target = process.argv[2];
if (!target || target === "." || target === "/" || target.includes("..")) {
	throw new Error("refusing to clean unsafe build output path");
}

await rm(target, { recursive: true, force: true });
