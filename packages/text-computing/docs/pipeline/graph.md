# Graph

`planPipeline` builds a deterministic dependency graph from processor requirements and outputs.

```ts
const plan = planPipeline(pipeline, document);
```

The plan contains:

- nodes for every processor
- dependency edges
- deterministic processor order
- missing requirements
- cycle diagnostics

Document state can satisfy layer and view-kind requirements. A resource registry can satisfy resource-kind and capability requirements. `planPipeline` is pure and does not execute processors.
