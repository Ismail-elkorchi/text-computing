# Query

`search` consumes structured `SearchQuery` values.

Supported query kinds include `all`, `none`, `term`, `terms`, `phrase`, `proximity`, `boolean`, `field`, `range`, `wildcard`, `prefix`, `suffix`, `fuzzy`, `regex`, `annotation`, `metadata`, and parsed CQL queries.

Expansions are bounded by explicit limits and ordered by code-point string order.

Exact term lookup uses inverted postings. Phrase and proximity queries first intersect posting
document ids, then verify preserved token positions. Ranking receives only positive matched terms;
filter and negative clauses do not contribute, while wildcard, prefix, suffix, fuzzy, and regex
queries contribute their actual expanded terms.
