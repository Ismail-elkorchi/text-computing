# `@ismail-elkorchi/textrules`

Deterministic text rules package.

Current public scope:

- canonical alpha rule declarations, bundle validation, deterministic compilation, and sealed compiled ids;
- general execution over existing `textdoc` token and annotation layers for span-pattern, annotation-pattern, lexicon, rewrite, validation, and unweighted transducer-style rules;
- explicit conflict policies: `emit-all`, `first-win`, `longest-win`, and `error`;
- rewrite outputs that create derived views and span maps rather than mutating existing views;
- E1 annotations with rule/resource provenance and ambiguity-preserving transducer analyses;
- pack-backed rule compilation from loaded `textpack` stopwords, lexicons, gazetteers, and rule lists with exact execution over existing `textdoc` token layers;
- a pack-backed rules processor factory compatible with `textpipeline` deterministic local execution;
- reusable deterministic lexical token spans, token-pattern matching, captures, and token-text rewrites;
- deterministic POS, lemma, and morphology output for the frozen issue `#10` slices;
- deterministic rule-backed `PER` / `ORG` / `LOC` output for the frozen issue `#13` slices;
- deterministic typed relation extraction for frozen repository-authored slices;
- deterministic coreference mention and chain output for frozen repository-authored slices;
- deterministic dependency arcs for the frozen dependency-parser slices;
- ambiguity-preserving alternatives in `textdoc`.

Current limitations:

- task-specific behavior remains frozen-slice only;
- raw-text tokenization helpers are fixture helpers, not the default rule-engine input contract.
