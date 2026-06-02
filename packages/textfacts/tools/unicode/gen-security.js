import fs from "node:fs/promises";
import path from "node:path";

const UNICODE_VERSION = "17.0.0";
const SECURITY_BASE = `https://www.unicode.org/Public/${UNICODE_VERSION}/security/`;

const ROOT = process.cwd();
const SPEC_DIR = path.join(ROOT, "specs", "unicode", UNICODE_VERSION, "security");
const CACHE_DIR = path.join(ROOT, "tools", "unicode", "ucd", UNICODE_VERSION, "security");
const OUT_DIR = path.join(ROOT, "src", "security", "generated");

const FILES = {
  confusables: "confusables.txt",
};

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function fetchFile(fileName) {
  const specPath = path.join(SPEC_DIR, fileName);
  try {
    return await fs.readFile(specPath, "utf8");
  } catch {}

  const cachePath = path.join(CACHE_DIR, fileName);
  try {
    return await fs.readFile(cachePath, "utf8");
  } catch {
    const url = `${SECURITY_BASE}${fileName}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status}`);
    }
    return await response.text();
  }
}

function parseConfusables(text) {
  const mappings = [];
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const cleaned = line.split("#")[0].trim();
    if (!cleaned) continue;
    const parts = cleaned.split(";").map((part) => part.trim());
    if (parts.length < 2) continue;
    const sourceHex = parts[0];
    const targetHex = parts[1];
    const source = Number.parseInt(sourceHex, 16);
    if (!Number.isFinite(source)) continue;
    const target = targetHex
      .split(/\s+/)
      .filter(Boolean)
      .map((hex) => Number.parseInt(hex, 16));
    if (target.length === 0) continue;
    mappings.push([source, target]);
  }
  mappings.sort((a, b) => (a[0] ?? 0) - (b[0] ?? 0));
  return mappings;
}

function generateMappingTable(name, mappings) {
  const codePoints = [];
  const offsets = [0];
  const data = [];
  let offset = 0;
  for (const [cp, target] of mappings) {
    codePoints.push(cp);
    data.push(...target);
    offset += target.length;
    offsets.push(offset);
  }
  return `// Generated from Unicode ${UNICODE_VERSION} ${name}.\n// DO NOT EDIT MANUALLY.\n\nexport const CONFUSABLES_CODEPOINTS = new Int32Array([\n${formatArray(codePoints)}\n]);\n\nexport const CONFUSABLES_OFFSETS = new Int32Array([\n${formatArray(offsets)}\n]);\n\nexport const CONFUSABLES_DATA = new Int32Array([\n${formatArray(data)}\n]);\n`;
}

function formatArray(values) {
  const rows = [];
  for (let i = 0; i < values.length; i += 12) {
    rows.push(`  ${values.slice(i, i + 12).join(", ")}`);
  }
  return rows.join(",\n");
}

async function main() {
  const confusableText = await fetchFile(FILES.confusables);
  const mappings = parseConfusables(confusableText);

  await ensureDir(OUT_DIR);
  await fs.writeFile(
    path.join(OUT_DIR, "confusables.ts"),
    generateMappingTable("confusables.txt", mappings),
    "utf8",
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
