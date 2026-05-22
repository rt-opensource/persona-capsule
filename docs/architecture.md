# Architecture

[简体中文](architecture.zh-CN.md) | English

## Product Shape

Persona Capsule is a developer-facing open-source toolkit. The primary interface is a CLI. A web studio can be added later for inspection, editing, and review, but the core project must remain usable from a terminal and from other agent runtimes.

The project compiles source material into a portable capsule:

```text
sources
  -> source index
  -> evidence-backed claims
  -> distilled persona artifacts
  -> runtime exports
  -> feedback proposals
```

## Goals

- Create a portable persona artifact that can be used by multiple agent runtimes.
- Separate persona core from runtime memory implementation.
- Track evidence for important claims and stylistic conclusions.
- Make consent, boundaries, and uncertainty explicit.
- Support both memorial personas and self-authored continuity personas.
- Provide exports for Hermes, OpenClaw, OpenHands, Codex, and Claude Code.

## Non-Goals

- Proving consciousness continuity.
- Replacing runtime memory systems.
- Hosting a production chatbot service.
- Building a closed persona format that only one runtime can read.
- Simulating private memories without authorization or evidence.

## Domain Model

### Capsule

The root artifact that describes the persona, policy, evidence, evals, and adapter outputs.

Important fields:

- `id`: stable capsule identifier.
- `subject`: source person or persona subject.
- `mode`: `self-continuity`, `memorial`, `public-figure`, or `fictional`.
- `consent`: authorization state and limits.
- `source_policy`: allowed source classes.
- `export_targets`: supported runtimes.
- `version`: semantic capsule version.

### Source

A raw or normalized input artifact. Examples:

- chat logs
- emails
- diary entries
- essays
- audio transcripts
- video transcripts
- interviews
- third-party recollections

Each source should have an origin, timestamp if known, owner, sensitivity level, and processing status.

### Claim

An evidence-backed statement about the persona. Claims power the distilled documents.

Claim types:

- `fact`: factual memory or biographical fact.
- `preference`: likes, dislikes, habits.
- `value`: stable belief or priority.
- `style`: expression pattern.
- `relationship`: behavior toward a person or role.
- `boundary`: refusal, consent, or safety rule.
- `inference`: derived pattern that needs lower confidence.

Claim confidence:

- `verified`: directly supported by sources.
- `corroborated`: supported by multiple sources.
- `inferred`: derived from repeated patterns.
- `stylistic`: useful for voice, not a factual claim.
- `unknown`: must not be invented.

### Distilled Artifact

Human-readable files used by agent runtimes:

- `SOUL.md`: identity, tone, values, operating posture.
- `USER.md`: relationship to the current user or owner.
- `MEMORY_POLICY.md`: what to remember, forget, summarize, or never store.
- `BOUNDARIES.md`: consent, non-simulation zones, refusal rules.
- `voice/expression-dna.md`: sentence shape, humor, rhythm, vocabulary.
- `voice/anti-style.md`: what would feel fake or out of character.
- `mind/values.md`: stable priorities and beliefs.
- `mind/decision-heuristics.md`: how the persona resolves tradeoffs.
- `mind/relationship-modes.md`: behavior by relationship type.

### Adapter Export

A runtime-specific projection of the capsule. Adapters should transform, not reinterpret, the capsule.

Examples:

- Hermes profile files.
- OpenClaw workspace files.
- OpenHands microagent and AGENTS.md files.
- Codex AGENTS.md and skill files.
- Claude Code CLAUDE.md and rule files.

### Eval Case

A test prompt, expected constraints, and review rubric. Evals check whether a runtime export preserves the capsule.

Eval classes:

- known-answer tests
- voice consistency tests
- relationship-mode tests
- boundary tests
- uncertainty tests
- blind-review prompts

## Package Boundaries

### `packages/core`

Owns shared schema constants, capsule templates, and pure transformation helpers. It should not know about terminal UX, network APIs, or web UI.

### `packages/cli`

Owns the command-line interface:

- `init`
- `ingest`
- `distill`
- `eval`
- `export`
- `doctor`

The scaffold starts with `init`, `ingest`, and `doctor`; later milestones add the rest.

### Future `packages/adapters-*`

Each adapter maps the capsule to one runtime:

- `adapter-hermes`
- `adapter-openclaw`
- `adapter-openhands`
- `adapter-codex`
- `adapter-claude-code`

Adapters must be deterministic and testable with fixture capsules.

### Future `packages/eval`

Runs persona consistency tests across the canonical capsule and runtime exports. It should support both automated checks and human review forms.

### Future `apps/studio`

Optional web UI for non-terminal workflows:

- drag in sources
- inspect claims
- edit distilled files
- view evidence links
- run eval checklists
- export adapter bundles

The studio must call the same core packages used by the CLI.

## Runtime Adapter Strategy

### Hermes

Hermes is a natural home for profile-oriented personas. Export should produce a profile directory with:

```text
SOUL.md
MEMORY_POLICY.md
skills/
profile metadata
```

Hermes can own long-running profile memory. Persona Capsule owns the canonical policy and export.

### OpenClaw

OpenClaw is strong as a real-world chat gateway. Export should produce:

```text
AGENTS.md
SOUL.md
USER.md
MEMORY.md
memory/
```

Daily logs can flow back into capsule update proposals.

### OpenHands

OpenHands is best treated as an engineering runtime. Export should produce:

```text
AGENTS.md
.agents/skills/
eval prompts
```

The persona should guide engineering behavior without pretending OpenHands is the canonical life memory store.

### Codex

Codex export should produce:

```text
AGENTS.md
skills/persona-continuity/
memory guidance
```

Codex is a work execution surface. Persona Capsule should keep its personal continuity rules compact and task-safe.

### Claude Code

Claude Code export should produce:

```text
CLAUDE.md
.claude/rules/
memory guidance
```

The export should distinguish user preference memory from persona simulation rules.

## Memory Governance

Persona Capsule should not implement a full memory database in the first product line. Existing runtimes already have memory, session, or workspace layers.

The project should define:

- what may be remembered
- what must not be remembered
- what requires explicit review
- how daily memories become long-term memories
- how runtime memories are proposed back to the canonical capsule
- how to reject or revoke a memory

The recommended loop:

```text
runtime sessions
  -> daily logs
  -> proposed memory deltas
  -> human or policy review
  -> canonical capsule update
  -> re-export
```

## Security and Consent

Every capsule must state:

- who authorized it
- what sources were allowed
- whether the subject is living, deceased, public, fictional, or self-authored
- what content is excluded
- whether export or sharing is allowed
- how to revoke or archive the capsule

The system must prefer refusal over invented certainty when evidence is missing.

## Data Flow

```text
1. init
   Create capsule structure and policy placeholders.

2. ingest
   Normalize source metadata and build an evidence index.

3. extract
   Convert sources into claims with evidence pointers and confidence.

4. distill
   Generate SOUL, voice, mind, relationship, and boundary artifacts.

5. eval
   Test the capsule against known answers, boundaries, and voice samples.

6. export
   Project the canonical capsule into runtime-specific formats.

7. feedback
   Collect runtime memory deltas and eval failures as proposed capsule updates.
```

## Testing Strategy

- Unit tests for template generation and schema helpers.
- Fixture tests for each adapter export.
- Golden-file tests for generated runtime bundles.
- Eval fixture tests for boundary and uncertainty behavior.
- CLI smoke tests for `init`, `doctor`, and export commands.

## Release Shape

The first public release should ship:

- CLI init
- capsule schema
- editable templates
- Hermes and OpenClaw exporters
- Codex and Claude Code instruction exporters
- minimal eval runner
- example capsule with synthetic sources only
