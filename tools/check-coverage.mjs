import { execFileSync } from "node:child_process";
import { rm, mkdir, readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = process.cwd();
const coverageDir = path.join(root, "coverage", "v8");

const targets = [
  {
    packageName: "@ismail-elkorchi/textdoc",
    sourceSuffix: "packages/textdoc/src/index.ts",
  },
  {
    packageName: "@ismail-elkorchi/textprotocol",
    sourceSuffix: "packages/textprotocol/src/index.ts",
  },
  {
    packageName: "@ismail-elkorchi/textpack",
    sourceSuffix: "packages/textpack/src/index.ts",
  },
  {
    packageName: "@ismail-elkorchi/textpipeline",
    sourceSuffix: "packages/textpipeline/src/index.ts",
  },
  {
    packageName: "@ismail-elkorchi/textconformance",
    sourceSuffix: "packages/textconformance/src/index.ts",
  },
];

function fail(message, details) {
  console.error(message);
  if (details !== undefined) console.error(JSON.stringify(details, null, 2));
  process.exit(1);
}

function normalizeCoverageUrl(url) {
  if (!url.startsWith("file:")) return null;
  return fileURLToPath(url).split(path.sep).join("/");
}

function summarizeScript(script) {
  let coveredRanges = 0;
  let uncoveredRanges = 0;
  let maxEndOffset = 0;

  for (const fn of script.functions ?? []) {
    for (const range of fn.ranges ?? []) {
      maxEndOffset = Math.max(maxEndOffset, range.endOffset ?? 0);
      if ((range.count ?? 0) > 0) coveredRanges += 1;
      else uncoveredRanges += 1;
    }
  }

  return {
    coveredRanges,
    uncoveredRanges,
    maxEndOffset,
  };
}

await rm(coverageDir, { recursive: true, force: true });
await mkdir(coverageDir, { recursive: true });

for (const target of targets) {
  execFileSync("npm", ["-w", target.packageName, "run", "-s", "test"], {
    cwd: root,
    env: {
      ...process.env,
      NODE_V8_COVERAGE: coverageDir,
    },
    stdio: "inherit",
  });
}

const coverageFiles = (await readdir(coverageDir)).filter((file) => file.endsWith(".json"));
if (coverageFiles.length === 0) {
  fail("coverage run produced no V8 coverage files");
}

const scripts = [];
for (const file of coverageFiles) {
  const coverage = JSON.parse(await readFile(path.join(coverageDir, file), "utf8"));
  for (const script of coverage.result ?? []) {
    const normalizedPath = normalizeCoverageUrl(script.url ?? "");
    if (normalizedPath === null) continue;
    scripts.push({
      path: normalizedPath,
      ...summarizeScript(script),
    });
  }
}

const summary = targets.map((target) => {
  const matches = scripts.filter((script) => script.path.endsWith(target.sourceSuffix));
  const coveredRanges = matches.reduce((total, script) => total + script.coveredRanges, 0);
  const uncoveredRanges = matches.reduce((total, script) => total + script.uncoveredRanges, 0);
  const maxEndOffset = Math.max(0, ...matches.map((script) => script.maxEndOffset));
  return {
    packageName: target.packageName,
    source: target.sourceSuffix,
    scripts: matches.length,
    coveredRanges,
    uncoveredRanges,
    maxEndOffset,
  };
});

for (const entry of summary) {
  if (entry.scripts < 1) {
    fail(`coverage did not observe ${entry.source}`, summary);
  }
  if (entry.coveredRanges < 1 || entry.maxEndOffset < 1) {
    fail(`coverage did not execute ${entry.source}`, summary);
  }
}

console.log(JSON.stringify({ schemaVersion: 1, targets: summary }, null, 2));
console.log("Coverage signal OK.");
