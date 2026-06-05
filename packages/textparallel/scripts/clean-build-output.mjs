import { rm } from "node:fs/promises";
import path from "node:path";

const target = process.argv[2];
if (target !== "dist" && target !== "dist-test") {
	throw new Error("clean target must be dist or dist-test");
}

await rm(path.join(process.cwd(), target), { recursive: true, force: true });
