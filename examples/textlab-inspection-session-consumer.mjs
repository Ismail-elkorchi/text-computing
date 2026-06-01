#!/usr/bin/env node
import {
  applyTextlabInspectionSessionCommand,
  createTextlabInspectionSession,
  isTextlabInspectionSessionV1,
  renderTextlabInspectionSession,
} from "@ismail-elkorchi/textlab";

const rows = [
  { id: "trace", kind: "pipeline", status: "complete" },
  { id: "batch", kind: "pipeline", status: "partial" },
  { id: "corpus", kind: "corpus", status: "complete" },
  { id: "pack", kind: "textpack", status: "reviewed" },
];

const firstPage = createTextlabInspectionSession(rows, {
  sessionId: "example:textlab-inspection-session",
  subjectId: "example:artifact-index",
  title: "Example artifact index",
  pageSize: 2,
});

const secondPage = applyTextlabInspectionSessionCommand(firstPage, rows, { command: "next-page" });
const finalPage = applyTextlabInspectionSessionCommand(secondPage, rows, { command: "last-page" });

if (!isTextlabInspectionSessionV1(finalPage)) {
  throw new Error("textlab inspection session is invalid");
}

console.log(JSON.stringify({
  sessionId: finalPage.sessionId,
  subjectId: finalPage.subjectId,
  pageIndex: finalPage.pageIndex,
  pageCount: finalPage.pageCount,
  pageRows: finalPage.pageRows,
  commandHistory: finalPage.commandHistory,
  renderedIncludesPage: renderTextlabInspectionSession(finalPage).includes("Page: 2 / 2"),
}, null, 2));
