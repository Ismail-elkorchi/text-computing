import fs from "node:fs/promises";
import path from "node:path";
import { execSync } from "node:child_process";

const ROOT = process.cwd();
const REPORT_PATH = path.join(ROOT, "docs", "coherence-report.md");
const MARKDOWN_MANIFEST_PATH = path.join(ROOT, "docs", "markdown", "markdown-manifest.v1.json");
const DIST_ENTRYPOINT = path.join(ROOT, "dist", "mod.js");

const LEGACY_SUBPATHS = new Set(["all", "compare", "pack", "protocol", "schema", "toolspec"]);
const LEGACY_SOURCE_DIRS = new Set([
  "src/all",
  "src/compare",
  "src/corpus",
  "src/diff",
  "src/fingerprint",
  "src/pack",
  "src/profile",
  "src/protocol",
  "src/schema",
  "src/toolspec",
]);
const FORBIDDEN_SCHEMA_IDS = new Set(["pack-v1", "text-envelope-v1"]);

const TOOLING_ORPHAN_ALLOWLIST = new Set([
  "tools/bench/run.mjs",
  "tools/docs/markdown-manifest.mjs",
  "tools/docs/audit.mjs",
  "tools/docs/build-index.mjs",
  "tools/docs/duplication.mjs",
  "tools/docs/purpose-map-validate.mjs",
  "tools/docs/validate-manifest.mjs",
  "tools/idna/gen-tables.mjs",
  "tools/repo/audit-public-api.mjs",
  "tools/repo/audit.mjs",
  "tools/repo/entropy.mjs",
  "tools/repo/inventory.mjs",
  "tools/terminology/audit-markdown.mjs",
  "tools/terminology/render.mjs",
  "tools/terminology/validate.mjs",
]);

function normalizePath(filePath) {
  return filePath.split(path.sep).join("/");
}

async function collectFilePathsRecursive(dirPath, filePathAccumulator) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      await collectFilePathsRecursive(entryPath, filePathAccumulator);
    } else if (entry.isFile()) {
      filePathAccumulator.push(entryPath);
    }
  }
}

function isExternalLink(link) {
  return /^(https?:|mailto:|tel:|data:)/i.test(link);
}

function stripTitle(link) {
  const trimmed = link.trim();
  if (trimmed.startsWith("<") && trimmed.endsWith(">")) return trimmed.slice(1, -1);
  const spaceIdx = trimmed.indexOf(" ");
  return spaceIdx === -1 ? trimmed : trimmed.slice(0, spaceIdx);
}

function resolveMarkdownLink(sourcePath, link) {
  const dest = stripTitle(link);
  if (!dest || isExternalLink(dest)) return null;
  const [linkPath] = dest.split("#");
  if (!linkPath) return null;
  const target = linkPath.startsWith("/")
    ? path.join(ROOT, linkPath.slice(1))
    : path.resolve(path.dirname(path.join(ROOT, sourcePath)), linkPath);
  return normalizePath(path.relative(ROOT, target));
}

async function readMarkdownManifest() {
  try {
    await fs.access(MARKDOWN_MANIFEST_PATH);
  } catch {
    execSync("node tools/docs/markdown-manifest.mjs", { cwd: ROOT, stdio: "ignore" });
  }
  const text = await fs.readFile(MARKDOWN_MANIFEST_PATH, "utf8");
  return JSON.parse(text);
}

function moduleNameFromExportTarget(target) {
  if (target.startsWith("./src/") && target.endsWith("/mod.ts")) {
    return normalizePath(target.slice("./src/".length, -"/mod.ts".length));
  }
  if (target.startsWith("./dist/src/") && target.endsWith("/mod.js")) {
    return normalizePath(target.slice("./dist/src/".length, -"/mod.js".length));
  }
  return null;
}

async function evalExportClosure(errors) {
  const pkg = JSON.parse(await fs.readFile(path.join(ROOT, "package.json"), "utf8"));
  const deno = JSON.parse(await fs.readFile(path.join(ROOT, "deno.json"), "utf8"));
  const modText = await fs.readFile(path.join(ROOT, "mod.ts"), "utf8");

  const pkgExports = Object.keys(pkg.exports ?? {});
  const denoExports = Object.keys(deno.exports ?? {});
  const packageExportModules = new Set();
  const denoExportModules = new Set();

  for (const key of pkgExports) {
    const subpath = key.startsWith("./") ? key.slice(2) : key;
    if (LEGACY_SUBPATHS.has(subpath)) {
      errors.push(`Package export retains removed textfacts subpath: ${key}`);
    }
    if (key === ".") {
      await fs.access(path.join(ROOT, "mod.ts")).catch(() => errors.push("Package root export missing mod.ts"));
      continue;
    }
    if (!key.startsWith("./")) continue;
    const exportTarget = pkg.exports[key]?.import;
    const moduleName = moduleNameFromExportTarget(exportTarget ?? "");
    if (moduleName) packageExportModules.add(moduleName);
    const entry = path.join(ROOT, "src", subpath, "mod.ts");
    await fs.access(entry).catch(() => errors.push(`Package export missing source entrypoint: ${key}`));
  }

  for (const [key, target] of Object.entries(deno.exports ?? {})) {
    const subpath = key.startsWith("./") ? key.slice(2) : key;
    if (LEGACY_SUBPATHS.has(subpath)) {
      errors.push(`Deno export retains removed textfacts subpath: ${key}`);
    }
    await fs.access(path.join(ROOT, target)).catch(() => errors.push(`Deno export missing source entrypoint: ${target}`));
    const moduleName = moduleNameFromExportTarget(target);
    if (moduleName) denoExportModules.add(moduleName);
  }

  const reExports = [...modText.matchAll(/export\s+\*\s+from\s+["']([^"']+)["']/g)].map(
    (match) => match[1],
  );
  const rootExportModules = new Set();
  for (const rel of reExports) {
    await fs
      .access(path.join(ROOT, rel))
      .catch(() => errors.push(`mod.ts re-export missing source entrypoint: ${rel}`));
    const moduleName = moduleNameFromExportTarget(rel);
    if (moduleName) rootExportModules.add(moduleName);
  }

  for (const legacyDir of LEGACY_SOURCE_DIRS) {
    try {
      await fs.access(path.join(ROOT, legacyDir));
      errors.push(`Removed legacy source directory still exists: ${legacyDir}`);
    } catch {
      // Expected absence.
    }
  }

  const srcFiles = [];
  await collectFilePathsRecursive(path.join(ROOT, "src"), srcFiles);
  const srcModules = srcFiles
    .filter((file) => path.basename(file) === "mod.ts")
    .map((file) => normalizePath(path.relative(path.join(ROOT, "src"), file)).replace(/\/mod\.ts$/, ""));
  const exportCoverage = new Set([...packageExportModules, ...denoExportModules, ...rootExportModules]);
  const moduleIslands = srcModules.filter((name) => !exportCoverage.has(name));
  if (moduleIslands.length > 0) {
    errors.push(`Module islands without public package/root export: ${moduleIslands.join(", ")}`);
  }

  return {
    pkgExportCount: pkgExports.length,
    denoExportCount: denoExports.length,
    modReExportCount: reExports.length,
    moduleCount: srcModules.length,
    exportIslands: moduleIslands.length,
    removedLegacySubpaths: LEGACY_SUBPATHS.size,
  };
}

async function evalSchemaClosure(errors, markdownManifest) {
  const schemaDir = path.join(ROOT, "schemas");
  const files = (await fs.readdir(schemaDir)).filter((name) => name.endsWith(".schema.json"));
  const schemaIds = files.map((file) => file.replace(/\.schema\.json$/, ""));
  for (const id of schemaIds) {
    if (FORBIDDEN_SCHEMA_IDS.has(id)) {
      errors.push(`Removed broad textfacts schema still exists: ${id}`);
    }
  }

  const docSchemaIds = new Set();
  for (const entry of markdownManifest.files ?? []) {
    for (const link of entry.outboundLinks ?? []) {
      const resolved = resolveMarkdownLink(entry.path, link);
      if (resolved?.startsWith("schemas/") && resolved.endsWith(".schema.json")) {
        docSchemaIds.add(resolved.replace(/^schemas\//, "").replace(/\.schema\.json$/, ""));
      }
    }
  }

  return {
    schemaFileCount: files.length,
    docSchemaCount: docSchemaIds.size,
  };
}

async function evalToolingReferenceClosure(errors, markdownManifest) {
  const pkg = JSON.parse(await fs.readFile(path.join(ROOT, "package.json"), "utf8"));
  const scriptValues = Object.values(pkg.scripts ?? {});

  const linkedPaths = new Set();
  for (const entry of markdownManifest.files ?? []) {
    for (const link of entry.outboundLinks ?? []) {
      const resolved = resolveMarkdownLink(entry.path, link);
      if (resolved) linkedPaths.add(resolved);
    }
  }

  const toolFiles = [];
  await collectFilePathsRecursive(path.join(ROOT, "tools"), toolFiles);
  const toolScripts = toolFiles
    .filter((file) => /\.(mjs|js|ts)$/.test(file))
    .map((file) => normalizePath(path.relative(ROOT, file)))
    .sort((a, b) => a.localeCompare(b));

  const orphanTools = [];
  for (const toolPath of toolScripts) {
    if (TOOLING_ORPHAN_ALLOWLIST.has(toolPath)) continue;
    const inScripts = scriptValues.some((value) => value.includes(toolPath));
    const inDocs = linkedPaths.has(toolPath);
    if (!inScripts && !inDocs) orphanTools.push(toolPath);
  }

  if (orphanTools.length > 0) {
    errors.push(`Orphan tool scripts: ${orphanTools.join(", ")}`);
  }

  return {
    toolScriptCount: toolScripts.length,
    orphanTools: orphanTools.length,
  };
}

function renderReport(summary) {
  return [
    "# Coherence Report",
    "",
    "_Generated by `node tools/repo/audit.mjs --write`._",
    "",
    "## Summary",
    `- Package exports: ${summary.pkgExportCount}`,
    `- Deno exports: ${summary.denoExportCount}`,
    `- mod.ts re-exports: ${summary.modReExportCount}`,
    `- src modules: ${summary.moduleCount} (islands: ${summary.exportIslands})`,
    `- Removed legacy subpaths enforced: ${summary.removedLegacySubpaths}`,
    `- Schemas: ${summary.schemaFileCount} files`,
    `- Schemas referenced by docs: ${summary.docSchemaCount}`,
    `- Tool scripts: ${summary.toolScriptCount} (orphans: ${summary.orphanTools})`,
    "",
    "## Notes",
    "- This report is committed to the repo so reviewers can diff changes.",
    "- The repo audit enforces the textfacts kernel boundary by rejecting removed broad exports and source directories.",
  ].join("\n");
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const errors = [];

  await fs.access(DIST_ENTRYPOINT).catch(() => {
    throw new Error("dist/mod.js not found. Run `npm run build` first.");
  });

  const markdownManifest = await readMarkdownManifest();
  const summary = {
    ...(await evalExportClosure(errors)),
    ...(await evalSchemaClosure(errors, markdownManifest)),
    ...(await evalToolingReferenceClosure(errors, markdownManifest)),
  };

  const report = renderReport(summary);
  if (args.has("--write")) {
    await fs.writeFile(REPORT_PATH, report, "utf8");
  } else {
    const existing = await fs.readFile(REPORT_PATH, "utf8").catch(() => "");
    if (existing !== report) {
      errors.push("Coherence report out of date. Run `node tools/repo/audit.mjs --write`.");
    }
  }

  if (errors.length > 0) {
    for (const error of errors) console.error(error);
    console.error(
      `repo:audit summary: exports=${summary.pkgExportCount}/${summary.denoExportCount} schemas=${summary.schemaFileCount} tools=${summary.toolScriptCount}`,
    );
    process.exit(1);
  }

  console.log(
    `repo:audit summary: exports=${summary.pkgExportCount}/${summary.denoExportCount} schemas=${summary.schemaFileCount} tools=${summary.toolScriptCount}`,
  );
}

await main();
