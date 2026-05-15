# Multilingual support tiers

- **Status:** Draft 0.1
- **Scope:** Public support-tier language for multilingual evidence
- **Data:** `fixtures/multilingual-support/tier-matrix.v1.json`
- **Schema:** `schemas/multilingual-support-tiers-v1.schema.json`

## Why this document exists

Multilingual claims can drift from “Unicode handles this string” to “the library supports this language.” This document prevents that drift by separating Unicode-invariant behavior, fixture evidence, resources, comparator evidence, and corpus evidence.

## Tier definitions

- `unicode-invariant` — behavior is defined by Unicode-pinned algorithms and exact offset contracts.
- `fixture-proven` — behavior is proven only for frozen named fixtures and expected outputs.
- `resource-backed` — behavior depends on declared resources with license and provenance metadata.
- `comparator-backed` — evidence includes named external tool/version output or validation.
- `corpus-backed` — behavior is backed by frozen corpus/document fixtures and aggregate expected outputs.

## Current support matrix

The authoritative machine-readable matrix is `fixtures/multilingual-support/tier-matrix.v1.json`.

Current public evidence is partial. It includes Unicode conformance, tokenization/SBD smoke fixtures, CoNLL-U round-trip fixtures, selected comparator captures, and a small explicit-token corpus fixture. It does not establish broad support for every language, writing system, genre, domain, or task.

## Script fixture expansion

The matrix adds readiness-only inputs for Devanagari, Cyrillic, Hebrew, and Ethiopic. These inputs are script coverage seeds. They are not task behavior claims until a task-specific gate records expected outputs, comparator captures where applicable, and conformance reports.

## Interpretation rules

- A language/script fixture is not a support claim by itself.
- A Unicode-invariant claim does not imply language-aware morphology, parsing, NER, retrieval, or coreference.
- A comparator capture is diagnostic evidence, not a compatibility promise.
- Public claims must stay at the lowest tier supported by committed evidence.
