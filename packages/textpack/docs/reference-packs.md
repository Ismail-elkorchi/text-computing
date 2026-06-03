# Reference Packs

Every resource pack exports `manifest`, `resources`, and default `{ manifest, resources }`.

Reference packs may also publish raw files under `resources/` for inspection and attribution, but
runtime loading uses the exported `PackResourceMap`.
