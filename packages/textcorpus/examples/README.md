# @ismail-elkorchi/textcorpus examples

Runnable repository examples:

- [`../../../examples/textcorpus-corpus-metric-envelope-consumer.mjs`](../../../examples/textcorpus-corpus-metric-envelope-consumer.mjs)
  builds a `TextCorpusCollectionV1` from `textdoc` token layers, exports corpus metric payloads,
  wraps them with `textprotocol` schema-family JSON transport, and inspects the parsed envelope
  through `textlab`.
