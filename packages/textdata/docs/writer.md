# Writer

`writeDataset` writes JSONL, textdoc JSONL, CSV, TSV, CoNLL-U, IOB, and parallel records to caller-owned sinks. Sinks can collect strings, bytes, rows, records, or receive chunks through a callback.

Writers validate serializable values as I-JSON and use stable field ordering.
