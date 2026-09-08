# Weights

The package exposes boolean, tropical, and log semiring helpers. Weighted paths are ranked by
semiring order and deterministic string tie-breaks. Boolean and tropical weights are finite and
non-negative; log weights are finite real values because log-sum can legitimately produce negative
weights. Epsilon removal sums alternative log-path mass and rejects zero/negative or otherwise
divergent epsilon cycles.
