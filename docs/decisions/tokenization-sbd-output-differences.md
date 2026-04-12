# Tokenization and sentence boundary output differences

- **Status:** Accepted readiness policy for issue #9
- **Scope:** Difference classification before feature behavior is added.

## Differences not classified as failures by default

The following differences are not classified as failures unless a fixture expected-output file explicitly makes them part of the contract:

- UAX #29 word-boundary tokens versus lexical or morphology-aware tokens.
- Sentence-boundary differences caused by abbreviation handling that is outside the declared algorithm for the slice.
- Whitespace and punctuation inclusion differences when the slice contract does not require a specific inclusion rule.
- Language-specific segmentation that requires dictionary, morphology, or statistical resources beyond the declared algorithm for the slice.
- Offset-unit differences from external diagnostic tools after lossless projection to the repository UTF-16 code unit policy.
- Malformed UTF-16 display differences when the fixture is represented by explicit code units.

## Failure classification requirements

A difference is a failure only when all of the following are true:

- the fixture expected-output file declares the relevant algorithm and units;
- both outputs are projected to UTF-16 code unit spans without loss;
- the compared span kind is the same;
- the observed span order, span bounds, or annotation kind differs from the declared expected output.
