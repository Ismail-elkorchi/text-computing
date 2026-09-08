# Reader

`readDataset` accepts caller-owned strings, bytes, blobs, records, iterables, and explicit format descriptors. Supported formats are plain text, JSONL, CSV, TSV, CoNLL-style rows, CoNLL-U, IOB/BIO/BILOU, TEI/XML, HTML/XML, and parallel text with alignments.

Readers fail fast by default. Continue mode records deterministic diagnostics and skips invalid records explicitly.
