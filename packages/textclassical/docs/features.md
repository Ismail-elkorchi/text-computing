# Features

Feature extraction consumes final `TextDocument` values and explicit feature specs. Built-in specs
cover text counts, token windows, character n-grams, word n-grams, shapes, affixes, annotations,
lexicon-shaped entries, gazetteer-shaped entries, POS annotations, and FST-derived annotations.

Feature ids and output order are stable. Non-UTF-16 spans are not sliced as JavaScript string
offsets; callers should provide UTF-16 spans or pre-materialized annotation features.
