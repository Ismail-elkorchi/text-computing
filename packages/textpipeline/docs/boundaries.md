# Boundaries

`textpipeline` depends on:

- `@ismail-elkorchi/textfacts`
- `@ismail-elkorchi/textdoc`
- `@ismail-elkorchi/textpack`

It accepts processors from every final section 14.5 processor family through caller-provided `TextProcessor` values.

The root package does not import `textlex`, `textfst`, `textrules`, `textnorm`, `textclassical`, `textdata`, `textcorpus`, `textsearch`, `textkb`, `textquality`, or `textparallel`. Lower packages may expose their own adapters. Later packages may do the same from their own package surfaces.

Runtime code does not use file-system, child-process, or network APIs.
