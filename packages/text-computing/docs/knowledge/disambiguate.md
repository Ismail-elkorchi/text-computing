# Disambiguation

Candidate scoring is finite and deterministic. `scoreDisambiguation` combines explicit feature weights for alias quality, prior, type/POS match, context overlap, corpus count, rule score, and source priority.

Ties are resolved by score, match kind, prior, and KB id order.
