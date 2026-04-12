# `@ismail-elkorchi/textdoc`

Document annotation container package.

## Token and sentence annotations

The initial public contract is a minimal TypeScript annotation set, mirrored by
[`../../schemas/textdoc-token-sentence-annotation-set-v1.schema.json`](../../schemas/textdoc-token-sentence-annotation-set-v1.schema.json),
that can hold tokenization/SBD issue #9 outputs:

- UTF-16 code unit spans;
- `uax29-word-boundary-token` and `lexical-token` token annotations;
- `uax29-sentence` sentence annotations;
- optional source hash, Unicode version, text slices, and notes.

The package does not perform tokenization or sentence segmentation. It only defines a container shape
for annotations produced elsewhere in the workspace.
