# Support status

This document is generated from `docs/specs/support-status.v1.json`. Do not edit it by hand; update
the JSON source and rerun `node tools/validate-support-status.mjs --write` if the canonical status
changes.

## Status labels

- `implemented` — public API and executable proof exist for the declared scope.
- `readiness-only` — frozen artifacts exist, but behavior is not implemented yet.
- `absent` — only a scaffold exists or no ratified public surface exists yet.

## Package status

| Package | Status | Scope |
| --- | --- | --- |
| `@ismail-elkorchi/textfacts` | `implemented` | Deterministic single-text kernel. Legacy public pack/protocol/schema helpers are frozen; new cross-package growth does not land here. |
| `@ismail-elkorchi/textdoc` | `implemented` | Document containers, lifecycle, provenance, and annotation-layer validation are implemented. |
| `@ismail-elkorchi/textpack` | `implemented` | Manifest validation, licensed fixture resources, overlay precedence, and conflict diagnostics are implemented. |
| `@ismail-elkorchi/textrules` | `implemented` | Rule-backed POS, lemma, morphology, and NER behavior is implemented only for the frozen issue #10 and #13 slices. |
| `@ismail-elkorchi/textpipeline` | `implemented` | The synchronous deterministic processor contract and execution trace are implemented; async, streaming, batching, and caching are still absent. |
| `@ismail-elkorchi/textcorpus` | `implemented` | Explicit-token corpus collections, metadata slicing, and deterministic fingerprint indexing are implemented; TF-IDF and BM25 are still absent. |
| `@ismail-elkorchi/textprotocol` | `implemented` | Result-envelope types, runtime guards, and repository schema are implemented. |
| `@ismail-elkorchi/textconformance` | `implemented` | Machine-readable conformance reports and runtime guards are implemented. |
| `@ismail-elkorchi/textlab` | `absent` | Only the workspace scaffold exists; no public inspection-command behavior is implemented yet. |

## Task status

| Task | Status | Scope |
| --- | --- | --- |
| `nlp-tokenization-sbd` | `implemented` | Frozen fixtures, expected outputs, comparator captures, and executable behavior are present for the current slices. |
| `nlp-document-annotation-model` | `implemented` | The document model, invalid-reference policy, lifecycle/provenance support, and round-trip validation are implemented. |
| `nlp-pack-resource-manifest` | `implemented` | Resource-manifest validation, licensed fixtures, and overlay-conflict policy are implemented. |
| `nlp-pos-morph-lemma` | `implemented` | Deterministic POS, lemma, and morphology outputs exist only for the frozen issue #10 slices. |
| `nlp-rule-backed-ner` | `implemented` | Deterministic rule-backed PER/ORG/LOC outputs exist only for the frozen issue #13 slices, with recorded expected outputs and comparator captures. |
| `nlp-corpus-tfidf-bm25` | `absent` | No public readiness artifacts or feature behavior are implemented yet. |
