# `@ismail-elkorchi/textdoc` examples

Curated structural examples for the document annotation model live under
[`../../../fixtures/textdoc/`](../../../fixtures/textdoc/).

Runnable repository examples:

- [`../../../examples/textdoc-document-bundle-consumer.mjs`](../../../examples/textdoc-document-bundle-consumer.mjs)
  exports textdoc documents as a document-bundle payload, wraps the payload in textprotocol
  schema-family JSON transport, and imports the payload back through textdoc.
- [`../../../examples/textdoc-annotation-bundle-consumer.mjs`](../../../examples/textdoc-annotation-bundle-consumer.mjs)
  exports textdoc annotations as an annotation-bundle payload, wraps the payload in textprotocol
  schema-family JSON transport, and applies the parsed payload back onto a document skeleton.
- [`../../../examples/textdoc-mapping-loss-report-consumer.mjs`](../../../examples/textdoc-mapping-loss-report-consumer.mjs)
  exports textdoc loss markers as a mapping-loss-report payload, wraps the payload in textprotocol
  schema-family JSON transport, and inspects the parsed envelope through textlab.
