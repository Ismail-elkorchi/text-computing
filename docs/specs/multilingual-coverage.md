# Multilingual coverage

- **Status:** Draft 0.1
- **Scope:** Public support-tier language for multilingual evidence
- **Data:** `fixtures/multilingual-support/coverage.v1.json`
- **Schema:** `schemas/multilingual-coverage-v1.schema.json`
- **External breadth reference:** Universal Dependencies 2.18, released 2026-05-15 with 353 treebanks and 193 languages.

## Why this document exists

Multilingual claims can drift from “Unicode handles this string” to “the library supports this language.” This document prevents that drift by separating Unicode-invariant behavior, fixture evidence, resources, comparator evidence, and corpus evidence.

## Tier definitions

- `unicode-invariant` — behavior is defined by Unicode-pinned algorithms and exact offset contracts.
- `fixture-proven` — behavior is proven only for frozen named fixtures and expected outputs.
- `resource-backed` — behavior depends on declared resources with license and provenance metadata.
- `comparator-backed` — evidence includes named external tool/version output or validation.
- `corpus-backed` — behavior is backed by frozen corpus/document fixtures and aggregate expected outputs.

## Current coverage matrix

The authoritative machine-readable matrix is `fixtures/multilingual-support/coverage.v1.json`.

Current public evidence is partial. It includes Unicode conformance, tokenization/SBD smoke fixtures, CoNLL-U round-trip fixtures, selected comparator captures, and a small explicit-token corpus fixture. It does not establish broad support for every language, writing system, genre, domain, or task.

## Script fixture expansion

The matrix adds coverage-seed inputs for Arabic, Armenian, Bengali, Cyrillic, Devanagari, Ethiopic, Georgian, Greek, Han, Hangul, Hebrew, Khmer, Latin-script language-family cases, Tamil, and Thai. These inputs are script and family coverage seeds. They are not task behavior claims until a task-specific gate records expected outputs, comparator captures where applicable, and conformance reports.

The matrix also records breadth axes for families and morphology profiles represented in UD 2.18. These axes prevent a small fixture set from being read as language coverage.

## Interpretation rules

- A language/script fixture is not a support claim by itself.
- A Unicode-invariant claim does not imply language-aware morphology, parsing, NER, retrieval, or coreference.
- A comparator capture is diagnostic evidence, not a compatibility promise.
- Public claims must stay at the lowest tier supported by committed evidence.
