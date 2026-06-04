# Run

`runPipeline` executes a planned pipeline over one final `TextDocument`.

```ts
const diagnostics = [];
const trace = [];
const output = await runPipeline(pipeline, document, {
	diagnostics,
	trace,
	failurePolicy: "throw",
});
```

Default execution is deterministic and fail-fast. `failurePolicy: "continue"` records diagnostics and keeps processing when later processor requirements are still satisfied.

`AbortSignal` is checked before planning, before processor execution, and after async processor completion.
