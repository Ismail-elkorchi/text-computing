# @ismail-elkorchi/textpipeline examples

Runnable repository examples:

- [`../../../examples/textpipeline-batch-report-consumer.mjs`](../../../examples/textpipeline-batch-report-consumer.mjs)
  runs complete and partial document batches, then prints deterministic batch reports and typed result
  envelopes with per-document completion state and trace sizes.
- [`../../../examples/textpipeline-processor-trace-envelope-consumer.mjs`](../../../examples/textpipeline-processor-trace-envelope-consumer.mjs)
  runs a cache-backed processor, wraps the cached execution trace in textprotocol processor-trace
  schema-family JSON transport, parses it, and inspects the parsed envelope through textlab.
