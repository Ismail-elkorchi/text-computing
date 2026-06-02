import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { build } from "esbuild";

const outDir = path.resolve("dist-test", "smoke");
const outFile = path.join(outDir, "cloudflare-workers-smoke.mjs");

await mkdir(outDir, { recursive: true });

await build({
  entryPoints: ["test/runtime/cloudflare-workers-smoke.ts"],
  outfile: outFile,
  bundle: true,
  format: "iife",
  globalName: "__textfactsWorkersSmoke",
  platform: "browser",
  target: "es2024",
});

const source = await readFile(outFile, "utf8");
for (const disallowed of [
  'from "node:',
  "from 'node:",
  'import("node:',
  "require(",
  "process.",
  "Buffer.",
]) {
  if (source.includes(disallowed)) {
    throw new Error(`Workers smoke bundle contains Node-only token: ${disallowed}`);
  }
}

const context = vm.createContext({
  console,
  crypto: globalThis.crypto,
  TextDecoder,
  TextEncoder,
  Uint8Array,
  Int32Array,
  Uint16Array,
  Uint32Array,
  BigInt,
  Math,
  Number,
  String,
  Array,
  Object,
  JSON,
  Map,
  Set,
  RangeError,
  Error,
  Symbol,
});

vm.runInContext(source, context, { filename: outFile });
