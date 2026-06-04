# Vectorize

`fitVectorizer` creates an immutable feature space from named feature records. `transformVectorizer`
turns records into deterministic row-major sparse matrices.

Dictionary mode sorts feature keys by deterministic policy. Hashing mode uses a stable package hash
and an explicit bucket count. Transforming samples never mutates the fitted vectorizer.
