# `textpack` fixtures

This fixture set records public pack manifests and resource files for issue `#12`.

- `manifests/` contains valid resource-pack manifests used to prove deterministic lookup.
- `invalid/` contains manifests and manifest pairs that remain schema-valid but fail semantic
  validation for duplicate ids, missing provenance, missing licenses, or overlay conflicts.
- `resources/` contains small licensed fixture resources for stopwords, abbreviations, lexicons, and
  gazetteers.

These fixtures are contract proofs for resource handling. They are not claims that all downstream
rule execution is already implemented.
