# Concordance

`concordance(corpus, query, options)` returns KWIC lines with document id, hit span, left context, node text, right context, and document metadata.

When node text must be sliced from a span, only `utf16-code-unit` spans are sliced. Other coordinate units require explicit annotation text.
