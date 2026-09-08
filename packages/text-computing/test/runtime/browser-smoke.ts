import { runCompositionSmoke } from "./composition-smoke.ts";
import { runTextComputingFileBackedSmoke } from "./file-backed-smoke.ts";

await runTextComputingFileBackedSmoke("browser");
await runCompositionSmoke();
