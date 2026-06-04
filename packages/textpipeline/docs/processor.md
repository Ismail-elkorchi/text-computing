# Processor

A processor declares stable identity, requirements, outputs, and a `process` function.

```ts
const processor = {
	id: "tokens",
	version: "1.0.0",
	requires: [{ viewKind: "raw" }],
	provides: [{ layer: "token.word", annotations: ["token.word"] }],
	process(document, context) {
		context.emitDiagnostic({
			code: "TOKENS_READY",
			severity: "info",
			message: "token layer produced",
		});
		return document;
	},
} satisfies TextProcessor;
```

Requirement objects are conjunctive. A processor that declares both `layer` and `viewKind` needs both. Resource requirements use final `textpack` `ResourceKind` values and exact capability strings.

Outputs describe what the processor adds or preserves. A processor must declare at least one output.
