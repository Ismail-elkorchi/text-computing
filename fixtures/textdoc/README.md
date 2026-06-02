# `textdoc` fixtures

This fixture set records public structural fixtures for the document annotation model.

- [`invalid/`](invalid/) contains negative controls for dangling view ids, dangling annotation
  targets, overlap without layer policy, lifecycle mismatch, graph references, dependency
  cycles, ambiguity-set selection conflicts, and invalid extension ids.

These fixtures are structural verifications for the container contract. They do not assert that all
downstream NLP task runtimes are already implemented.
