# CQL

`parseCql` parses a compact query language into structured `SearchQuery` values.

The parser supports terms, phrases, field restrictions, parentheses, `AND`, `OR`, `NOT`, wildcard terms, and fuzzy terms with a trailing `~`.

`serializeCql` emits stable strings for common query forms.
