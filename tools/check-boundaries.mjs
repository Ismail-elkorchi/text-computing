import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const PACKAGES_DIR = path.join(ROOT, "packages");

function normalizePath(filePath) {
  return filePath.split(path.sep).join("/");
}

async function collectTypeScriptFiles(dirPath, filePaths) {
  const entries = await readdir(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === "dist" || entry.name === "dist-test" || entry.name === "node_modules") {
      continue;
    }
    const entryPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      await collectTypeScriptFiles(entryPath, filePaths);
    } else if (entry.isFile() && entry.name.endsWith(".ts")) {
      filePaths.push(entryPath);
    }
  }
}

function collectCrossPackageSourceImports(text, currentPackageName) {
  const hits = [];
  const pattern = /from\s+["'](\.\.\/\.\.\/([^/"']+)\/src\/[^"']+)["']/g;
  for (const match of text.matchAll(pattern)) {
    const siblingPackageName = match[2];
    if (siblingPackageName === undefined || siblingPackageName === currentPackageName) continue;
    hits.push(match[1]);
  }
  return hits;
}

async function main() {
  const errors = [];
  let scannedFiles = 0;

  const packageEntries = await readdir(PACKAGES_DIR, { withFileTypes: true });
  for (const entry of packageEntries) {
    if (!entry.isDirectory()) continue;
    const packageName = entry.name;
    const packageDir = path.join(PACKAGES_DIR, packageName);
    const tsFiles = [];
    await collectTypeScriptFiles(packageDir, tsFiles);

    for (const filePath of tsFiles) {
      scannedFiles += 1;
      const text = await readFile(filePath, "utf8");
      const hits = collectCrossPackageSourceImports(text, packageName);
      if (hits.length === 0) continue;
      errors.push(
        `${normalizePath(path.relative(ROOT, filePath))} imports sibling workspace source paths: ${hits.join(", ")}`,
      );
    }
  }

  if (errors.length > 0) {
    for (const error of errors) {
      console.error(error);
    }
    process.exit(1);
  }

  console.log(`Boundary check OK (${scannedFiles} files).`);
}

await main();
