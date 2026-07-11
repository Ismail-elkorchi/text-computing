# NLP benchmark fixtures

`held-out-v1.json` contains independently authored multilingual task cases. The
cases are disjoint from forge acquisition and transform inputs and must never be
used to generate, select, or tune pack resources. They are reserved for
executing the public `@ismail-elkorchi/text-computing` API and measuring
observable task behavior.

This is a frozen, committed test split, not a secret or blind research test set.
Its purpose is reproducible regression gating. Passing it does not establish
broad external quality or generalization beyond the represented English,
French, and Arabic cases.

Benchmark results report task metrics rather than resource counts:

- segmentation uses exact lexical-unit span precision, recall, and F1;
- normalization uses exact match;
- morphology requires the first-ranked document analysis to contain an accepted
  lemma at the exact expected token span;
- entity linking requires an accepted rank-one canonical identifier at the exact
  raw-text mention span, rejects extra links, and checks exact NIL output;
- search analysis requires the exact normalized term sequence and exact UTF-16
  offsets in each token's declared normalized view;
- every semantic mismatch fails the command; averages are diagnostic metrics,
  not thresholds that can hide a failed case.

Warm latency uses a deterministic workload of at least 512 UTF-16 code units per
language. It performs two untimed warmups and gates the median of five sequential
measurements; p95 is reported to expose variance. These numbers are CI regression
budgets, not portable hardware benchmarks.

Case identifiers and language tags are globally unique, and annotated spans are
validated before execution. Adding a resource or changing a transform must not
silently rewrite expected answers. Changes to this fixture require an explicit
linguistic review.
