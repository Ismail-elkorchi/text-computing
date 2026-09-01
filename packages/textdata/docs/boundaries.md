# Boundaries

`textdata` loads, streams, converts, splits, and writes datasets. Corpus
statistics belong to `textcorpus`. Optional in-process classical training
utilities live in `textclassical`; model creation is otherwise an upstream
toolchain concern. Pipeline execution belongs to `textpipeline`. Search indexing
belongs to `textsearch`. Knowledge linking belongs to `textkb`.

Runtime inputs and outputs are caller-owned values and streams. Shipped runtime code does not use Node-only file-system APIs.
