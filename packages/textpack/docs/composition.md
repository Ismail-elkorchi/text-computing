# Composition

`composePacks` combines loaded packs in caller-declared order. Duplicate resource ids fail unless
the caller sets an explicit conflict policy.

Composed packs merge resource descriptors, target fields, component provenance, artifacts,
citations, and capability slots deterministically.

`resolvePackComponents` loads a recipe composite's required components through a caller-provided
component resolver, optionally loads selected optional components, enforces component license and
artifact policy, and returns the resolved composed pack. Required missing components fail with a
clear error; skipped optional components are represented through generated gap notes when they are
explicitly requested or resolution is non-strict.
