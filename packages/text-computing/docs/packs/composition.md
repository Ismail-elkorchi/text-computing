# Composition

`composePacks` combines loaded packs in caller-declared order. Duplicate resource ids fail unless
the caller sets an explicit conflict policy.

Composed packs merge resource descriptors, target fields, component provenance, artifacts,
citations, and capability slots deterministically.
