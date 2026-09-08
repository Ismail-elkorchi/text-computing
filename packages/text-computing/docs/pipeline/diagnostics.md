# Diagnostics

Diagnostics are deterministic JSON-safe records:

```ts
{
	code: "TEXTPIPELINE_MISSING_REQUIREMENT",
	severity: "error",
	message: "processor requirement is not satisfied: tagger",
	processorId: "tagger",
}
```

Planning, running, streaming, cache, and resource errors use structured diagnostics where the processor or requirement is known.
