# Changelog

## 0.1.0

- Add a public pack-manifest schema-family exchange example with textprotocol transport.
- Migrate the manifest model to `manifestVersion`, pack `id`, resource-family maps, `provides`,
  compatibility metadata, review state, and required pack tests.
- Add compatibility checks, explicit pack composition, package governance diagnostics, and support
  for reference `textpack-*` package validation.
- Promote the resource package surface to public alpha for bounded package interop.
- Keep multilingual pack breadth and resource-vetting workflow outside the alpha support statement.

## 0.0.0

- Establish package workspace metadata.
- Add the `textpack-manifest-v1` contract, manifest guards, and deterministic resource lookup ordering.
- Add pure fixture resource loaders for stopwords, abbreviation lists, lexicons, and gazetteers.
