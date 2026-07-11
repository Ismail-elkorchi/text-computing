# AGENTS Runbook

## Repository Inventory
- `.changeset/`: release change note configuration and entries.
- `docs/specs/`, `docs/rfcs/`, `docs/decisions/`: public specifications, proposals, and decision records.
- `fixtures/`: repository-level fixture material.
- `schemas/`: repository-level JSON Schemas.
- `tools/textpack-forge/`: source acquisition, audited transforms, generated textpack package output, and generated reports.
- `packages/text-computing/`: ordinary developer-facing SDK entrypoint.
- `packages/textpack/`: structural textpack manifest, composition, resource descriptor, and binding contracts.
- `packages/textfacts/`, `packages/textdoc/`, `packages/textlex/`, `packages/textdata/`, `packages/textcorpus/`, `packages/textnorm/`, `packages/textsearch/`, `packages/textkb/`, `packages/textquality/`, `packages/textparallel/`, `packages/textfst/`, `packages/textrules/`, `packages/textclassical/`, `packages/textpipeline/`: runtime and expert engine workspaces.
- `packages/textpacks/`: generated `textpack-*` data packages. These packages are data-only and are maintained by `tools/textpack-forge`, not by hand.

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

## Execution Rules
- Keep edits scoped to library behavior and verification.
- Avoid adding non-essential tooling.
- No background automation.
- Do not delete source files unless ownership and intent are explicit.
- Generated `textpack-*` packages must remain data-only: no loaders, task facades, runtime engines, processors, or SDK helpers.
- `@ismail-elkorchi/text-computing` is the ordinary developer-facing NLP entrypoint. Runtime packages remain expert APIs.
- Do not add backward compatibility layers or dead transitional code for removed alpha APIs.

## Documentation Rule
- Package `docs/` directories are practical documentation for usage and reference.

## Quick Checklist
- [ ] Read this file.
- [ ] Capture starting state.
- [ ] Apply minimal edits.
- [ ] Run required verification commands.
- [ ] Report changed files and command results.
