# Analyzer

Use `createAnalyzer` to build analyzers from tokenizers, Unicode normalization, case folding, stoplists, stem maps, lexicon maps, structural FST/transducer components, synonyms, token or character n-grams, JSON-safe payloads, and caller-provided pure transforms.

Analyzers accept strings or final `TextDocument` values. Document input uses the selected view or token layer and returns `SearchToken` values with zero-based positions and `utf16-code-unit` offsets.

Filtering preserves position gaps, and synonym, lexicon, and FST alternatives retain the source
token's position. Queries run through the selected field analyzer, so normalization, stemming, and
same-position alternatives are symmetric between indexing and lookup.

Analyzer-time normalization changes search terms only. It does not mutate source views or annotations.
