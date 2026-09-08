# Dataset

`TextDataset<T>` is an immutable envelope with an id, JSON-safe metadata, and iterable records. Record order is preserved unless a caller selects a deterministic split policy.

Data-package manifests are explicit JSON-safe descriptors. They may name formats, sources, citations, schema hints, and splits, but they never trigger file discovery, network reads, or package lookup.
