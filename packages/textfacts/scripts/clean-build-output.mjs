import { rm } from "node:fs/promises";
import path from "node:path";

const workspaceRoot = process.cwd();
const targets = process.argv.slice(2);
const outputDirs = targets.length > 0 ? targets : ["dist"];

for (const outputDir of outputDirs) {
  if (outputDir !== "dist" && outputDir !== "dist-test") {
    throw new Error(`Refusing to remove unsupported build output: ${outputDir}`);
  }
  await rm(path.join(workspaceRoot, outputDir), { recursive: true, force: true });
}
