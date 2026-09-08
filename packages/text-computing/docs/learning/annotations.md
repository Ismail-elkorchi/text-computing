# Annotations

Document helpers return new final `TextDocument` values and preserve existing views, span maps,
layers, annotations, evidence, alternatives, and graphs.

Statistical outputs use final `Evidence` with `mode: "statistical"` and exactness `E2` or `E3`
according to task semantics. Layer roots come from the final namespace, including
`classification.*`, `sentiment.*`, `topic.*`, `summary.*`, `morph.*`, `syntax.*`, `chunk.*`,
`entity.*`, and `custom.*`.
