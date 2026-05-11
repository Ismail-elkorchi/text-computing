# `@ismail-elkorchi/textlab`

Text-computing inspection command package.

Current scope:

- summarize `docs/specs/support-status.v1.json` deterministically;
- expose the same support-status summary through the `textlab support-status` CLI;
- reject malformed support-status inputs before rendering.

This package does not yet render full conformance reports, replay comparator outputs, or inspect
annotation graphs.

## CLI

```sh
textlab support-status docs/specs/support-status.v1.json
```
