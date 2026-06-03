import { rm } from "node:fs/promises";

const target = process.argv[2];
if (!target) throw new Error("clean-build-output requires an output path");
await rm(target, { force: true, recursive: true });
