# Split

`splitDataset` creates deterministic named splits from ratios or counts. Seeded assignment uses stable hashing, not runtime randomness. Grouping keeps related records in one split, and stratification assigns records inside stable strata.
