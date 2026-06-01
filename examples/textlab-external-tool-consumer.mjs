#!/usr/bin/env node
import {
  executeTextlabExternalTool,
  isTextlabExternalToolExecutionReportV1,
  renderTextlabExternalToolExecutionReport,
} from "@ismail-elkorchi/textlab";

const report = await executeTextlabExternalTool({
  toolId: "example-node-version",
  command: process.execPath,
  args: ["--version"],
  maxOutputChars: 80,
  evidenceRefs: ["examples/textlab-external-tool-consumer.mjs"],
  limitations: [
    "Example executes the current Node binary with an explicit argument vector.",
  ],
});

if (!isTextlabExternalToolExecutionReportV1(report)) {
  throw new Error("external tool execution report is invalid");
}

console.log(JSON.stringify({
  toolId: report.toolId,
  status: report.status,
  exitCode: report.exitCode,
  stdoutPreview: report.stdoutPreview.trim(),
  renderedIncludesStatus: renderTextlabExternalToolExecutionReport(report).includes("Status: passed"),
}, null, 2));
