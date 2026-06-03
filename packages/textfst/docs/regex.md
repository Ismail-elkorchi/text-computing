# Regex Compilation

`compileRegex` parses finite-state regex syntax and compiles acceptor automata. It supports literals,
escaping, grouping, alternation, optional/repetition operators, and simple character classes without
using JavaScript `RegExp` as the matching engine.
