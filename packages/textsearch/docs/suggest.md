# Suggest

`suggest` creates spelling suggestions from indexed vocabulary and caller-provided lexicon keys.

Candidates are ranked by edit distance, prefix match, index frequency, and code-point tie-breaks. Suggestions never call a remote spell service.
