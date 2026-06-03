# Spelling

`buildEditDistanceTransducer` and `buildConfusionTransducer` create bounded, weighted spelling
resources. `spellingCandidates` applies those resources and returns deterministic candidates ranked
by weight and candidate string.
