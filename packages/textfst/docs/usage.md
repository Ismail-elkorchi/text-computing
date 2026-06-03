# textfst Usage

`textfst` compiles and applies finite-state automata and transducers. All public APIs are pure: input
FST values are normalized into immutable outputs and runtime helpers return new result arrays.

Use regex compilation for acceptors, rewrite compilation for string-to-string rules, lexc
compilation for morphology resources, and the spelling helpers for bounded edit-distance or
confusion-transducer candidates.

Pack-resource support accepts already loaded structural pack objects. The package does not discover,
fetch, or read packs on its own.
