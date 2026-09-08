# Cache

The cache API stores final `TextDocument` values by deterministic keys.

```ts
const cache = createMemoryPipelineCache({ namespace: "job" });
await runPipeline(pipeline, document, { cache });
```

Cache keys include:

- pipeline id and fingerprint
- processor id and version
- processor requirements and outputs
- resource fingerprints
- run options that affect output
- full document content fingerprint

The document id is included, but it is never the only freshness signal.
