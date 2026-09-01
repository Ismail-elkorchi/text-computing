# AGENTS Runbook

## Product Architecture
- Text Computing: `packages/text-computing/` is the application-facing runtime.
- Capability Packs: `packages/textpack/` defines the structural contract and
  `packages/textpacks/` contains generated data-only capability packages.
- Textpack Forge: `tools/textpack-forge/` owns acquisition, audited transforms,
  generated package output, and reports.

## Implementation Map
- `.changeset/`: release change note configuration and entries.
- `docs/specs/`, `docs/rfcs/`, `docs/decisions/`: public specifications, proposals, and decision records.
- `fixtures/`: repository-level fixture material.
- `schemas/`: repository-level JSON Schemas.
- Other `packages/*` workspaces are runtime implementation modules and expert
  extension APIs, not additional product concepts.

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
- Generated Capability Packs must remain data-only: no loaders, task facades,
  runtime engines, processors, SDK helpers, or hidden network access.
- `@ismail-elkorchi/text-computing` is the application-facing NLP entrypoint.
  Engine workspaces remain implementation modules and expert APIs.
- Pack bindings are semantic contracts. Do not couple them to repository paths
  or implementing npm package names.
- Do not add backward compatibility layers or dead transitional code for removed alpha APIs.

## Documentation Rule
- Package `docs/` directories are practical documentation for usage and reference.

## Quick Checklist
- [ ] Read this file.
- [ ] Capture starting state.
- [ ] Apply minimal edits.
- [ ] Run required verification commands.
- [ ] Report changed files and command results.
