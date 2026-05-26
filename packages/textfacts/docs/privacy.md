# Privacy Note: Internal Fingerprints Are Not Anonymization

Repository documentation tooling may compute fingerprints and resemblance metrics to detect duplicate prose. Those internal artifacts can leak information:
- Fingerprint sets can reveal overlapping content.
- Small or unique phrases can be detectable through shingle hashes.

The public `textfacts` kernel does not provide a privacy-preserving similarity system and does not assert anonymity or privacy safety.

If you need privacy-preserving workflows, you must add your own policy layer and threat model.
