import { access, readFile, readdir } from "node:fs/promises";
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
const CODE_SKIPPED_DIRS = new Set([
  "dist",
  "dist-test",
  "node_modules",
]);
const PACKAGE_DISCOVERY_SKIPPED_DIRS = new Set([
  "dist",
  "dist-test",
  "node_modules",
]);
const REMOVED_TEXTFACTS_SOURCE_DIRS = [...LEGACY_TEXTFACTS_SUBPATHS].map((subpath) =>
  path.join("packages", "textfacts", "src", subpath),
);

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

async function collectWorkspacePackageDirs(dirPath, packageDirs) {
  const entries = await readdir(dirPath, { withFileTypes: true });
  const hasPackageJson = entries.some((entry) => entry.isFile() && entry.name === "package.json");
  if (hasPackageJson) {
    packageDirs.push(dirPath);
    return;
  }

  for (const entry of entries) {
    if (!entry.isDirectory() || PACKAGE_DISCOVERY_SKIPPED_DIRS.has(entry.name)) continue;
    await collectWorkspacePackageDirs(path.join(dirPath, entry.name), packageDirs);
  }
}

async function collectCodeFiles(dirPath, filePaths) {
  const entries = await readdir(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    if (CODE_SKIPPED_DIRS.has(entry.name)) continue;
    const entryPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      await collectCodeFiles(entryPath, filePaths);
      continue;
    }
    if (!entry.isFile()) continue;
    if (CODE_FILE_EXTENSIONS.has(path.extname(entry.name))) filePaths.push(entryPath);
  }
}

async function assertTextfactsExports(errors) {
  const packageJson = JSON.parse(
    await readFile(path.join(ROOT, "packages", "textfacts", "package.json"), "utf8"),
  );
  for (const key of Object.keys(packageJson.exports ?? {})) {
    const subpath = key.startsWith("./") ? key.slice(2) : key;
    if (LEGACY_TEXTFACTS_SUBPATHS.has(subpath)) {
      errors.push(`packages/textfacts/package.json exports removed textfacts subpath: ${key}`);
    }
  }

  const denoJson = JSON.parse(
    await readFile(path.join(ROOT, "packages", "textfacts", "deno.json"), "utf8"),
  );
  for (const key of Object.keys(denoJson.exports ?? {})) {
    const subpath = key.startsWith("./") ? key.slice(2) : key;
    if (LEGACY_TEXTFACTS_SUBPATHS.has(subpath)) {
      errors.push(`packages/textfacts/deno.json exports removed textfacts subpath: ${key}`);
    }
  }
}

async function assertRemovedTextfactsSourceDirs(errors) {
  for (const relPath of REMOVED_TEXTFACTS_SOURCE_DIRS) {
    try {
      await access(path.join(ROOT, relPath));
      errors.push(`${normalizePath(relPath)} must not exist after textfacts boundary cleanup.`);
    } catch {
      // Expected absence.
    }
  }
}

function isWithinPath(candidatePath, parentPath) {
  const relativePath = path.relative(parentPath, candidatePath);
  return (
    relativePath === "" ||
    (!relativePath.startsWith("..") && !path.isAbsolute(relativePath))
  );
}

function packageDirForPath(filePath, packageDirs) {
  return packageDirs.find((packageDir) => isWithinPath(filePath, packageDir));
}

function collectCrossPackageSourceImports(text, filePath, currentPackageDir, packageDirs) {
  const hits = [];
  const pattern = /(?:from\s+|import\s*\(\s*|import\s+)["']([^"']+)["']/g;
  for (const match of text.matchAll(pattern)) {
    const specifier = match[1];
    if (specifier === undefined || !specifier.startsWith(".")) continue;
    const resolvedPath = path.resolve(path.dirname(filePath), specifier);
    const targetPackageDir = packageDirForPath(resolvedPath, packageDirs);
    if (targetPackageDir === undefined || targetPackageDir === currentPackageDir) continue;
    if (!isWithinPath(resolvedPath, path.join(targetPackageDir, "src"))) continue;
    hits.push(specifier);
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
  let scannedCodeFiles = 0;

  await assertTextfactsExports(errors);
  await assertRemovedTextfactsSourceDirs(errors);

  const packageDirs = [];
  await collectWorkspacePackageDirs(PACKAGES_DIR, packageDirs);
  for (const packageDir of packageDirs) {
    const tsFiles = [];
    await collectTypeScriptFiles(packageDir, tsFiles);

    for (const filePath of tsFiles) {
      scannedFiles += 1;
      const text = await readFile(filePath, "utf8");
      const hits = collectCrossPackageSourceImports(text, filePath, packageDir, packageDirs);
      if (hits.length === 0) continue;
      errors.push(
        `${normalizePath(path.relative(ROOT, filePath))} imports sibling workspace source paths: ${hits.join(", ")}`,
      );
    }
  }

  const codeFiles = [];
  await collectCodeFiles(PACKAGES_DIR, codeFiles);
  await collectCodeFiles(path.join(ROOT, "tools"), codeFiles);
  for (const filePath of codeFiles) {
    scannedCodeFiles += 1;
    const text = await readFile(filePath, "utf8");
    const hits = collectLegacyTextfactsSubpathImports(text);
    if (hits.length === 0) continue;
    errors.push(
      `${normalizePath(path.relative(ROOT, filePath))} imports removed textfacts legacy subpaths: ${hits.join(", ")}`,
    );
  }

  if (errors.length > 0) {
    for (const error of errors) {
      console.error(error);
    }
    process.exit(1);
  }

  console.log(
    `Boundary check OK (${scannedFiles} package TS files, ${scannedCodeFiles} code files).`,
  );
}

await main();
