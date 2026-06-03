# Documents

`TextDocument` is a record-backed container:

- `sources` store decoded text and input metadata.
- `views` store raw or derived text views.
- `spanMaps` map offsets between views.
- `layers` group annotations.
- `graphs` connect annotations for dependency, parse, coreference, link, term, quality, and alignment data.
- `metadata` carries caller-owned document metadata.

`createDocument` is deterministic. Without caller ids it uses `document`, `source`, and `raw`.
