# `@ismail-elkorchi/textlab`

Text-computing inspection command package.

Current scope:

- summarize `docs/specs/support-status.v1.json` deterministically;
- summarize `fixtures/reports/task-evidence-manifest.v1.json` deterministically;
- summarize one `textconformance` report deterministically;
- expose the same summaries through the `textlab` CLI;
- reject malformed support-status, task-evidence, and conformance-report inputs before rendering.

This package does not yet replay comparator outputs, render rich diff views, or inspect annotation graphs.

## CLI

```sh
textlab support-status docs/specs/support-status.v1.json
textlab evidence fixtures/reports/task-evidence-manifest.v1.json
textlab conformance-report fixtures/reports/nlp-tokenization-sbd/conformance-report.json
```
