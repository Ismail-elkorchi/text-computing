# Candidates

Candidates use the declared kinds: `spelling`, `historical`, `ocr`, `dialect`,
`transliteration`, `punctuation`, `spacing`, and `casing`.

Every candidate includes a `SpanRef`, candidate string, `Evidence`, and optional `Score`.
Ordering is deterministic by span, score, kind, candidate text, and resource identifiers.
