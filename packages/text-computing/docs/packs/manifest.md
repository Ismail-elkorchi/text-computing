# Manifest

`TextPackManifest` declares a schema version, pack id, display name, package version, npm package
name, targets, engine compatibility, resource descriptors, optional component packs, optional
artifact descriptors, capability slots, generated gap notes, and optional license/citation data.

Validation rejects unknown manifest fields, non-final resource kinds, unknown capability keys inside
capability slots, bad target modalities, duplicate resource ids, dangling slot references, and
non-JSON metadata.
