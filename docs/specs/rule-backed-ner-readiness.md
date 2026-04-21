# Rule-backed NER readiness

## Why this document exists

Issue `#13` does not permit behavior until the repository records entity label policy, allowed
fixture policy, expected-output format, and documented output differences. This document defines
that readiness gate.

## Target representation

The readiness target is:

- `textdoc-document-v1` for stored annotations;
- `textprotocol-result-envelope-v1` for serialized outputs; and
- ambiguity-aware `entity` annotations with explicit provenance and deterministic conflict
  diagnostics.

## Label policy

The current rule-backed NER label policy is intentionally narrow:

- `PER` — person names and aliases that identify a person mention.
- `ORG` — organization names and organization aliases.
- `LOC` — locations, including location mentions that external toolkits may label as `GPE` or
  `FAC` when the current policy does not distinguish them.

Consequences:

- The current public label policy does **not** add `MISC`, `NORP`, `PRODUCT`, `EVENT`, `DATE`, or
  toolkit-specific labels merely because an external comparator exposes them.
- Nested and overlapping entity spans remain legal in the repository representation even if a
  comparator emits only flat spans.
- Comparator-specific label names must be mapped explicitly to `PER`, `ORG`, or `LOC` when they
  fall inside the supported scope, and documented as non-failure differences when they do not.

## Allowed fixture policy

Only these fixture classes are allowed for issue `#13` readiness and later quality reporting:

- repository-authored short texts with explicit provenance inside this repository;
- public-domain or CC0-compatible short texts whose provenance is recorded in the slice manifest; and
- derived comparator outputs generated locally from the allowed slice texts.

The repository does **not** allow:

- copied evaluation passages whose redistribution status is unclear;
- private workbench notes, prompts, or unpublished evaluation bundles; or
- hidden gold outputs produced by opaque external systems.

## Input slices

The canonical readiness slices live in
[`../../fixtures/rule-backed-ner/slices.json`](../../fixtures/rule-backed-ner/slices.json).

They cover:

- nested spans;
- overlapping spans;
- aliases;
- capitalization ambiguity; and
- false matches.

## Expected-output format

Future recorded outputs must validate against
[`../../schemas/rule-backed-ner-expected-v1.schema.json`](../../schemas/rule-backed-ner-expected-v1.schema.json),
which wraps a `textdoc` document containing token, sentence, and entity layers for a single slice.

## Comparator freeze

Frozen comparator versions live in
[`../../fixtures/rule-backed-ner/tool-versions.json`](../../fixtures/rule-backed-ner/tool-versions.json).

## Verification

`npm run -s check:fixtures` validates the slice manifest, comparator/version freeze, expected-output
schema, and required readiness documentation headings before any feature PR for issue `#13`.
