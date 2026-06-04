# Model Serialization

Model records, metadata, diagnostics, scores, and annotation values are plain I-JSON values. Unsafe
numbers and non-plain objects such as `Date`, `Map`, `Set`, class instances, functions, symbols, and
bigint are rejected.
