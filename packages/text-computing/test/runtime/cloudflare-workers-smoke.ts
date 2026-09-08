import { runCompositionSmoke } from "./composition-smoke.ts";
import { runTextComputingFileBackedSmoke } from "./file-backed-smoke.ts";

await runTextComputingFileBackedSmoke("workers");
await runCompositionSmoke();
