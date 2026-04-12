# Tokenization and sentence boundary readiness

- **Status:** Draft for issue #9
- **Scope:** Readiness artifacts only; this document does not add package behavior.
- **Primary issue:** [#9](https://github.com/Ismail-elkorchi/text-computing/issues/9)

## Required artifacts before behavior

Tokenization and sentence-boundary behavior starts only after these repository artifacts exist and validate:

- fixture slice definitions: [`fixtures/tokenization-sbd/slices.json`](../../fixtures/tokenization-sbd/slices.json)
- tool/version manifest: [`fixtures/tokenization-sbd/tool-versions.json`](../../fixtures/tokenization-sbd/tool-versions.json)
- expected-output schema: [`schemas/tokenization-sbd-expected-v1.schema.json`](../../schemas/tokenization-sbd-expected-v1.schema.json)
- slice schema: [`schemas/tokenization-sbd-slices-v1.schema.json`](../../schemas/tokenization-sbd-slices-v1.schema.json)
- tool/version schema: [`schemas/tokenization-sbd-tool-versions-v1.schema.json`](../../schemas/tokenization-sbd-tool-versions-v1.schema.json)
- output-difference policy: [`docs/decisions/tokenization-sbd-output-differences.md`](../decisions/tokenization-sbd-output-differences.md)

## Offset policy

- Spans use zero-based UTF-16 code unit offsets.
- Span `startCU` is inclusive and `endCU` is exclusive.
- A span is valid only when `0 <= startCU <= endCU <= text.length` after the fixture source is materialized.
- Spans sort deterministically by `startCU`, then `endCU`, then `kind`, then `id` when an output contains multiple annotations at the same position.
- UTF-8 byte offsets and Unicode code point offsets may be derived later, but they are not the primary offsets for issue #9 readiness.
- Malformed UTF-16 inputs are represented as explicit code-unit arrays, not as lossy replacement-character strings.

## Expected-output format

Expected outputs for this area SHALL be JSON objects conforming to [`schemas/tokenization-sbd-expected-v1.schema.json`](../../schemas/tokenization-sbd-expected-v1.schema.json).

Each expected-output document contains:

- `schemaVersion`: integer schema version;
- `sliceId`: fixture slice id from [`fixtures/tokenization-sbd/slices.json`](../../fixtures/tokenization-sbd/slices.json);
- `unicodeVersion`: Unicode data version used by the expected output;
- `source`: source reference and source hash fields;
- `units`: primary offset units, currently `utf16-code-unit`;
- `tokens`: ordered token or word-boundary-token spans;
- `sentences`: ordered sentence-boundary spans;
- `notes`: optional explanatory notes for ambiguity or documented output differences.

## Fixture slice policy

A slice definition names the input purpose before expected behavior is recorded. The initial slices cover empty input, repeated-run determinism, malformed UTF-16 representation, multilingual text, combining marks, emoji ZWJ sequences, newline handling, and sentence-boundary ambiguity.

A fixture slice does not imply that every future tokenization package must support every language-specific tokenizer in its first implementation. It records the input surface that must be considered before issue #9 behavior is accepted.

## Tool/version manifest policy

The tool/version manifest records normative references, package-under-test versions, and any diagnostic tools used to inspect outputs. Any future external diagnostic tool entry must include its name, version, command or API surface, license when known, and the artifact surface being inspected.
