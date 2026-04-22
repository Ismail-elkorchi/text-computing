import { readFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();

const checks = [
  {
    path: "README.md",
    forbidden: ["current publishable npm package"],
  },
  {
    path: "CONTRIBUTING.md",
    forbidden: ["current publishable npm package"],
  },
  {
    path: "packages/textdoc/CHANGELOG.md",
    forbidden: ["minimal token/sentence annotation type contract"],
  },
  {
    path: "packages/textpack/CHANGELOG.md",
    forbidden: ["no public API beyond the package identity export"],
  },
  {
    path: "packages/textprotocol/CHANGELOG.md",
    forbidden: ["no public API beyond the package identity export"],
  },
  {
    path: "packages/textprotocol/examples/README.md",
    forbidden: [
      "will contain runnable examples after the package exposes reviewed behavior beyond its package identity export",
    ],
  },
  {
    path: "packages/textconformance/CHANGELOG.md",
    forbidden: ["no public API beyond the package identity export"],
  },
  {
    path: "packages/textconformance/examples/README.md",
    forbidden: [
      "will contain runnable examples after the package exposes reviewed behavior beyond its package identity export",
    ],
  },
  {
    path: "packages/textrules/CHANGELOG.md",
    forbidden: ["no public API beyond the package identity export"],
  },
  {
    path: "packages/textrules/examples/README.md",
    forbidden: [
      "will contain runnable examples after the package exposes reviewed behavior beyond its package identity export",
    ],
  },
];

async function main() {
  const errors = [];

  for (const check of checks) {
    const filePath = path.join(ROOT, check.path);
    const text = await readFile(filePath, "utf8");
    for (const snippet of check.forbidden) {
      if (text.includes(snippet)) {
        errors.push(`${check.path} still contains stale claim: ${JSON.stringify(snippet)}`);
      }
    }
  }

  if (errors.length > 0) {
    for (const error of errors) {
      console.error(error);
    }
    process.exit(1);
  }

  console.log(`Truth check OK (${checks.length} files).`);
}

await main();
