<!-- This file is generated. Do not edit it by hand. -->
<!-- Source: fixtures/performance/gates.v1.json -->

# Performance gates

This document is generated from `fixtures/performance/gates.v1.json`.

## Why this document exists

Small fixture correctness can be mistaken for operational scale. This document keeps operational claims tied to measured gates.

## Gate dimensions

- `throughput`
- `memory`
- `streaming`
- `large-corpus`
- `regression-threshold`

## Current boundary

The current manifest defines deterministic performance and scale gates. Broader operational claims require measured evidence against these gates.

## Gates

| Gate | Package | Surface | Dimensions | Thresholds | Regression policy | Limitations |
| --- | --- | --- | --- | --- | --- | --- |
| `textfacts-tokenization-sbd` | `@ismail-elkorchi/textfacts` | UAX #29 tokenization and sentence-boundary segmentation over committed tokenization/SBD fixtures | `throughput`<br>`memory`<br>`large-corpus`<br>`regression-threshold` | — | Future measurements must pin corpus gate hash, expected-output hash set, runtime, command, and environment before timing or memory thresholds become blocking checks. | Current tokenization/SBD performance gate records scale-evidence requirements; it does not persist stable wall-clock or memory measurements. |
| `textdoc-roundtrip` | `@ismail-elkorchi/textdoc` | Document validation and round-trip serialization | `throughput`<br>`memory`<br>`regression-threshold` | — | Future measurements must store baseline environment, command, input hash, and threshold before becoming required checks. | Current gate records measurement requirements; it does not persist timing or memory measurements. |
| `textpipeline-determinism` | `@ismail-elkorchi/textpipeline` | Deterministic local processor graph execution | `throughput`<br>`memory`<br>`streaming`<br>`regression-threshold` | — | Future measurements must fail on threshold regression only after a stable benchmark host policy exists. | Current implementation is local and in-memory; no stable wall-clock or memory measurement threshold is enforced. |
| `textcorpus-retrieval` | `@ismail-elkorchi/textcorpus` | Corpus analysis, scoring, and retrieval | `throughput`<br>`memory`<br>`large-corpus`<br>`regression-threshold` | minDocuments: 12; minTokens: 70; minQueries: 6; maxSerializedIndexBytes: 50000 | Corpus-analysis and retrieval measurements must pin corpus hash, query hash where applicable, formula, ordering policy, qrels where applicable, and metric tolerance before broader claims. | Current corpus-analysis and retrieval proof uses committed explicit-token corpora and deterministic size thresholds; it does not persist stable wall-clock or memory measurements. |
| `textpack-lookup` | `@ismail-elkorchi/textpack` | Pack manifest validation and resource lookup | `throughput`<br>`memory`<br>`large-corpus`<br>`regression-threshold` | — | Future measurements must include duplicate and overlay-conflict controls. | Current resource fixtures are small contract fixtures. |
| `textconformance-reporting` | `@ismail-elkorchi/textconformance` | Conformance report validation and summarization | `throughput`<br>`memory`<br>`regression-threshold` | — | Future measurements must distinguish validation cost from report rendering cost. | Current runner behavior is minimal and not a benchmark harness. |
| `textrules-pattern-matching` | `@ismail-elkorchi/textrules` | Rule pattern matching, resource-backed analysis, and deterministic annotation generation | `throughput`<br>`memory`<br>`large-corpus`<br>`regression-threshold` | — | Future measurements must pin rule fixture hashes, resource fixture hashes, and deterministic match ordering policy. | Current rule behavior is proven only for curated fixtures and small resources. |
| `textlab-evidence-inspection` | `@ismail-elkorchi/textlab` | Evidence manifest, replay, conformance report, annotation, and corpus fixture inspection | `throughput`<br>`memory`<br>`large-corpus`<br>`regression-threshold` | — | Future measurements must separate parsing, summarization, and rendering costs. | Current textlab behavior is repository-fixture inspection, not an interactive or large-corpus UI. |

## Notes

- This file records performance gate requirements before broad operational claims.
- It intentionally avoids unstable wall-clock assertions until benchmark-host policy is defined.

## Verification

Run `node tools/validate-performance-gates.mjs` and `npm run -s check:status-docs`.
