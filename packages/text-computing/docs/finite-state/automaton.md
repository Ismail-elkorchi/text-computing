# Automata

`buildFst` validates immutable final FST objects. Empty string labels are epsilon. `buildAcceptor`
builds deterministic trie acceptors from caller-provided strings, and `validateFst` reports invalid
state, arc, and weight references.
