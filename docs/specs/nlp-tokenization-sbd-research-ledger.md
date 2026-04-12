# Tokenization and sentence boundary research ledger

- **Status:** Draft for issue #9
- **Scope:** Standards, peer-reviewed papers, comparator behavior, decisions, and known non-failure differences for tokenization/SBD readiness.
- **Primary issue:** [#9](https://github.com/Ismail-elkorchi/text-computing/issues/9)
- **Evidence date:** 2026-04-13

## Standards baseline

- [Unicode Standard Annex #29, Unicode Text Segmentation](https://www.unicode.org/reports/tr29/) is the default normative baseline for issue #9 word and sentence boundaries.
- The recorded fixture outputs use Unicode `17.0.0` and UTF-16 code unit spans.
- UAX #29 default boundaries are not a claim that every language-specific tokenization problem is solved by default boundary rules.
- UAX #29 explicitly permits tailoring and notes that reliable word-boundary detection for scripts such as Thai, Lao, Chinese, and Japanese requires dictionary lookup or other mechanisms.

## Peer-reviewed paper signals

- [Palmer and Hearst 1997](https://aclanthology.org/J97-2002/), “Adaptive Multilingual Sentence Boundary Disambiguation,” establishes that sentence-boundary punctuation is ambiguous and that robust SBD may require trainable or adaptive disambiguation beyond punctuation splitting.
- [Kiss and Strunk 2006](https://aclanthology.org/J06-4003/), “Unsupervised Multilingual Sentence Boundary Detection,” shows that abbreviation detection and sentence-boundary detection are coupled; this directly informs the `abbreviation-ambiguity` slice.
- [Sproat et al. 1996](https://aclanthology.org/J96-3004/), “A Stochastic Finite-State Word-Segmentation Algorithm for Chinese,” is evidence that no-space-script word segmentation can require language-specific evidence beyond generic boundary detection.

## Comparator behavior snapshot

The comparator files are diagnostic evidence, not normative expected outputs.

| Comparator | Version | Runtime | Captured slices | Relationship to recorded expected outputs |
| --- | --- | --- | --- | --- |
| spaCy | `3.8.14` | Python `3.13.7` | `10/11`; `unpaired-high-surrogate` is not run | Token spans match `1/10` captured slices; sentence spans match `3/10` captured slices. Differences mainly reflect lexical-token output, omitted whitespace spans, default sentencizer choices, and no malformed UTF-16 run. |
| wink-nlp + wink-eng-lite-web-model | `2.4.0` + `1.8.1` | Node.js `v24.14.0` | `11/11` | Token spans match `2/11` slices; sentence spans match `4/11` slices. Differences mainly reflect lexical-token output, omitted whitespace spans, English model behavior, and an empty-string sentence diagnostic not present in the recorded expected output. |

## Decisions for issue #9

- Record UAX #29 word-boundary spans as `uax29-word-boundary-token`, including punctuation and whitespace segments when UAX #29 boundaries produce them.
- Record UAX #29 sentence spans as `uax29-sentence`, including trailing space when the boundary algorithm places the sentence end after that space.
- Keep external comparator outputs diagnostic; they do not override recorded expected outputs.
- Use UTF-16 code unit offsets as the primary span unit because JavaScript strings expose that indexing model.
- Preserve malformed UTF-16 slices as explicit code-unit fixtures; tools that cannot losslessly run them are recorded as `not-run`, not as failures.
- Treat abbreviation-sensitive SBD and no-space-script word segmentation as documented future specialization surfaces unless a later public specification defines a stronger contract.

## Known non-failure differences

- Lexical-token comparators that omit whitespace do not fail UAX #29 word-boundary expected outputs.
- Comparator sentence spans that trim trailing whitespace do not fail UAX #29 sentence expected outputs.
- Comparator behavior for abbreviation examples does not fail the UAX #29 baseline unless a future expected-output file declares an abbreviation-sensitive algorithm.
- No-space-script outputs that rely on dictionary or language-specific resources do not fail the UAX #29 baseline.
- Comparator inability to process malformed UTF-16 does not fail the repository expected output if the skipped slice is explicitly recorded.
