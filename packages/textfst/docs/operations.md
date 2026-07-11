# Operations

Root exports cover composition, union, concatenation, intersection, subtraction, determinization,
minimization, inversion, projection, epsilon removal, sorting, and shortest paths. Operations reject
incompatible semirings.

Composition, intersection, subtraction, epsilon removal, determinization, and minimization operate
on the state graph and preserve cyclic languages; they do not materialize a bounded list of accepted
strings. Multi-scalar arc labels are expanded internally before graph products. Transducer
determinization is over aligned input/output label pairs, so alternative outputs remain explicit.
