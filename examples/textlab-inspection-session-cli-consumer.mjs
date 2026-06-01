#!/usr/bin/env node
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { runTextlabCli } from "@ismail-elkorchi/textlab/cli";

const rows = [
  { id: "trace", kind: "pipeline", status: "complete" },
  { id: "batch", kind: "pipeline", status: "partial" },
  { id: "corpus", kind: "corpus", status: "complete" },
  { id: "pack", kind: "textpack", status: "reviewed" },
  { id: "release", kind: "release", status: "candidate" },
];

const dir = await mkdtemp(path.join(tmpdir(), "textlab-inspection-session-cli-"));
try {
  const rowsPath = path.join(dir, "rows.json");
  await writeFile(rowsPath, `${JSON.stringify(rows, null, 2)}\n`, "utf8");

  const firstResult = await runTextlabCli([
    "inspection-session",
    rowsPath,
    "--session-id",
    "example:textlab-inspection-session-cli",
    "--subject-id",
    "example:artifact-index",
    "--title",
    "Example CLI artifact index",
    "--page-size",
    "2",
    "--command",
    "next-page",
    "--json",
  ]);
  if (firstResult.exitCode !== 0) {
    throw new Error(firstResult.stderr);
  }

  const firstSession = JSON.parse(firstResult.stdout);
  const sessionPath = path.join(dir, "session.json");
  await writeFile(sessionPath, `${JSON.stringify(firstSession, null, 2)}\n`, "utf8");

  const finalResult = await runTextlabCli([
    "inspection-session",
    rowsPath,
    "--from-session",
    sessionPath,
    "--command",
    "last-page",
    "--json",
  ]);
  if (finalResult.exitCode !== 0) {
    throw new Error(finalResult.stderr);
  }

  const finalSession = JSON.parse(finalResult.stdout);
  console.log(JSON.stringify({
    sessionId: finalSession.sessionId,
    subjectId: finalSession.subjectId,
    pageIndex: finalSession.pageIndex,
    pageCount: finalSession.pageCount,
    pageRows: finalSession.pageRows,
    commandHistory: finalSession.commandHistory.map((entry) => entry.command),
  }, null, 2));
} finally {
  await rm(dir, { recursive: true, force: true });
}
