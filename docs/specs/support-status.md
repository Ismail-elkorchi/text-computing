# Support status

This document is generated from `docs/specs/support-status.v1.json`. Do not edit it by hand; update
the JSON source and rerun `node tools/validate-support-status.mjs --write` if the canonical status
changes.

## Status labels

- `scaffold` — workspace or package shell exists, but no ratified behavior exists yet.
- `readiness-only` — frozen artifacts exist, but behavior is not implemented yet.
- `slice-proven` — executable behavior exists only for declared frozen slices or fixtures.
- `beta` — broader package behavior exists with multi-runtime or conformance evidence, but production support is not yet claimed.
- `production-candidate` — broad support, conformance, packaging, and operational evidence are available for the declared scope.

## Package status

| Package | Status | Scope | Evidence | Limitations |
| --- | --- | --- | --- | --- |
| `@ismail-elkorchi/textfacts` | `beta` | Deterministic single-text kernel. Legacy public pack/protocol/schema helpers are frozen; new cross-package growth does not land here. | Unicode conformance tests<br>published package metadata<br>multi-runtime tests | New cross-package protocol/resource growth is frozen outside textfacts<br>Locale tailoring breadth remains limited |
| `@ismail-elkorchi/textdoc` | `slice-proven` | Document containers, lifecycle, provenance, and annotation-layer validation are implemented. | document-model fixtures<br>invalid-reference validator<br>runtime guards<br>dist export readiness metadata | No dependency tree, coreference chain, or relation graph conventions are production-grade yet<br>Package remains private until broader release gates pass |
| `@ismail-elkorchi/textpack` | `slice-proven` | Manifest validation, licensed fixture resources, overlay precedence, and conflict diagnostics are implemented. | resource manifest fixtures<br>overlay conflict tests<br>provenance/license validation<br>dist export readiness metadata | No broad multilingual resource marketplace or vetting workflow is implemented<br>Package remains private until broader release gates pass |
| `@ismail-elkorchi/textrules` | `slice-proven` | Rule-backed POS, lemma, morphology, and NER behavior is implemented only for the frozen issue #10 and #13 slices. | POS/morph/lemma frozen slices<br>rule-backed NER frozen slices<br>textdoc/protocol/conformance tests<br>dist export readiness metadata | Behavior is limited to curated fixtures and small hand-authored resources<br>Package remains private until broader release gates pass |
| `@ismail-elkorchi/textpipeline` | `slice-proven` | The synchronous deterministic processor contract and execution trace are implemented; async, streaming, batching, and caching are still absent. | processor ordering tests<br>trace validation<br>missing-requirement diagnostics<br>dist export readiness metadata | No async, streaming, batching, cache, or distributed execution<br>Package remains private until broader release gates pass |
| `@ismail-elkorchi/textcorpus` | `slice-proven` | Explicit-token corpus collections, metadata slicing, deterministic fingerprint indexing, and frozen-scope TF-IDF/BM25 scoring are implemented. | explicit-token corpus tests<br>fingerprint index tests<br>frozen TF-IDF/BM25 corpus<br>dist export readiness metadata | No full IR index, query language, ranking evaluation, snippets, or large corpora<br>Package remains private until broader release gates pass |
| `@ismail-elkorchi/textprotocol` | `slice-proven` | Result-envelope types, runtime guards, and repository schema are implemented. | result-envelope schema<br>runtime guards<br>repository fixture validation<br>dist export readiness metadata | No version-negotiation or transport protocol is standardized<br>Package remains private until broader release gates pass |
| `@ismail-elkorchi/textconformance` | `slice-proven` | Machine-readable conformance reports and runtime guards are implemented. | conformance report schema<br>runtime guards<br>minimal synchronous runner tests<br>dist export readiness metadata | Runner behavior is minimal and not a full benchmark harness yet<br>Package remains private until broader release gates pass |
| `@ismail-elkorchi/textlab` | `scaffold` | Only the workspace scaffold exists; no public inspection-command behavior is implemented yet. | workspace package scaffold<br>dist export readiness metadata | No public CLI or inspection behavior exists<br>Package remains private until broader release gates pass |

## Task status

| Task | Status | Scope | Evidence | Limitations |
| --- | --- | --- | --- | --- |
| `nlp-tokenization-sbd` | `slice-proven` | Frozen fixtures, expected outputs, comparator captures, and executable behavior are present for the current slices. | frozen tokenization/SBD fixtures<br>expected outputs<br>comparator captures | Not a broad multilingual tokenizer benchmark suite |
| `nlp-document-annotation-model` | `slice-proven` | The document model, invalid-reference policy, lifecycle/provenance support, and round-trip validation are implemented. | document model example<br>invalid fixtures<br>round-trip validation | No full syntactic dependency/coreference/relation graph standard yet |
| `nlp-pack-resource-manifest` | `slice-proven` | Resource-manifest validation, licensed fixtures, and overlay-conflict policy are implemented. | manifest fixtures<br>licensed resource fixtures<br>overlay conflict cases | No public resource review workflow or registry is implemented |
| `nlp-pos-morph-lemma` | `slice-proven` | Deterministic POS, lemma, and morphology outputs exist only for the frozen issue #10 slices. | frozen POS/morph/lemma slices<br>expected outputs<br>package tests | Not a trained or broad multilingual tagger; fixture-bound deterministic behavior only |
| `nlp-rule-backed-ner` | `slice-proven` | Deterministic rule-backed PER/ORG/LOC outputs exist only for the frozen issue #13 slices, with recorded expected outputs and comparator captures. | frozen rule-backed NER slices<br>expected outputs<br>comparator captures | Only PER/ORG/LOC and small curated resources are covered |
| `nlp-corpus-tfidf-bm25` | `slice-proven` | Deterministic raw TF, smooth TF-IDF, and Okapi BM25 outputs exist only for the frozen issue #14 explicit-token corpus. | explicit-token corpus fixture<br>scikit-learn/rank-bm25/Natural captures<br>numeric tolerance tests | No full retrieval engine, query parser, snippets, or relevance benchmark |
