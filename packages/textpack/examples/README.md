# `@ismail-elkorchi/textpack` examples

Curated resource manifests and fixture resources live under
[`../../../fixtures/textpack/`](../../../fixtures/textpack/).

Runnable repository examples:

- [`../../../examples/textpack-en-core-consumer.mjs`](../../../examples/textpack-en-core-consumer.mjs)
  loads `@ismail-elkorchi/textpack-en-core` resources through textpack package APIs and performs
  deterministic lookup.
- [`../../../examples/textpack-authoring-consumer.mjs`](../../../examples/textpack-authoring-consumer.mjs)
  creates a local pack, plans resource transactions, audits inventory, loads resources, and performs
  deterministic lookup.
- [`../../../examples/textpack-pack-manifest-envelope-consumer.mjs`](../../../examples/textpack-pack-manifest-envelope-consumer.mjs)
  validates a textpack manifest, wraps it in textprotocol pack-manifest schema-family JSON transport,
  parses it, and revalidates the parsed manifest.
