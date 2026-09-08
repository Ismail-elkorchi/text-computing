# Rule processors

`createRuleProcessor(compiledRules, options)` implements the library's
`TextProcessor` contract from `/pipeline`. Declare structured `requires` and
`provides`; there are no separate rule-specific requirement strings or
task-name factories.

```ts
import { createRuleProcessor } from "@ismail-elkorchi/text-computing/rules";
import { createPipeline, runPipeline } from "@ismail-elkorchi/text-computing/pipeline";

const processor = createRuleProcessor(compiledRules, {
  requires: [{ layer: "tokens" }],
  provides: [{ layer: "mentions" }],
});
const result = await runPipeline(createPipeline([processor]), document);
```

The processor calls `applyRules`, which is also available for direct execution.
An annotation rule creates its declared layer even when there are no matches.
The processor fingerprints its compiled rules and application options, so
changing rule content cannot silently reuse a previous cached result.

Use generic matching and annotation actions to build domain-specific tasks.
Task quality comes from the supplied rules and evaluation, not from a wrapper
named after a linguistic feature.
