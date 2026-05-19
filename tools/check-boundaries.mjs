import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const PACKAGES_DIR = path.join(ROOT, "packages");
const LEGACY_TEXTFACTS_SUBPATHS = new Set([
  "all",
  "compare",
  "pack",
  "protocol",
  "schema",
  "toolspec",
]);
const CODE_FILE_EXTENSIONS = new Set([".js", ".mjs", ".ts", ".mts"]);
const SOURCE_IMPORT_SKIPPED_DIRS = new Set(["dist", "dist-test", "node_modules"]);
const PRODUCTION_CODE_SKIPPED_DIRS = new Set([
  "dist",
  "dist-test",
  "node_modules",
  "docs",
  "test",
  "testdata",
]);

function normalizePath(filePath) {
  return filePath.split(path.sep).join("/");
}

async function collectTypeScriptFiles(dirPath, filePaths) {
  const entries = await readdir(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    if (SOURCE_IMPORT_SKIPPED_DIRS.has(entry.name)) continue;
    const entryPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      await collectTypeScriptFiles(entryPath, filePaths);
    } else if (entry.isFile() && entry.name.endsWith(".ts")) {
      filePaths.push(entryPath);
    }
  }
}

async function collectCodeFiles(dirPath, filePaths) {
  const entries = await readdir(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    if (PRODUCTION_CODE_SKIPPED_DIRS.has(entry.name)) continue;
    const entryPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      await collectCodeFiles(entryPath, filePaths);
      continue;
    }
    if (!entry.isFile()) continue;
    if (CODE_FILE_EXTENSIONS.has(path.extname(entry.name))) filePaths.push(entryPath);
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

function collectLegacyTextfactsSubpathImports(text) {
  const hits = new Set();
  const barePattern =
    /(?:from\s+|import\s*\(\s*)["']@ismail-elkorchi\/textfacts\/([^/"']+)(?:\/[^"']*)?["']/g;
  for (const match of text.matchAll(barePattern)) {
    const subpath = match[1];
    if (subpath !== undefined && LEGACY_TEXTFACTS_SUBPATHS.has(subpath)) {
      hits.add(`@ismail-elkorchi/textfacts/${subpath}`);
    }
  }

  const sourcePathPattern = /(?:from\s+|import\s*\(\s*)["'][^"']*textfacts\/src\/([^/"']+)(?:\/[^"']*)?["']/g;
  for (const match of text.matchAll(sourcePathPattern)) {
    const subpath = match[1];
    if (subpath !== undefined && LEGACY_TEXTFACTS_SUBPATHS.has(subpath)) {
      hits.add(`textfacts/src/${subpath}`);
    }
  }

  return [...hits].sort();
}

async function main() {
  const errors = [];
  let scannedFiles = 0;
  let scannedProductionFiles = 0;

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

  const productionFiles = [];
  await collectCodeFiles(PACKAGES_DIR, productionFiles);
  await collectCodeFiles(path.join(ROOT, "tools"), productionFiles);
  for (const filePath of productionFiles) {
    scannedProductionFiles += 1;
    const text = await readFile(filePath, "utf8");
    const hits = collectLegacyTextfactsSubpathImports(text);
    if (hits.length === 0) continue;
    errors.push(
      `${normalizePath(path.relative(ROOT, filePath))} imports frozen textfacts legacy subpaths: ${hits.join(", ")}`,
    );
  }

  if (errors.length > 0) {
    for (const error of errors) {
      console.error(error);
    }
    process.exit(1);
  }

  console.log(
    `Boundary check OK (${scannedFiles} package TS files, ${scannedProductionFiles} production code files).`,
  );
}

await main();
