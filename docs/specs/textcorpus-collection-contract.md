# textcorpus collection contract

## Why this document exists

The repository needs a dedicated owner for many-document collection semantics before corpus-level
features such as TF-IDF and BM25 can be implemented honestly. This document records the minimal
`textcorpus` surface: corpus entries reference explicit `textdoc` token layers instead of
retokenizing raw text, and deterministic fingerprint indexing builds on those declared views.

## Collection contract

Each corpus entry records:

- `id`;
- `document` as a `TextDocDocumentV1`;
- `viewId`;
- `tokenLayerId`; and
- optional string metadata.

`createTextCorpusCollection` rejects:

- duplicate entry ids;
- duplicate `document.documentId` values;
- missing views; and
- missing token layers for the declared view.

Collections are returned in stable `entry.id` order. The canonical tokenization policy is
`explicit-textdoc-token-layer` with UTF-16 code-unit offsets.

## Metadata slicing

`sliceTextCorpusByMetadata` performs exact-match filtering over string metadata values. It preserves
the collection ordering of retained entries and does not alter tokenization policy or token layers.

## Fingerprint index

`buildTextCorpusFingerprintIndex` operates over explicit token texts from the declared token layer.
It does not retokenize raw document text. Shingle hashing is deterministic, and winnowing uses
stable rightmost-minimum tie breaking inside each window.

The v1 fingerprint index records:

- `corpusId`;
- `tokenSource`;
- `hashAlgorithm`;
- `shingleSize`;
- `windowSize`;
- `docFingerprints`; and
- the inverted `index`.

## Deliberate v1 exclusions

This foundation does not yet define:

- TF-IDF or BM25;
- corpus ranking APIs;
- corpus-level result envelopes; or
- multilingual comparator fixtures for retrieval behavior.

## Verification

`npm run -s test:all` executes runtime checks for duplicate-document rejection, missing view/layer
rejection, deterministic collection ordering, metadata slicing, and repeated fingerprint-index
stability.
