# Text Computing platform architecture

Status: accepted architecture  
Version: 1  
Scope: product boundaries, runtime integration, Capability Packs, and pack supply chain  
Normative terms: MUST, MUST NOT, SHOULD, and MAY are used as requirement keywords.

## Mission

Text Computing makes TypeScript the operational layer for NLP: applications
deploy, integrate, inspect, and run text capabilities through portable runtime
contracts. The platform optimizes for reproducible behavior, explicit I/O,
auditable evidence, predictable deployment, and honest capability claims.

Training is not a required TypeScript workflow. A model or tokenizer MAY be
produced by any upstream toolchain. Before it becomes a runnable capability, its
deployable artifact and execution contract MUST be versioned, attributable,
licensed, integrity-checked, and evaluated for the task it claims.

## Product model

The product has exactly three concepts.

### Text Computing

Text Computing is the application-facing TypeScript runtime. It MUST own:

- pack loading and explicit resource readers;
- task and preset selection;
- document, span, annotation, and evidence outputs;
- runtime capability inspection and unsupported-task errors;
- portable behavior across Node.js, Bun, Deno, browsers, and Workers;
- integration points for built-in and future model-backed executors.

Ordinary applications SHOULD import `@ismail-elkorchi/text-computing`. Engine
workspaces under `packages/*` are implementation modules and expert extension
APIs. They are not additional product concepts and MUST NOT force applications
to reconstruct the ordinary runtime by hand.

### Capability Packs

Capability Packs are immutable, data-only inputs. The current pack contract and
npm naming convention use `textpack`, but the product concept includes all
deployable capability material: profiles, lexicons, rules, finite-state data,
indexes, tokenizers, model artifacts, and evaluation records.

A Capability Pack:

- MUST NOT contain loaders, processors, task facades, runtime engines, or
  post-install downloads;
- MUST declare target languages, scripts, domains, modalities, resources,
  artifacts, and capability slots explicitly;
- MUST bind resources semantically through slot, role, schema, and resource id;
- MUST NOT bind resources to the npm package that happens to implement an
  executor;
- MUST separate availability status from inference tier;
- MUST keep `artifact-backed` distinct from executable `task-supported`
  behavior;
- MUST require an executing adapter and held-out task evidence before claiming
  `model-backed` behavior.

The manifest describes runtime compatibility through versioned schemas and
capability contracts. Package dependency maps do not belong in the manifest;
npm already owns package installation metadata.

### Textpack Forge

Textpack Forge is the build-time supply chain for Capability Packs. It MUST own:

- explicit source acquisition and immutable snapshot locks;
- checksum, provenance, citation, redistribution, and license policy;
- deterministic transforms into runtime-oriented resources;
- storage layout and indexes for bounded deployment-time access;
- schema, integrity, capability, and evaluation gates;
- generated package payloads and audit reports;
- byte-for-byte drift detection.

Forge MUST accept deployable artifacts without prescribing how their upstream
training or compilation was performed. It MUST record enough identity and
evidence to reproduce the packaged result and audit its use. Normal build and
verification commands MUST NOT perform implicit network access.

## Runtime contract

The deployment path is:

```text
application input
  -> Text Computing
  -> declared Capability Pack slot
  -> schema-compatible executor
  -> text-aligned result + capability/resource evidence
```

Capability selection MUST use semantic declarations. Repository folder names,
internal package names, guessed resource ids, source format accidents, and
ambient host behavior MUST NOT decide which implementation runs.

Resource materialization MUST be explicit and lazy. File-backed resources MAY
use direct file ranges or HTTP byte ranges. Loading a pack MUST NOT eagerly read
all payloads. Unsupported, sampled, profiled, and descriptor-only slots MUST
fail before task execution instead of silently falling back to weaker behavior.

## Model interoperability

The runtime architecture is model-format neutral. Supporting a model-backed
task requires all of the following:

1. a pack resource or locked artifact with stable identity and integrity data;
2. a versioned input/output schema that preserves text coordinates;
3. an executor available in the target TypeScript environment;
4. declared preprocessing and postprocessing resources;
5. held-out task metrics tied to the exact artifact;
6. runtime evidence that identifies the pack, slot, tier, and resources used.

Merely listing a remote model, shipping metadata, or passing an integrity smoke
test does not satisfy this contract. Remote services MAY be integrated only
through explicit application-supplied executors; packs and ordinary runtime
loading MUST NOT hide network calls.

## Operating principles

- Source text and coordinate systems remain explicit.
- Outputs and evidence remain serializable and deterministic where the selected
  executor promises determinism.
- Capability claims are bounded by measured behavior, not resource volume.
- Cold-start time, peak memory, and real-text robustness are release gates for
  shipped runtime paths.
- Licenses and provenance travel with deployment artifacts.
- Training utilities in expert modules MAY remain useful, but they do not define
  the platform boundary or constrain artifact origin.

## Verification

The architecture is enforced by manifest validation, repository boundary
checks, forge drift verification, generated audit reports, cross-runtime smoke
tests, held-out task tests, external real-text tests, and isolated cold-start
budgets. The root project description MUST present the three concepts and MUST
NOT regress to a catalog of implementation packages.
