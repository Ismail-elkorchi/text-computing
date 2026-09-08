# Parser

The parser subpath exposes a supervised, deterministic arc-standard transition parser. Train it
from projective dependency trees, then parse token sequences with the learned perceptron weights.
Dependency outputs use final dependency edge values and `Score` records.

```ts
const parser = trainClassicalParser([
  {
    tokens: [{ id: "t1", text: "Dogs" }, { id: "t2", text: "bark" }],
    edges: [
      { head: "t2", dependent: "t1", relation: "nsubj" },
      { head: "ROOT", dependent: "t2", relation: "root" },
    ],
  },
]);
```

Training rejects cycles, multiple roots, unknown token ids, and non-projective trees that cannot be
represented by arc-standard transitions.
