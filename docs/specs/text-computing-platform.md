# Text Computing architecture

## Intent

Make TypeScript a first-class environment for processing, analyzing,
transforming, searching, and learning from text—with reliable composition,
reproducible resources, and measurable quality.

The product has three concepts: Text Computing, Capability Packs, and Textpack
Forge. These are complementary, not mandatory stages of every workflow.

## One modular library

`packages/text-computing` MUST own all shipped runtime implementations.
`@ismail-elkorchi/text-computing` and its explicit public subpaths form one
supported library, installation, version, and release. Public modules are
organized by what users do, not by an audience's presumed expertise.

Implementations MUST NOT be kept in separately released sibling engines and
re-exported through a permanent facade. Internal files remain private.
Cross-domain imports MUST form an acyclic graph. Node-specific I/O and optional
inference backends MUST remain behind explicit environment entrypoints.

The root supports convenient resource-backed document analysis. Direct
algorithms, corpus/index operations, data conversion, and local training MUST
also be usable independently. An operation MUST NOT require a pack, pipeline,
or document when its natural inputs are strings, examples, matrices, or records.

## Shared contracts

### Documents and coordinates

`TextDocument` is the canonical interchange and serialization representation:
sources, views, span maps, annotation layers, graphs, and metadata. Analysis
MUST return this representation directly. There is no conversion to another
document tier.

Analysis conveniences are non-enumerable typed projections. `analysisOf(doc)`
reads canonical layers, including after serialization or a downstream
transformation. They are not independently serialized state. General document
operations return canonical documents; callers can request a fresh projection.

Spans MUST identify their view and unit. End offsets are exclusive. JavaScript
text slicing MUST use UTF-16 code units, never silently interpret byte,
code-point, or token offsets as code units. Transformations MUST retain source
views and explicit span maps. Alternative lexical/morphological candidates
MUST NOT be represented as a disambiguated linguistic fact.

### Execution

`TextProcessor` in `/pipeline` is the document processor contract. Rules and
resource-backed analysis use it, with explicit requirements and outputs.
Direct and composed execution MUST invoke the same algorithm implementation.

Processor id/version identify implementation behavior. Configured processors
MUST additionally fingerprint executable content and options. Resource
identity MUST include the version and content checksum; caller-supplied cache
labels alone MUST NOT identify model sessions. Failed materializations MUST
remain retryable. Pipelines retain cancellation, diagnostics, traces, explicit
resource ownership, and deterministic dependency planning.

### Evidence and scores

Annotation evidence identifies the method, producer, implementation version,
input views, and contributing resources. Model execution evidence MUST retain
artifact content identity and executor identity. Capability availability,
method, quality, and supported language/domain are distinct claims.

Scores carry their meaning: probability, log probability, margin, rank,
weight, cost, or association. They MUST NOT be compared across methods without
a declared scale. Probabilities lie in [0, 1]. Mean token model confidence is
not a calibrated probability that an entire entity span is correct.

## Capability Packs

`packages/textpacks/*` contains independently versioned, generated data-only
packages. The structural contract, validation, resource I/O, and materialization
live in `text-computing/packs`. A generated pack MUST NOT import runtime code,
construct an execution engine, contain processors, or initiate network access.

Packs MAY contain or reference lexical data, rules, FSTs, statistical models,
tokenizers, indexes, and evaluation evidence. Bindings identify semantic slots,
roles, schemas, and resources; they MUST NOT name the npm implementation or
repository path that executes them.

The library validates pack input when loading it. Forge validates generated
output at build time. Importing a data package is not task execution.

## Textpack Forge

`tools/textpack-forge` owns explicit acquisition, pinned snapshots, audited
transforms, licensing policy, generated outputs, and measured capability
reports. Normal builds MUST NOT fetch mutable upstream resources.
Generated resources MUST be changed through their source definitions.

Forge is optional infrastructure for reproducible distribution. It MUST NOT
become a prerequisite for rules, local classical learning, dataset conversion,
or algorithms over caller-owned values.

## Quality and growth

Rules, finite-state methods, corpus statistics, classical learning, and neural
inference are first-class techniques. A task selects a method on measured
quality, resource cost, determinism, domain, and deployment constraints—not
on a requirement to use a particular model family.

New features need explicit semantics, representative real-text fixtures,
source-aligned outputs, evaluation appropriate to the claim, and import/runtime
cost checks. Algorithm construction primitives MUST be distinguished from
evaluated ready-to-use task solutions. The library MUST NOT claim task support
because a named wrapper exists.

See the [module inventory](../modules.md), [evaluation](../evaluation.md), and
[roadmap](../roadmap.md).
