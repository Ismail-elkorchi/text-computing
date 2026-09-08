---
"@ismail-elkorchi/text-computing": minor
"@ismail-elkorchi/textpack-ar": patch
"@ismail-elkorchi/textpack-en": patch
"@ismail-elkorchi/textpack-fr": patch
---

Consolidate runtime implementations into one modular library with public domain
subpaths. Remove retired runtime package entrypoints, duplicate build/release
scaffolding, conversion-only document APIs, and label-only rule task factories.

Use canonical documents throughout analysis, serialization, rules, pipelines,
corpora, and search. Share processor and diagnostic contracts; fingerprint
configured rules and model content. Expose typed analysis projections and keep
classical learning available directly. Generate dependency-free data packs with
validation at the library boundary. Preserve and run module regression suites
and verify the packed public namespace independently of the workspace.
