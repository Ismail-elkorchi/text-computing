# `textdoc` fixtures

This fixture set records public structural examples for the document annotation model.

- [`examples/document-annotation-model-v1.json`](examples/document-annotation-model-v1.json)
  contains one valid document with token, sentence, POS, lemma, morphology, entity, relation,
  coreference, entity-link, and corpus-feature layers.
- [`examples/document-extension-model-v1.json`](examples/document-extension-model-v1.json)
  contains one valid document with a generic extension layer for package-specific annotations.
- [`roundtrip/document-annotation-model-annotation-bundle.v1.json`](roundtrip/document-annotation-model-annotation-bundle.v1.json)
  contains a `textprotocol` annotation-bundle envelope generated from the document-model fixture and
  restored through the `textdoc` stand-off annotation-bundle API.
- [`invalid/`](invalid/) contains negative controls for dangling view ids, dangling annotation
  targets, overlap without layer policy, lifecycle mismatch, graph references, dependency
  cycles, ambiguity-set selection conflicts, and invalid extension ids.

These fixtures are structural verifications for the container contract. They do not assert that all
downstream NLP task runtimes are already implemented.
