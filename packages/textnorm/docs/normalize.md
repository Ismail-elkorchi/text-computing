# Normalization

`normalizeDocument(doc, options)` collects candidates for the explicit `modes`, applies a stable
non-overlapping selection policy, and returns a derived `TextView`, a final `SpanMap`, and the
inspectable candidate list.

`overlapPolicy: "all"` applies every candidate only when their source spans are mutually
compatible; ambiguous overlaps raise an error instead of producing a corrupt edit stream. Use a
ranked non-overlap policy to resolve conflicts, or `diagnostic-only` to inspect them without edits.
When `unicodeForm` is supplied, Unicode normalization is composed after candidate edits and is
included in the transform fingerprint.

The source document is not mutated. To store the returned view and span map, callers use
`textdoc`'s `addViewWithSpanMap` helper.

Normalization-profile `casefold` rules use the Unicode-pinned full case-fold implementation from
`textfacts`. Their output does not depend on the host locale or runtime locale data.
