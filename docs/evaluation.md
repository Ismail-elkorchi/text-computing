# Evaluation and readiness

## Current status

The project is alpha. It can process real English, French, and Modern Standard
Arabic text in controlled deterministic workflows. Its strongest current uses
are Unicode segmentation, normalization, resource-backed lexical and morphology
lookup, search analysis, explicit-mention KB linking, and rule-based quality
diagnostics.

The current runtime is not a substitute for contextual NLP suites for NER,
statistical POS tagging, dependency parsing, coreference, embeddings, or neural
inference. Its present strengths are reproducibility, Unicode/version pinning,
inspectable evidence, explicit resource ownership, and audited data generation.
The platform architecture permits model-backed Capability Packs, but none may be
claimed until a compatible executor and held-out task evidence ship together.

## Committed gates

Results below were measured on 2026-08-31 with Node.js 24.14.0. The command is
`npm run -s test:nlp`; budgets, fixtures, and failures are committed code rather
than release-note assertions.

The held-out fixture contains 30 task cases across English, French, and Arabic.
All currently pass. These are focused regression cases for segmentation,
normalization, morphology, explicit-mention entity linking, and search. They are
too small and curated to support a general accuracy claim.

The external fixture contains 100 recent Tatoeba sentences per language. Its
rows were added after the forge snapshot cutoff and are deterministically
selected from checksummed exports. The gate verifies non-empty and valid word,
sentence, and grapheme spans; deterministic segmentation; idempotent
normalization; absence of implicit entity links; and unique, bounded quality
findings. It is a real-text robustness gate, not an annotated accuracy corpus.

| Language | Documents | Code units | Lexical units | Sentences | Gate failures |
| --- | ---: | ---: | ---: | ---: | ---: |
| English | 100 | 4,901 | 1,075 | 113 | 0 |
| French | 100 | 4,806 | 1,049 | 104 | 0 |
| Arabic | 100 | 3,345 | 722 | 102 | 0 |

Isolated cold-start gates use one realistic sentence and a fresh process for
each language/preset pair:

| Language | Preset | Time | Peak RSS | Budget |
| --- | --- | ---: | ---: | --- |
| English | core | 250 ms | 76 MiB | 1,500 ms / 140 MiB |
| English | lookup | 494 ms | 115 MiB | 5,000 ms / 300 MiB |
| French | core | 244 ms | 76 MiB | 1,500 ms / 140 MiB |
| French | lookup | 432 ms | 102 MiB | 5,000 ms / 300 MiB |
| Arabic | core | 228 ms | 76 MiB | 1,500 ms / 140 MiB |
| Arabic | lookup | 809 ms | 133 MiB | 5,000 ms / 300 MiB |

Timing and RSS vary by machine; the enforced budgets are the stable contract.
Arabic morphology remains the heaviest path, but its domain-scoped index keeps
cold lookup well inside the same budget used by the other languages.

## Important limitations

- Entity linking requires explicit mention spans or entity annotations. Alias
  scanning is not NER and is not used by ordinary document analysis.
- Morphology returns deterministic resource candidates; it does not perform
  contextual disambiguation.
- Sentence segmentation is pinned and tailored, but abbreviation and genre
  coverage is still limited.
- The external sample checks robustness properties, not gold linguistic labels.
- Browser and edge deployments must serve pack assets with byte-range support
  for efficient indexed lookup. Node uses direct file ranges.
- Corpus workbenches, parallel text, syntax datasets, and pipeline orchestration
  remain expert extension concerns and are intentionally absent from the
  application-facing runtime.

Before a stable release, the project needs larger independently annotated
accuracy corpora, genre/domain slices, explicit accuracy thresholds, broader
browser/edge performance measurements, and more memory headroom for Arabic
morphology.
