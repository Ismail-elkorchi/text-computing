# Views And Span Maps

Derived views contain the actual normalized output text. Span maps are built from edit scripts using
final relations: `identity`, `normalized`, `expanded`, `contracted`, `inserted`, `deleted`,
`reordered`, `aligned`, and `approximate`.

Generated textnorm spans use `utf16-code-unit`. Non-UTF-16 caller spans must be converted before
slice-based operations.
