# Rule-backed NER readiness

## Why this document exists

Issue `#13` does not permit behavior until the repository records entity label policy, allowed
fixture policy, expected-output format, documented output differences, and committed diagnostic
comparators. This document defines that readiness gate.

## Target representation

The readiness target is:

- `textdoc-document-v1` for stored annotations;
- `textprotocol-result-envelope-v1` for serialized outputs; and
- `textconformance-report-v1` for machine-readable verification references.

## Label policy

The current rule-backed NER label policy is intentionally narrow:

- `PER` — person names and aliases that identify a person mention.
- `ORG` — organization names and organization aliases.
- `LOC` — locations, including location mentions that external toolkits may label as `GPE` or
  `FAC` when the current policy does not distinguish them.

Consequences:

- The current public label policy does **not** add `MISC`, `NORP`, `PRODUCT`, `EVENT`, or
  toolkit-specific labels merely because an external comparator exposes them.
- Comparator-specific label names must be mapped explicitly to `PER`, `ORG`, or `LOC` when
  they fall inside the supported scope and documented as non-failure differences when they do not.

## Allowed fixture policy

Only these fixture classes are allowed for issue `#13` readiness and later quality reporting:

- repository-authored short texts with explicit provenance inside this repository;
- public-domain or CC0-compatible short texts whose provenance is recorded in the slice manifest; and
- derived comparator outputs generated locally from the allowed slice texts.

The repository does **not** allow:

- copied evaluation passages whose redistribution status is unclear;
- unpublished planning notes, prompts, or evaluation bundles; or
- hidden gold outputs produced by opaque external systems.

## Input slices

The canonical readiness slices live in
[`../../fixtures/rule-backed-ner/slices.json`](../../fixtures/rule-backed-ner/slices.json).

They cover:

- aliases;
- capitalization ambiguity;
- false matches;
- nested and overlapping spans;
- a non-English Latin-script slice; and
- a non-Latin-script slice.

## Rule priority and tie-break policy

The frozen readiness policy for future feature work is:

1. exact-case canonical-name and alias matches outrank case-folded fallbacks;
2. longer spans win inside the same rule family when two matches start at different lengths;
3. unresolved same-priority overlap becomes an explicit diagnostic instead of a silent drop; and
4. lowercase common nouns do not become `ORG` matches purely because a case-insensitive alias
   exists elsewhere in the lexicon.

## Overlap and nested-span policy

- Nested spans are legal in repository outputs and must round-trip through `textdoc`.
- Any expected artifact that contains overlapping or nested entity spans must set
  `allowSpanOverlap: true` on the entity layer.
- Flat comparator outputs are diagnostic evidence only; they do not narrow the repository
  representation.

## Expected-output format

Recorded expected outputs live in
[`../../fixtures/rule-backed-ner/expected/`](../../fixtures/rule-backed-ner/expected/).

Each expected artifact validates against
[`../../schemas/rule-backed-ner-expected-v1.schema.json`](../../schemas/rule-backed-ner-expected-v1.schema.json)
and records:

- source text and source hash;
- token and sentence layers over the frozen text; and
- entity annotations using the `PER` / `ORG` / `LOC` label policy.

## Comparator freeze

Frozen comparator versions live in
[`../../fixtures/rule-backed-ner/tool-versions.json`](../../fixtures/rule-backed-ner/tool-versions.json).

The current frozen comparator set is English-first:

- `spaCy 3.8.14` with `en_core_web_sm 3.8.0`;
- `compromise 14.15.0`.

## Comparator outputs

Committed comparator captures live in
[`../../fixtures/rule-backed-ner/comparisons/`](../../fixtures/rule-backed-ner/comparisons/).

Comparator outputs are diagnostic evidence, not normative expected outputs. A slice may appear as
`not-run` in a comparator capture when that frozen comparator is outside its declared language
surface; the not-run reason is itself part of the committed artifact.

## Verification

`npm run -s check:fixtures` validates the slice manifest, comparator/version freeze, committed
comparator outputs, recorded expected outputs, required readiness documentation headings, and
result-envelope/conformance representability before any feature PR for issue `#13`.
