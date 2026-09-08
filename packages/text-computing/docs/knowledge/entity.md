# Entities

Entity records contain labels, aliases, descriptions, types, relations, priors, source mappings, and metadata.

Use `candidateEntities` to rank entity candidates from a mention. Ranking combines alias match quality, priors, type filters, context overlap, corpus counts, rule constraints, and source priority.

`linkEntities` reads entity annotations and explicit `mentionSpans` by default.
Set `mentionSource` to `"aliases"` or `"both"` only when whole-text gazetteer
scanning is intentionally desired. Alias scanning does not infer whether a span
is a named entity.
