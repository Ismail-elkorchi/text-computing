# Boundaries

`/pipeline` depends on:

- `@ismail-elkorchi/text-computing/unicode`
- `@ismail-elkorchi/text-computing/document`
- `@ismail-elkorchi/text-computing/packs`

It accepts any processor that satisfies the caller-facing `TextProcessor`
contract.

The root package does not import `/lexicon`, `/finite-state`, `/rules`, `/normalization`,
`/learning`, `/data`, `/corpus`, `/search`, `/knowledge`, `/quality`,
or `/parallel`. Engine modules may expose adapters from their own APIs.

Runtime code does not use file-system, child-process, or network APIs.
