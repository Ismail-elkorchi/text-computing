import assert from "node:assert/strict";
import type {
	NormalizationCandidate,
	NormalizationMode,
	NormalizationViewResult,
	TextNormOptions,
	VariantGraph,
} from "@ismail-elkorchi/text-computing/normalization";
import { buildSpellingMap } from "@ismail-elkorchi/text-computing/normalization";

const mode: NormalizationMode = "spelling";
const candidate = {
	source: {
		viewId: "raw",
		span: { start: 0, end: 1, unit: "utf16-code-unit" },
	},
	candidate: "a",
	kind: mode,
	evidence: {
		mode: "algorithm",
		exactness: "E0",
		producer: "@ismail-elkorchi/text-computing/normalization",
		packageName: "@ismail-elkorchi/text-computing",
		packageVersion: "0.1.0",
		inputViewIds: ["raw"],
	},
} satisfies NormalizationCandidate;
const options = { modes: [mode] } satisfies TextNormOptions;

assert.equal(candidate.kind, "spelling");
assert.equal(options.modes[0], "spelling");
assert.equal(
	buildSpellingMap([{ source: "x", candidates: ["y"] }]).kind,
	"spelling",
);
assert.equal(
	typeof (undefined as unknown as NormalizationViewResult | undefined),
	"undefined",
);
assert.equal(
	typeof (undefined as unknown as VariantGraph | undefined),
	"undefined",
);
