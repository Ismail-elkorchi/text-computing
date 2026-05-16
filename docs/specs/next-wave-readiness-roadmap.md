# Next-wave readiness roadmap

This roadmap defines the next implementation gates after the current slice-proven foundation. It exists to prevent closed issues from being mistaken for broad NLP parity.

The CoNLL-U / UD interchange and dependency parser rows are now tracked as fixture-scope `slice-proven` in support status. That means import/export round-trip behavior and deterministic parser arcs exist for frozen repository-authored fixtures, not broad UD treebank behavior.

## Gate rules

- No next-wave feature code starts without a public research ledger, frozen fixtures, comparator versions, expected-output schema, negative controls, and support-status entry.
- External libraries and papers are evidence sources, not package-boundary commands.
- A task can move from `scaffold` to `readiness-only` only after fixture and comparator artifacts are committed.
- A task can move from `readiness-only` to `slice-proven` only after executable behavior passes the frozen artifacts.

## Required next task surfaces

| Order | Task surface | Owning package(s) | Readiness artifacts required before code |
| --- | --- | --- | --- |
| 1 | CoNLL-U / UD import-export and dependency annotation model | `textdoc`, `textprotocol`, `textconformance` | Completed for frozen repository-authored fixtures; broaden only with explicit fixture and license gates. |
| 2 | Deterministic dependency parsing baseline | `textrules`, `textpipeline`, `textdoc` | Completed for frozen en-basic, es-mwt, and ar-nonlatin slices; broaden only with explicit UD slices, comparator captures, and performance gates. |
| 3 | Chunking and relation extraction | `textrules`, `textdoc`, `textconformance` | Relation extraction readiness-only schemas, fixtures, and negative controls are present; feature work still requires recorded expected outputs and executed comparator captures. |
| 4 | Entity linking | `textrules`, `textpack`, `textdoc` | Canonical entity identifier model, NIL policy, KB provenance fixture, disambiguation negative controls. |
| 5 | Coreference | `textdoc`, `textrules`, `textconformance` | Coreference readiness-only schemas, fixtures, and negative controls are present; feature work still requires recorded expected outputs and executed comparator captures. |
| 6 | Full retrieval | `textcorpus`, `textpipeline`, `textconformance` | Query parsing, inverted-index lookup, BM25 explanation, snippets, and frozen-corpus validation are present; broaden only with relevance judgments, larger corpora, fielded query syntax, streaming behavior, and performance budgets. |
| 7 | `textlab` inspection tools | `textlab`, all public packages | Support-status inspection is present; remaining gates are fixture replay commands, annotation query examples, report rendering tests, and comparator replay. |

## Research evidence requirements

Each task ledger must cite at least:

- one standard or dataset specification when available;
- one official comparator/tool documentation source;
- one peer-reviewed survey, review, or system paper when available;
- one explicit legacy-debt statement describing what the TypeScript implementation must avoid.

## Agent/LLM integration requirements

Future LLM-facing APIs must return deterministic evidence objects, not prose-only answers. Every answerable span must carry `textdoc` target ids, source provenance, and a conformance/report reference when available.
