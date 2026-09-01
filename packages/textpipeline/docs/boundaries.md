# Boundaries

`textpipeline` depends on:

- `@ismail-elkorchi/textfacts`
- `@ismail-elkorchi/textdoc`
- `@ismail-elkorchi/textpack`

It accepts any processor that satisfies the caller-facing `TextProcessor`
contract.

The root package does not import `textlex`, `textfst`, `textrules`, `textnorm`,
`textclassical`, `textdata`, `textcorpus`, `textsearch`, `textkb`, `textquality`,
or `textparallel`. Engine modules may expose adapters from their own expert APIs.

Runtime code does not use file-system, child-process, or network APIs.
