# Language Models

`trainNgramLanguageModel` supports `mle`, `laplace`, `lidstone`, `witten-bell`, `good-turing`,
`kneser-ney`, `absolute-discount`, and `stupid-backoff`.

`scoreSequence` returns a final `Score` with log-probability scale. `perplexity` is deterministic
for the same corpus and model options.
