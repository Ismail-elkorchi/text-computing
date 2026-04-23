import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const packageDir = path.join(ROOT, "packages");

function fail(message) {
  console.error(message);
  process.exit(1);
}

function expect(condition, message) {
  if (!condition) fail(message);
}

async function listSourceBuildArtifacts(dirPath) {
  const entries = await readdir(dirPath, { withFileTypes: true });
  const artifacts = [];
  for (const entry of entries) {
    const entryPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      artifacts.push(...(await listSourceBuildArtifacts(entryPath)));
      continue;
    }
    if (!entry.isFile()) continue;
    if (
      entry.name.endsWith(".js") ||
      entry.name.endsWith(".js.map") ||
      entry.name.endsWith(".d.ts") ||
      entry.name.endsWith(".d.ts.map")
    ) {
      artifacts.push(entryPath);
    }
  }
  return artifacts;
}

const entries = await readdir(packageDir, { withFileTypes: true });
for (const entry of entries) {
  if (!entry.isDirectory()) continue;
  const packageJsonPath = path.join(packageDir, entry.name, "package.json");
  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
  const sourceArtifacts = await listSourceBuildArtifacts(path.join(packageDir, entry.name, "src"));
  expect(
    sourceArtifacts.length === 0,
    `${packageJson.name} must not leave generated JS/declaration artifacts under src: ${sourceArtifacts.join(", ")}`,
  );
  if (entry.name === "textfacts") continue;

  const exportRoot = packageJson.exports?.["."];
  expect(exportRoot?.import === "./dist/index.js", `${packageJson.name} must export dist/index.js.`);
  expect(exportRoot?.types === "./dist/index.d.ts", `${packageJson.name} must export dist/index.d.ts.`);
  expect(!JSON.stringify(packageJson.exports).includes("src/"), `${packageJson.name} must not export src/.`);
  expect(Array.isArray(packageJson.files) && packageJson.files.includes("dist"), `${packageJson.name} files must include dist.`);
  expect(packageJson.scripts?.build === "tsc -p tsconfig.build.json", `${packageJson.name} must build via tsconfig.build.json.`);
  expect(packageJson.scripts?.prepack === "npm run build", `${packageJson.name} must run build before packing.`);

  const buildConfigPath = path.join(packageDir, entry.name, "tsconfig.build.json");
  const buildConfig = JSON.parse(await readFile(buildConfigPath, "utf8"));
  expect(buildConfig.compilerOptions?.outDir === "dist", `${packageJson.name} build outDir must be dist.`);
  expect(buildConfig.compilerOptions?.declaration === true, `${packageJson.name} must emit declarations.`);
  expect(buildConfig.include?.includes("src/**/*.ts"), `${packageJson.name} build must include src.`);
}

console.log("Package readiness metadata OK.");
