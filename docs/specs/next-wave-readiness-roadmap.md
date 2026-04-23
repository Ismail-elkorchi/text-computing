# Next-wave readiness roadmap

This roadmap defines the next implementation gates after the current slice-proven foundation. It exists to prevent closed issues from being mistaken for broad NLP parity.

## Gate rules

- No next-wave feature code starts without a public research ledger, frozen fixtures, comparator versions, expected-output schema, negative controls, and support-status entry.
- External libraries and papers are evidence sources, not package-boundary commands.
- A task can move from `scaffold` to `readiness-only` only after fixture and comparator artifacts are committed.
- A task can move from `readiness-only` to `slice-proven` only after executable behavior passes the frozen artifacts.

## Required next task surfaces

| Order | Task surface | Owning package(s) | Readiness artifacts required before code |
| --- | --- | --- | --- |
| 1 | CoNLL-U / UD import-export and dependency annotation model | `textdoc`, `textprotocol`, `textconformance` | UD/CoNLL-U research ledger, valid/invalid CoNLL-U fixtures, dependency-target schema, round-trip tests. |
| 2 | Deterministic dependency parsing baseline | `textrules`, `textpipeline`, `textdoc` | Comparator captures from UD-capable tools, language slices, expected dependency arcs, documented non-failure differences. |
| 3 | Chunking and relation extraction | `textrules`, `textdoc`, `textconformance` | Typed relation schema, span evidence policy, negative controls, comparator/corpus freeze. |
| 4 | Entity linking | `textrules`, `textpack`, `textdoc` | Canonical entity identifier model, NIL policy, KB provenance fixture, disambiguation negative controls. |
| 5 | Coreference | `textdoc`, `textrules`, `textconformance` | Mention/chain schema, ambiguity/loss policy, multilingual corpus slices, comparator captures. |
| 6 | Full retrieval | `textcorpus`, `textpipeline`, `textconformance` | Inverted-index contract, query model, BM25 explanation format, snippets, relevance judgments, and performance budgets. |
| 7 | `textlab` inspection tools | `textlab`, all public packages | CLI command contract, fixture replay commands, annotation query examples, and report rendering tests. |

## Research evidence requirements

Each task ledger must cite at least:

- one standard or dataset specification when available;
- one official comparator/tool documentation source;
- one peer-reviewed survey, review, or system paper when available;
- one explicit legacy-debt statement describing what the TypeScript implementation must avoid.

## Agent/LLM integration requirements

Future LLM-facing APIs must return deterministic evidence objects, not prose-only answers. Every answerable span must carry `textdoc` target ids, source provenance, and a conformance/report reference when available.
