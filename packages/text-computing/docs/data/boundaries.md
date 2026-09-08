# Boundaries

`/data` loads, streams, converts, splits, and writes datasets. Corpus
statistics belong to `/corpus`. Classical training and inference live in the `/learning` module. Pipeline execution belongs to `/pipeline`. Search indexing
belongs to `/search`. Knowledge linking belongs to `/knowledge`.

Runtime inputs and outputs are caller-owned values and streams. Shipped runtime code does not use Node-only file-system APIs.
