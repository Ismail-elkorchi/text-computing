# Imports And Footprint

This package exposes the deterministic Unicode/text-kernel surface through the root entrypoint and explicit kernel subpaths. Broad aggregate and repository-level helper subpaths are not part of the alpha surface.

## Canonical Import Patterns
- **Minimal core (root):**
  - `import { sliceBySpan, segmentWordsUAX29, normalize } from "@ismail-elkorchi/textfacts";`
  - Root exports the same kernel-owned modules as the explicit subpaths below.
- **Segmentation and normalization:**
  - `import { segmentWordsUAX29 } from "@ismail-elkorchi/textfacts/segment";`
  - `import { normalize } from "@ismail-elkorchi/textfacts/normalize";`
- **IDNA (UTS #46):**
  - `import { uts46ToAscii } from "@ismail-elkorchi/textfacts/idna";`
- **Security (confusables + scripts):**
  - `import { confusableSkeleton } from "@ismail-elkorchi/textfacts/security";`

## Kernel contract helpers

- `resolveTextfactsProfile()` exposes the pinned `unicode-17.0.0-default` profile. Alpha rejects undeclared tailoring instead of inferring locale behavior from the host runtime.
- `explainNormalization()` returns `transformMap` and `isReversible` diagnostics for normalization changes.
- `TextfactsError` exposes machine-readable `code` values for text-local validation failures.

## Removed broad subpaths

The `all`, `compare`, `pack`, `protocol`, `schema`, and `toolspec` subpaths are removed during alpha boundary cleanup. Use package-owned surfaces instead:

- result envelopes and payload compatibility: `@ismail-elkorchi/textprotocol`;
- conformance reports and claim checks: `@ismail-elkorchi/textconformance`;
- resource manifests and lookup: `@ismail-elkorchi/textpack`;
- inspection behavior: `@ismail-elkorchi/textlab`;
- corpus and retrieval behavior: `@ismail-elkorchi/textcorpus`.

## Footprint Policy
- Root and subpath exports must stay inside the textfacts kernel mission.
- Repository-level protocol, resource, schema registry, tool descriptor, and corpus-comparison behavior must not grow in textfacts.
- Size budget history is not retained in this repository.
