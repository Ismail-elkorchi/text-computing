# `textpack` fixtures

This fixture set records public pack manifests and resource files for issue `#12`.

- `manifests/` contains valid resource-pack manifests used to verify deterministic lookup.
- `invalid/` contains manifests and manifest pairs that remain schema-valid but fail semantic
  validation for duplicate ids, missing provenance, missing licenses, or overlay conflicts.
- `resources/` contains small licensed fixture resources for stopwords, abbreviations, lexicons, and
  gazetteers, including English and French fixture packs used to verify deterministic language
  selection.
- `catalog.v1.json` and `review-report.v1.json` are generated package evidence artifacts for
  deterministic pack discovery and pack review/vetting behavior.

These fixtures are contract verifications for resource handling. They do not assert that all downstream
rule execution is already implemented.
