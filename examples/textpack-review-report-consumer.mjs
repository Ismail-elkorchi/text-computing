import { readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createTextPackReviewReport,
  isTextPackReviewReportV1,
} from "@ismail-elkorchi/textpack";
import { textPackEnCoreManifest } from "@ismail-elkorchi/textpack-en-core";
import {
  inspectTextPackReviewReport,
  renderTextPackReviewInspection,
} from "@ismail-elkorchi/textlab";

async function listPackResourceFiles(packRoot) {
  const resourcesRoot = path.join(packRoot, "resources");
  const stack = [resourcesRoot];
  const files = [];
  while (stack.length > 0) {
    const current = stack.pop();
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const absolutePath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(absolutePath);
      } else if (entry.isFile()) {
        files.push(path.relative(packRoot, absolutePath).split(path.sep).join("/"));
      }
    }
  }
  return files.sort((left, right) => left.localeCompare(right));
}

const manifestUrl = await import.meta.resolve("@ismail-elkorchi/textpack-en-core/pack.manifest.json");
const packRoot = path.dirname(fileURLToPath(manifestUrl));
const report = createTextPackReviewReport(textPackEnCoreManifest, {
  targetReviewState: "reference",
  inventoryResourcePaths: await listPackResourceFiles(packRoot),
  packageVersions: {
    "@ismail-elkorchi/textpack": "0.1.0",
  },
  requireCompatibility: true,
  requiredEvidence: ["reviewer", "conformance", "benchmark"],
  evidence: {
    reviewerIds: ["reviewer:example-pack-reviewer"],
    conformanceRefs: ["fixtures/conformance/package-suites.v1.json#textpack-en-core"],
    benchmarkRefs: ["resources/benchmark.smoke.txt"],
  },
});

if (!isTextPackReviewReportV1(report)) {
  throw new Error("Generated review report does not satisfy the textpack review-report contract.");
}

const inspection = inspectTextPackReviewReport(report);
if (!inspection.ok) {
  throw new Error(JSON.stringify(inspection.diagnostics));
}

console.log(JSON.stringify({
  packId: inspection.packId,
  decision: inspection.decision,
  transition: inspection.transition,
  requirements: {
    passed: inspection.passedRequirementCount,
    failed: inspection.failedRequirementCount,
    notApplicable: inspection.notApplicableRequirementCount,
  },
  renderedSummary: renderTextPackReviewInspection(inspection).split("\n").slice(0, 12),
}, null, 2));
