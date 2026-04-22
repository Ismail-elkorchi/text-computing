import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import Ajv from "ajv";

const ROOT = process.cwd();
const JSON_PATH = path.join(ROOT, "docs", "specs", "support-status.v1.json");
const MARKDOWN_PATH = path.join(ROOT, "docs", "specs", "support-status.md");
const SCHEMA_PATH = path.join(ROOT, "schemas", "support-status-v1.schema.json");
const README_PATH = path.join(ROOT, "README.md");

function renderStatusTable(
  heading,
  label,
  rows,
) {
  const lines = [`## ${heading}`, "", `| ${label} | Status | Scope |`, "| --- | --- | --- |"];
  for (const row of rows) {
    const id = "name" in row ? row.name : row.id;
    lines.push(`| \`${id}\` | \`${row.status}\` | ${row.scope} |`);
  }
  return lines.join("\n");
}

function renderMarkdown(statusDocument) {
  return [
    "# Support status",
    "",
    "This document is generated from `docs/specs/support-status.v1.json`. Do not edit it by hand; update",
    "the JSON source and rerun `node tools/validate-support-status.mjs --write` if the canonical status",
    "changes.",
    "",
    "## Status labels",
    "",
    "- `implemented` — public API and executable proof exist for the declared scope.",
    "- `readiness-only` — frozen artifacts exist, but behavior is not implemented yet.",
    "- `absent` — only a scaffold exists or no ratified public surface exists yet.",
    "",
    renderStatusTable("Package status", "Package", statusDocument.packages),
    "",
    renderStatusTable("Task status", "Task", statusDocument.tasks),
    "",
  ].join("\n");
}

async function readWorkspacePackageNames() {
  const packageDir = path.join(ROOT, "packages");
  const entries = await readdir(packageDir, { withFileTypes: true });
  const names = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const packageJsonPath = path.join(packageDir, entry.name, "package.json");
    const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
    names.push(packageJson.name);
  }
  names.sort();
  return names;
}

async function main() {
  const writeMode = process.argv.includes("--write");
  const [schemaText, statusText, readmeText] = await Promise.all([
    readFile(SCHEMA_PATH, "utf8"),
    readFile(JSON_PATH, "utf8"),
    readFile(README_PATH, "utf8"),
  ]);
  const schema = JSON.parse(schemaText);
  const statusDocument = JSON.parse(statusText);

  const ajv = new Ajv({ allErrors: true, strict: false });
  const validate = ajv.compile(schema);
  if (!validate(statusDocument)) {
    for (const error of validate.errors ?? []) {
      console.error(`support status schema error: ${error.instancePath} ${error.message}`);
    }
    process.exit(1);
  }

  const workspacePackageNames = await readWorkspacePackageNames();
  const declaredPackageNames = statusDocument.packages
    .map((entry) => entry.name)
    .slice()
    .sort();

  if (declaredPackageNames.length !== new Set(declaredPackageNames).size) {
    console.error("support status package names must be unique");
    process.exit(1);
  }

  if (statusDocument.tasks.map((entry) => entry.id).length !== new Set(statusDocument.tasks.map((entry) => entry.id)).size) {
    console.error("support status task ids must be unique");
    process.exit(1);
  }

  if (JSON.stringify(workspacePackageNames) !== JSON.stringify(declaredPackageNames)) {
    console.error(
      `support status package set mismatch: workspace=${workspacePackageNames.join(", ")} declared=${declaredPackageNames.join(", ")}`,
    );
    process.exit(1);
  }

  if (!readmeText.includes("docs/specs/support-status.md")) {
    console.error("README.md must link to docs/specs/support-status.md");
    process.exit(1);
  }

  const expectedMarkdown = renderMarkdown(statusDocument);
  if (writeMode) {
    await writeFile(MARKDOWN_PATH, expectedMarkdown, "utf8");
  } else {
    const actualMarkdown = await readFile(MARKDOWN_PATH, "utf8");
    if (actualMarkdown !== expectedMarkdown) {
      console.error("docs/specs/support-status.md is out of date with support-status.v1.json");
      process.exit(1);
    }
  }

  console.log(
    `Support status artifacts OK (packages=${statusDocument.packages.length} tasks=${statusDocument.tasks.length}).`,
  );
}

await main();
