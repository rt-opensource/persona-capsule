# Technical Roadmap

[简体中文](technical-roadmap.zh-CN.md) | English

## Track A: CLI-First Toolkit

This is the primary route. It keeps the project useful as an open-source developer tool before any web product exists.

### Phase 0: Repository Scaffold

Deliverables:

- workspace package structure
- minimal CLI
- capsule templates
- architecture documentation
- smoke tests

Acceptance:

- `npm run persona -- init ./example` creates a capsule
- `npm run doctor` verifies the local runtime
- `npm test` passes

### Phase 1: Capsule Schema and Source Index

Deliverables:

- stable `capsule.yaml` fields
- JSON Schema for machine validation
- `source-index.json` format
- `persona ingest <capsule> <sources...>` command
- source metadata normalization

Acceptance:

- sources can be indexed without sending content to a model
- every indexed source has id, path, type, sensitivity, owner, and timestamps
- schema errors are actionable

### Phase 2: Evidence and Claim Extraction

Deliverables:

- `claims.jsonl` schema
- claim confidence model
- extraction prompts and deterministic review rules
- optional provider integration for OpenAI-compatible models

Acceptance:

- generated claims always point to sources
- unsupported claims are marked as inferred or unknown
- sensitive sources are not exported by default

### Phase 3: Distillation

Deliverables:

- `persona distill`
- generators for `SOUL.md`, `USER.md`, `MEMORY_POLICY.md`, `BOUNDARIES.md`
- voice and mind artifact generation
- edit-preserving regeneration strategy

Acceptance:

- distillation output separates fact, inference, and style
- regenerated files preserve user edits or produce conflict proposals
- missing evidence produces uncertainty language instead of invention

### Phase 4: Runtime Adapters

Deliverables:

- `persona export hermes`
- `persona export openclaw`
- `persona export codex`
- `persona export claude-code`
- `persona export openhands`
- golden-file adapter tests

Acceptance:

- each export is deterministic
- exports do not leak excluded source content
- adapters include runtime-specific memory guidance

### Phase 5: Eval Runner

Deliverables:

- `persona eval`
- known-answer test runner
- boundary test runner
- blind-review templates
- persona drift checklist

Acceptance:

- eval failures produce concrete files and lines to inspect
- boundary failures block release exports by default
- human review can be recorded without overwriting machine results

### Phase 6: Runtime Feedback Loop

Deliverables:

- memory delta format
- import of runtime daily logs
- review workflow for proposed memory changes
- capsule version bump rules

Acceptance:

- runtime memories are never merged silently
- rejected memories remain auditable
- re-export produces updated runtime bundles

## Track B: Optional Web Studio

This route should start after the CLI has stable schemas and adapters.

### Studio MVP

Capabilities:

- create or open a capsule
- upload or point to local sources
- inspect source index
- edit distilled artifacts
- view claim evidence
- run eval checklists
- export runtime bundles

Suggested stack:

- Vite or Next.js for the app shell
- the same `packages/core` and adapter packages as the CLI
- local-first file access during development
- no hosted service requirement for the first version

The studio must not become the canonical implementation. It is a visual surface over the CLI and core packages.

## Technology Direction

### Current Scaffold

The initial scaffold uses Node.js ESM and built-in modules only. This keeps the repository immediately runnable after clone.

### Near-Term Additions

Add dependencies only when the shape is proven:

- TypeScript for package APIs.
- A schema validator for capsule and claim files.
- A YAML parser for `capsule.yaml`.
- A test framework only if Node's built-in test runner becomes limiting.
- Model provider adapters after offline ingestion and export formats are stable.

### Long-Term Shape

The likely stable workspace:

```text
packages/
  core/
  schema/
  cli/
  eval/
  adapter-hermes/
  adapter-openclaw/
  adapter-openhands/
  adapter-codex/
  adapter-claude-code/
apps/
  studio/
examples/
  synthetic-self-continuity/
  synthetic-memorial/
```

## Open-Source Milestones

### v0.1

- init
- schema
- docs
- templates
- smoke tests

### v0.2

- source index
- claims format
- offline fixture pipeline

Current repository status: source indexing, source-index and claim schemas, `persona validate`, annotation-driven offline `persona extract`, and the synthetic self-continuity fixture are implemented. Model-assisted claim extraction is still planned.

### v0.3

- Hermes and OpenClaw exporters
- synthetic example capsule

Current repository status: Hermes and OpenClaw exports are implemented with deterministic fixture coverage.

### v0.4

- Codex, Claude Code, and OpenHands exporters
- adapter golden tests

Current repository status: Codex, Claude Code, and OpenHands exports are implemented with deterministic fixture coverage. Golden-file adapter tests are implemented through a checked-in adapter export manifest.

### v0.5

- eval runner
- boundary tests
- blind-review forms

Current repository status: offline known-answer and boundary evals are implemented. Machine results are written to `eval/machine-results.json`, blind review notes remain separate, and boundary eval failures block exports by default.

### v1.0

- stable capsule format
- stable adapter contracts
- feedback proposal workflow
- documented consent and governance model
