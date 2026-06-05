# Alignment

Alignment links connect source and target `SpanRef` values and carry a relation, final `Evidence`, and optional final `Score`.

```ts
import { buildAlignmentLink, parallelEvidence } from "@ismail-elkorchi/textparallel/alignment";

const link = buildAlignmentLink({
	source: { viewId: "raw", span: { start: 0, end: 5, unit: "utf16-code-unit" } },
	target: { viewId: "raw", span: { start: 0, end: 7, unit: "utf16-code-unit" } },
	relation: "equivalent",
	evidence: parallelEvidence(["raw"], { producer: "example" }),
});
```

Use `annotateAlignment` to add source-side final annotations that point at target spans through JSON-safe annotation values.
