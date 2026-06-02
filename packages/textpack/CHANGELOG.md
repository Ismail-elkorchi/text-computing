# Changelog

## 0.1.0

- Add catalog update-plan APIs for before/after manifest catalogs, version/review/resource deltas,
  and inventory-audited update workflow evidence.
- Add textpack review-report APIs for manifest governance, inventory, compatibility, review-state
  transition, and evidence-policy diagnostics.
- Migrate the manifest model to `manifestVersion`, pack `id`, resource-family maps, `provides`,
  compatibility metadata, review state, and required pack tests.
- Add compatibility checks, explicit pack composition, package governance diagnostics, and support
  for reference `textpack-*` package validation.
- Promote the resource package surface to public alpha for bounded package interop.
- Keep multilingual pack breadth and external resource-vetting breadth outside the alpha support statement.

## 0.0.0

- Establish package workspace metadata.
- Add the `textpack-manifest-v1` contract, manifest guards, and deterministic resource lookup ordering.
- Add pure fixture resource loaders for stopwords, abbreviation lists, lexicons, and gazetteers.
