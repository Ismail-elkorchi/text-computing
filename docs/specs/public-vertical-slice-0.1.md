# Public Vertical Slice 0.1

## Status

Draft public implementation target.

## Purpose

This slice verifies that an external TypeScript consumer can install built package tarballs and run one deterministic text-processing path through the core packages without workspace-path imports or unexported source imports.

This document is not a new NLP task statement. It is a package-interoperation statement for one small fixture and one bounded pipeline.

## Pipeline

The required path is:

1. accept raw text;
2. normalize and segment with `@ismail-elkorchi/textfacts`;
3. create a `@ismail-elkorchi/textdoc` document with source, token, and sentence layers;
4. load explicit fixture resources with `@ismail-elkorchi/textpack`;
5. run `@ismail-elkorchi/textrules` over the existing `textdoc` token layer;
6. execute the processor through `@ismail-elkorchi/textpipeline`;
7. wrap the result with `@ismail-elkorchi/textprotocol`;
8. summarize declared checks with `@ismail-elkorchi/textconformance`;
9. inspect the output with `@ismail-elkorchi/textlab`;
10. print deterministic machine-readable JSON.

## Package roles

| Package | Slice role |
| --- | --- |
| `@ismail-elkorchi/textfacts` | Owns Unicode normalization and segmentation behavior. |
| `@ismail-elkorchi/textdoc` | Owns the document, views, token layer, sentence layer, and annotation container. |
| `@ismail-elkorchi/textpack` | Owns resource manifest validation, resource loading, provenance, and lookup policy. |
| `@ismail-elkorchi/textrules` | Owns rule matching over existing `textdoc` token annotations. |
| `@ismail-elkorchi/textpipeline` | Owns deterministic processor ordering and trace output. |
| `@ismail-elkorchi/textprotocol` | Owns the result envelope and payload-kind compatibility checks. |
| `@ismail-elkorchi/textconformance` | Owns declared machine-readable checks for the slice. |
| `@ismail-elkorchi/textlab` | Owns deterministic inspection of the resulting document/report payloads. |

## Input fixture

The public smoke fixture is:

```text
Alice visits Paris. Bob visits Paris.
```

The fixture is intentionally small. It verifies package interoperation and installability, not broad language coverage.

## Expected output contract

The external-consumer smoke test MUST emit one JSON object with these top-level fields:

- `schemaVersion`: `1`;
- `sliceId`: `public-vertical-slice-0.1`;
- `input.rawText`: the fixture text;
- `textfacts.normalizedText`: the NFC-normalized fixture text;
- `textdoc.document`: a valid `TextDocDocumentV1`;
- `textpack.resources`: the loaded fixture resource ids and provenance ids;
- `textrules.annotations`: deterministic resource-backed annotation ids and resource references;
- `textpipeline.trace`: a valid deterministic trace;
- `textprotocol.envelope`: a valid result envelope;
- `textconformance.report`: a valid conformance report;
- `textlab.inspection`: deterministic inspection data.

For the required fixture, the token layer MUST preserve the following UTF-16 code-unit spans from the declared `textfacts` word-boundary segmentation:

| Token id | Text | Start CU | End CU |
| --- | --- | ---: | ---: |
| `token-1` | `Alice` | 0 | 5 |
| `token-2` | ` ` | 5 | 6 |
| `token-3` | `visits` | 6 | 12 |
| `token-4` | ` ` | 12 | 13 |
| `token-5` | `Paris` | 13 | 18 |
| `token-6` | `.` | 18 | 19 |
| `token-7` | ` ` | 19 | 20 |
| `token-8` | `Bob` | 20 | 23 |
| `token-9` | ` ` | 23 | 24 |
| `token-10` | `visits` | 24 | 30 |
| `token-11` | ` ` | 30 | 31 |
| `token-12` | `Paris` | 31 | 36 |
| `token-13` | `.` | 36 | 37 |

The sentence layer MUST preserve:

| Sentence id | Text | Start CU | End CU |
| --- | --- | ---: | ---: |
| `sentence-1` | `Alice visits Paris. ` | 0 | 20 |
| `sentence-2` | `Bob visits Paris.` | 20 | 37 |

The rule-backed annotation output MUST be derived only from explicit fixture resources and MUST include provenance references to the resource id and rule id used for each emitted annotation.

## Statement boundary

This slice verifies only:

- packaged entrypoints can be installed from tarballs and used by an external consumer;
- the listed packages can exchange the declared fixture payloads;
- the fixture output is deterministic and traceable;
- boundary checks reject new production imports from frozen legacy `textfacts` subpaths.

It does not assert broad tokenization, tagging, entity extraction, retrieval, parsing, relation extraction, coreference, linking, topic modeling, embedding, model inference, or ingestion support.

## Non-goals for this phase

This phase MUST NOT expand retrieval, dependency parsing, relation extraction, coreference, entity linking, word-sense disambiguation, topic modeling, embeddings, model inference, LLM/RAG workflows, PDF/XML/HTML ingestion, large-corpus browsing, new non-product evidence matrices, or new support levels.

## Acceptance commands

At phase completion, the implementation MUST pass:

```sh
npm run -s lint
npm run -s build
npm run -s schema:validate
npm run -s check:fixtures
npm run -s test:all
npm run -s check:release-gates
npm run -s check:pack:workspaces
npm run -s smoke:public-vertical-slice
```

The phase MUST also pass an external-consumer smoke test that installs built package tarballs in a temporary project outside this repository and imports only package entrypoints.
