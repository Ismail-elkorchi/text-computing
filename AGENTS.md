# AGENTS Runbook

## Product Architecture
- Text Computing: `packages/text-computing/` owns the modular public TypeScript library.
- Capability Packs: `packages/text-computing/src/packs/` defines the structural contract and
  `packages/textpacks/` contains generated data-only capability packages.
- Textpack Forge: `tools/textpack-forge/` owns acquisition, audited transforms,
  generated package output, and reports.

## Implementation Map
- `.changeset/`: release change note configuration and entries.
- `docs/specs/`, `docs/rfcs/`, `docs/decisions/`: public specifications, proposals, and decision records.
- `fixtures/`: repository-level fixture material.
- `schemas/`: repository-level JSON Schemas.
- Public modules live in `packages/text-computing/src/<domain>/`, with module tests and practical docs under the same library workspace.

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
- `@ismail-elkorchi/text-computing` and its public subpaths form one supported library. Keep cross-domain dependencies acyclic and environment-specific code behind explicit entrypoints.
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
