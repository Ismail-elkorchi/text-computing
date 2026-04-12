# AGENTS Runbook

## Repository Inventory
- `packages/`: workspace packages.
- `packages/textfacts/`: current publishable `textfacts` implementation.
- `packages/textfacts/src/`: library implementation.
- `packages/textfacts/mod.ts`: primary package entrypoint.
- `packages/textfacts/schemas/`: JSON Schema registry.
- `packages/textfacts/interop/`: interop fixtures and manifest.
- `packages/textfacts/scripts/`: package utility scripts.
- `packages/textfacts/tools/`: verification and audit tools.
- `packages/textfacts/test/`, `packages/textfacts/testdata/`: automated tests and pinned vectors.
- `packages/textfacts/docs/`: usage and reference documentation.

## Pre-flight (MUST)
- Read this file.
- Capture starting context:
  - `git rev-parse HEAD`
  - `git status --porcelain`
- Read `README.md`, `CONTRIBUTING.md`, and relevant package docs for the task.

## Verification (MUST)
- Run all required checks from the workspace root:
  - `npm run -s lint`
  - `npm run -s build`
  - `npm run -s schema:validate`
  - `npm run -s test:all`
- Run repository coherence check:
  - `npm -w textfacts exec -- node tools/repo/audit.mjs --write`

## Execution Rules
- Keep edits scoped to library behavior and verification.
- Avoid adding non-essential tooling.
- No background automation.
- Do not delete source files unless ownership and intent are explicit.

## Documentation Rule
- Package `docs/` directories are practical documentation for usage and reference.

## Quick Checklist
- [ ] Read this file.
- [ ] Capture starting state.
- [ ] Apply minimal edits.
- [ ] Run required verification commands.
- [ ] Report changed files and command results.
