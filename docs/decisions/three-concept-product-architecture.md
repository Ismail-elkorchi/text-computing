# Three-concept product architecture

Date: 2026-09-01  
Status: accepted  
Affected area: repository product model, textpack manifests, and public documentation

## Context

The repository was presented as a large family of independently marketed NLP
packages. That framing exposed implementation topology as product design,
centered in-repository algorithm breadth, and tied capability bindings to npm
package names. It obscured the strongest direction for a TypeScript NLP project:
portable application integration, deployment, runtime inspection, and audited
artifact operations.

## Decision

The product has three concepts: Text Computing, Capability Packs, and Textpack
Forge. Expert engine workspaces remain implementation and extension modules.

Capability bindings are semantic. The manifest identifies a slot, role, schema,
resource, and whether that resource is required; it does not identify an
implementing workspace package. The redundant manifest package-engine map is
removed. Runtime and model compatibility is expressed through schemas,
capability tiers, artifacts, evaluation evidence, and the executor available in
the deployment environment.

Model production remains upstream of the runtime contract. TypeScript training
utilities may exist, but they neither constrain artifact origin nor define
product completeness.

## Consequences

- The ordinary product surface is easier to explain and integrate.
- Capability Packs can carry artifacts created by heterogeneous toolchains.
- Internal package reorganization no longer changes generated pack bindings.
- Removing `ownerPackage` and `engines` is an intentional alpha contract break;
  no aliases or transitional parsing paths are provided.
- Contextual and model-backed execution still requires concrete executors and
  task evidence before it can be advertised as available.

## Verification

- Root positioning checks require the three concepts and reject the old package
  catalog heading.
- Textpack schema and runtime tests reject removed package-coupled fields.
- Forge regeneration proves that language packs contain semantic bindings only.
- Repository lint, build, schema validation, forge tests, and NLP evaluation
  remain required gates.
