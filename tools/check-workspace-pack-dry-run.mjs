import { spawn } from "node:child_process";

const REQUIRED_FILES = ["package.json", "README.md", "CHANGELOG.md", "dist/index.js", "dist/index.d.ts"];

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

const raw = await runPackDryRun();
let reports;
try {
  reports = JSON.parse(raw);
} catch (error) {
  fail("Workspace pack dry-run did not emit JSON.", { error: String(error), raw: raw.slice(0, 1000) });
}

expect(Array.isArray(reports), "Workspace pack dry-run output must be an array.");

const byName = new Map(reports.map((report) => [report.name, report]));
const nonTextfacts = reports.filter((report) => report.name !== "@ismail-elkorchi/textfacts");

expect(reports.length === 9, "Workspace pack dry-run must cover every workspace package.", {
  packageCount: reports.length,
  packageNames: reports.map((report) => report.name),
});
expect(nonTextfacts.length === 8, "Workspace pack dry-run must cover every non-textfacts package.");
expect(byName.get("@ismail-elkorchi/textfacts")?.version === "0.1.0", "textfacts dry-run version must stay public beta.");

for (const report of nonTextfacts) {
  expect(report.version === "0.0.0", `${report.name} must remain at private-unreleased version 0.0.0.`);
  const files = new Set((report.files ?? []).map((file) => file.path));
  for (const requiredFile of REQUIRED_FILES) {
    expect(files.has(requiredFile), `${report.name} dry-run package is missing ${requiredFile}.`, {
      files: [...files].sort(),
    });
  }
  expect(
    ![...files].some((file) => file.startsWith("src/") || file.startsWith("test/")),
    `${report.name} dry-run package must not include source or test directories.`,
    { files: [...files].sort() },
  );
}

console.log(`Workspace pack dry-run OK (packages=${reports.length}, privatePackages=${nonTextfacts.length}).`);
