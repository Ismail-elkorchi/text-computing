# Normalization

`normalizeDocument(doc, options)` collects candidates for the explicit `modes`, applies a stable
non-overlapping selection policy, and returns a derived `TextView`, a final `SpanMap`, and the
inspectable candidate list.

The source document is not mutated. To store the returned view and span map, callers add them using
`textdoc` document helpers.
