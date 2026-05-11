import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { packageName, summarizeSupportStatus } from "../dist/index.js";
import { runTextlabCli } from "../dist/cli.js";

if (packageName !== "@ismail-elkorchi/textlab") {
  throw new Error("package name should remain stable");
}

const supportStatus = {
  schemaVersion: 1,
  packages: [
    {
      name: "@ismail-elkorchi/textfacts",
      status: "beta",
      scope: "Unicode text facts",
      evidence: ["multi-runtime tests"],
      limitations: ["fixture-bound applied NLP integration"],
    },
    {
      name: "@ismail-elkorchi/textlab",
      status: "scaffold",
      scope: "Inspection tooling",
      evidence: ["workspace package"],
      limitations: ["no broad renderer"],
    },
  ],
  tasks: [
    {
      id: "nlp-tokenization-sbd",
      status: "slice-proven",
      scope: "Frozen slices",
      evidence: ["fixtures"],
      limitations: ["not broad multilingual"],
    },
    {
      id: "nlp-dependency-parser",
      status: "readiness-only",
      scope: "Expected arcs only",
      evidence: ["readiness artifacts"],
      limitations: ["no parser"],
    },
  ],
};

const summary = summarizeSupportStatus(supportStatus);

if (summary.packageRows.map((row) => row.id).join(",") !== "@ismail-elkorchi/textfacts,@ismail-elkorchi/textlab") {
  throw new Error("package rows should be sorted deterministically");
}

if (summary.taskRows.map((row) => row.id).join(",") !== "nlp-dependency-parser,nlp-tokenization-sbd") {
  throw new Error("task rows should be sorted deterministically");
}

if (summary.counts.map((entry) => `${entry.status}:${entry.count}`).join(",") !== "scaffold:1,readiness-only:1,slice-proven:1,beta:1") {
  throw new Error("summary counts should be deterministic and complete");
}

let invalidRejected = false;
try {
  summarizeSupportStatus({ schemaVersion: 1, packages: [], tasks: [{ id: "", status: "scaffold" }] });
} catch (error) {
  invalidRejected = error instanceof TypeError && error.message === "support status document is invalid";
}

if (!invalidRejected) {
  throw new Error("invalid support status should be rejected");
}

const dir = await mkdtemp(path.join(tmpdir(), "textlab-support-status-"));
const fixturePath = path.join(dir, "support-status.v1.json");
await writeFile(fixturePath, `${JSON.stringify(supportStatus, null, 2)}\n`, "utf8");

const cliResult = await runTextlabCli(["support-status", fixturePath]);

if (cliResult.exitCode !== 0 || cliResult.stderr !== "") {
  throw new Error(`support-status CLI should pass: ${cliResult.stderr}`);
}

if (!cliResult.stdout.includes("task:nlp-dependency-parser [readiness-only]")) {
  throw new Error("support-status CLI should render task status rows");
}

const invalidCliResult = await runTextlabCli(["unknown"]);

if (invalidCliResult.exitCode !== 2 || !invalidCliResult.stderr.includes("Unknown command")) {
  throw new Error("CLI should reject unknown commands deterministically");
}
