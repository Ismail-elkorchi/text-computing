# `@ismail-elkorchi/textpack`

Text resource package.

## Manifest contract

The public contract for repository-level resource packs is
[`../../schemas/textpack-manifest-v1.schema.json`](../../schemas/textpack-manifest-v1.schema.json).
It defines:

- pack identity and npm package identity;
- resource identity, lookup keys, overlay precedence, and package-relative paths;
- provenance and license references for each resource entry; and
- manifest entrypoints and runnable test references.

`@ismail-elkorchi/textpack` does not execute rules or widen core task packages. It records
deterministic resource metadata, lookup ordering, and pure resource-content loaders so rule-backed
packages can consume packs without inventing their own manifest or file parsing shape.

## Resource loading

Resource loading is pure: callers provide resource content by manifest path. The package does not
read files, open network connections, or execute pack code.

The current loader surface covers committed fixture formats:

- line-delimited stopwords;
- line-delimited abbreviation lists;
- TSV lexicons with `key=value` attributes; and
- TSV gazetteers with labels.

Loaded entries preserve the resolved resource metadata, license reference, provenance reference,
line number, exact lookup token, and deterministic overlay order.

Resource lookup is exact by default. Case folding, trimming, or any other canonicalization must be
provided explicitly by the caller through a declared canonicalizer. The exported
`textPackDemoTrimLowercaseCanonicalizer` is fixture/demo behavior only; it is not a package-level
multilingual default.

## Resource registry

`createTextPackResourceRegistry` builds a deterministic in-memory catalog from one or more manifests.
The registry exposes exact language, profile, and resource-kind summaries, and
`queryTextPackResourceRegistry` selects resources by kind, language, profile, lookup key, pack id, or
resource id.

`loadTextPackRegistryResources` loads selected registry resources from caller-provided content while
preserving license, provenance, and overlay metadata.
