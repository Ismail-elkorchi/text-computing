# `textdoc` fixtures

This fixture set records public structural examples for the document annotation model.

- [`examples/document-annotation-model-v1.json`](examples/document-annotation-model-v1.json)
  contains one valid document with token, sentence, POS, lemma, morphology, entity, and
  corpus-feature layers.
- [`invalid/`](invalid/) contains negative controls for dangling view ids, dangling annotation
  targets, overlap without layer policy, and lifecycle mismatch.

These fixtures are structural proofs for the container contract. They are not claims that all
downstream NLP task runtimes are already implemented.
