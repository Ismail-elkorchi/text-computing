import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";

const COMMON_REQUIRED_FILES = ["package.json", "README.md", "CHANGELOG.md"];
const ENTRYPOINT_FILES_BY_PACKAGE = new Map([
  ["@ismail-elkorchi/textfacts", ["dist/mod.js", "dist/mod.d.ts"]],
]);

function fail(message, details) {
  console.error(message);
  if (details !== undefined) console.error(JSON.stringify(details, null, 2));
  process.exit(1);
}

function expect(condition, message, details) {
  if (!condition) fail(message, details);
}

function runPackDryRun() {
  return new Promise((resolve, reject) => {
    const child = spawn("npm", ["pack", "--dry-run", "--workspaces", "--json"], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (stderr.trim().length > 0) process.stderr.write(stderr);
      if (code !== 0) {
        reject(new Error(`npm pack --dry-run --workspaces --json exited with ${code}`));
        return;
      }
      resolve(stdout);
    });
  });
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

const raw = await runPackDryRun();
let reports;
try {
  reports = JSON.parse(raw);
} catch (error) {
  fail("Workspace pack dry-run did not emit JSON.", { error: String(error), raw: raw.slice(0, 1000) });
}

expect(Array.isArray(reports), "Workspace pack dry-run output must be an array.");

const byName = new Map(reports.map((report) => [report.name, report]));
const gates = await readJson("fixtures/package-release/gates.v1.json");
const gateByName = new Map(gates.packages.map((entry) => [entry.packageName, entry]));

expect(reports.length === gates.packages.length, "Workspace pack dry-run must cover every workspace package.", {
  packageCount: reports.length,
  expectedPackageCount: gates.packages.length,
  packageNames: reports.map((report) => report.name),
});
expect(byName.get("@ismail-elkorchi/textfacts")?.version === "0.1.0", "textfacts dry-run version must stay public beta.");

let privatePackageCount = 0;
let publicPackageCount = 0;
for (const report of reports) {
  const gate = gateByName.get(report.name);
  const packageDir = report.name.split("/")[1];
  const packageJson = await readJson(`packages/${packageDir}/package.json`);

  expect(gate !== undefined, `${report.name} is missing from package release gates.`);
  expect(report.version === packageJson.version, `${report.name} dry-run version must match package.json.`);
  if (gate.releaseTrack === "private-unreleased") {
    privatePackageCount += 1;
    expect(report.version === "0.0.0", `${report.name} must remain at private-unreleased version 0.0.0.`);
    expect(packageJson.private === true, `${report.name} private-unreleased package must remain private.`);
  } else {
    publicPackageCount += 1;
    expect(report.version !== "0.0.0", `${report.name} public package must not use version 0.0.0.`);
    expect(packageJson.private !== true, `${report.name} public package must not be private.`);
  }
  const files = new Set((report.files ?? []).map((file) => file.path));
  const requiredFiles = [
    ...COMMON_REQUIRED_FILES,
    ...(ENTRYPOINT_FILES_BY_PACKAGE.get(report.name) ?? ["dist/index.js", "dist/index.d.ts"]),
  ];
  for (const requiredFile of requiredFiles) {
    expect(files.has(requiredFile), `${report.name} dry-run package is missing ${requiredFile}.`, {
      files: [...files].sort(),
    });
  }
  const allowsPublishedTests = report.name.startsWith("@ismail-elkorchi/textpack-");
  expect(![...files].some((file) => file.startsWith("src/")), `${report.name} dry-run package must not include source directories.`, {
    files: [...files].sort(),
  });
  expect(
    allowsPublishedTests || ![...files].some((file) => file.startsWith("test/")),
    `${report.name} dry-run package must not include test directories unless it is a reference pack.`,
    { files: [...files].sort() },
  );
}

console.log(`Workspace pack dry-run OK (packages=${reports.length}, privatePackages=${privatePackageCount}, publicPackages=${publicPackageCount}).`);
