# Manifest

`TextPackManifest` declares a pack id, display name, version, npm package name, final resource
kinds, targets, engine compatibility, resource descriptors, dependencies, capabilities, and optional
license/citation data.

Validation rejects old V1 manifest fields, non-final resource kinds, unknown capability keys, bad
target modalities, duplicate resource ids, and non-JSON metadata.
