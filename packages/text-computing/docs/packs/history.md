# Changelog

## 0.1.0

- Reset the public surface to the final `TextPackManifest`, `ResourceKind`, `PackResourceMap`, and
  runtime pack-loading APIs.
- Add pure final `validateManifest`, `createPack`, `loadPack`, `composePacks`, `listResources`,
  `getResource`, and `capabilities` APIs.
- Keep the runtime package focused on manifest validation, pack loading, pack composition, resource
  querying, and capability summaries.
- Add final package docs, runtime smoke checks, and publish-tree audits.

## 0.0.0

- Establish package workspace metadata.
- Add the initial manifest contract, manifest guards, and deterministic resource lookup ordering.
- Add pure fixture resource loaders for stopwords, abbreviation lists, lexicons, and gazetteers.
